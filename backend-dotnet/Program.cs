using AspNetCoreRateLimit;
using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using backend_dotnet.Services;
using Fido2NetLib;
using Fido2NetLib.Objects;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Serilog;
using Serilog.Events;
using System.Security.Claims;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Antiforgery;
using OtpNet;
using Npgsql;
using System.Collections.Concurrent;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.DataProtection;
using System.IO;

// Render/container environments can hit inotify watcher limits. Disable config file watchers.
Environment.SetEnvironmentVariable("DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE", "false");

var builder = WebApplication.CreateBuilder(args);

// Serilog for structured logging
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

// Configuration
string? ResolvePostgresConnectionString(IConfiguration config)
{
    var raw =
        config["POSTGRES_CONNECTION_STRING"] ??
        config.GetConnectionString("Postgres") ??
        config["ConnectionStrings:Postgres"] ??
        config["DATABASE_URL"] ??
        config["RENDER_EXTERNAL_DATABASE_URL"] ??
        config["RENDER_INTERNAL_DATABASE_URL"];

    if (string.IsNullOrWhiteSpace(raw)) return null;
    if (raw.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
        raw.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        var uri = new Uri(raw);
        var userInfo = uri.UserInfo.Split(':', 2);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort ? 5432 : uri.Port,
            Username = Uri.UnescapeDataString(userInfo[0]),
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "",
            Database = uri.AbsolutePath.Trim('/'),
            SslMode = SslMode.Require
        };
        return builder.ConnectionString;
    }
    return raw;
}

var connectionString = ResolvePostgresConnectionString(builder.Configuration)
    ?? throw new InvalidOperationException("PostgreSQL connection string not configured. Set POSTGRES_CONNECTION_STRING / ConnectionStrings__Postgres / DATABASE_URL.");

if (builder.Environment.IsProduction() && connectionString.Contains("Host=localhost", StringComparison.OrdinalIgnoreCase))
{
    throw new InvalidOperationException("Invalid PostgreSQL host 'localhost' in production. Set POSTGRES_CONNECTION_STRING to managed database host.");
}

var corsOrigins = (builder.Configuration["CORS_ORIGINS"] ?? "*")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

bool IsAllowedOrigin(string origin)
{
    if (corsOrigins.Length == 0 || corsOrigins.Contains("*")) return true;
    if (!Uri.TryCreate(origin, UriKind.Absolute, out var originUri)) return false;

    foreach (var configured in corsOrigins)
    {
        if (!Uri.TryCreate(configured, UriKind.Absolute, out var configuredUri)) continue;
        if (string.Equals(configuredUri.Scheme, originUri.Scheme, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(configuredUri.Host, originUri.Host, StringComparison.OrdinalIgnoreCase) &&
            configuredUri.Port == originUri.Port)
        {
            return true;
        }

        var wildcardHost = configuredUri.Host;
        if (!wildcardHost.StartsWith("*.", StringComparison.Ordinal)) continue;
        var suffix = wildcardHost[1..]; // ".example.com"
        if (originUri.Host.EndsWith(suffix, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(configuredUri.Scheme, originUri.Scheme, StringComparison.OrdinalIgnoreCase) &&
            configuredUri.Port == originUri.Port)
        {
            return true;
        }
    }
    return false;
}

// Services
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.Configure<IpRateLimitPolicies>(builder.Configuration.GetSection("IpRateLimitPolicies"));
builder.Services.AddInMemoryRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IThemeContractService, ThemeContractService>();
builder.Services.AddScoped<ISubscriptionCapabilityService, SubscriptionCapabilityService>();
builder.Services.AddHttpClient<ITurnstileService, TurnstileService>();
builder.Services.AddScoped<IWebAuthnService, WebAuthnService>();
builder.Services.AddScoped<ITenancyResolver, TenancyResolver>();
builder.Services.AddHttpClient<ICloudflareDnsService, CloudflareDnsService>();
builder.Services.AddSingleton<StorefrontRealtimeService>();
builder.Services.AddScoped<ISslProvider, LetsEncryptShellProvider>();
builder.Services.AddScoped<ISslProviderFactory, SslProviderFactory>();
builder.Services.AddScoped<IOriginTlsService, OriginTlsService>();
builder.Services.AddSingleton<IPaymentPlugin, DummyPaymentPlugin>();
builder.Services.AddSingleton<IPaymentPluginFactory, PaymentPluginFactory>();
builder.Services.AddSingleton<IFido2>(sp =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    var rpId = cfg["WebAuthn:RpId"] ?? "localhost";
    var origin = cfg["WebAuthn:Origin"] ?? "https://localhost:3000";
    var rpName = cfg["WebAuthn:RpName"] ?? "Sitesellr Dev";
    return new Fido2(new Fido2Configuration
    {
        ServerName = rpName,
        ServerDomain = rpId,
        Origins = new HashSet<string> { origin }
    });
});
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-Token";
    options.Cookie.Name = "XSRF-TOKEN";
    options.Cookie.HttpOnly = false;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Lax;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers();
builder.Services.AddMemoryCache();
var dataProtection = builder.Services.AddDataProtection().SetApplicationName("Sitesellr");
var dataProtectionKeysPath = builder.Configuration["DATA_PROTECTION_KEYS_PATH"];
if (!string.IsNullOrWhiteSpace(dataProtectionKeysPath))
{
    Directory.CreateDirectory(dataProtectionKeysPath);
    dataProtection.PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysPath));
}

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(Policies.PlatformOwner, policy =>
        policy.Requirements.Add(new AccessRequirement(platformRole: PlatformRole.Owner)));
    options.AddPolicy(Policies.PlatformStaffRead, policy =>
        policy.Requirements.Add(new AccessRequirement(platformRole: PlatformRole.Staff)));
    options.AddPolicy(Policies.OrdersRead, policy =>
        policy.Requirements.Add(new AccessRequirement(Permissions.OrdersRead)));
    options.AddPolicy(Policies.OrdersWrite, policy =>
        policy.Requirements.Add(new AccessRequirement(Permissions.OrdersWrite)));
    options.AddPolicy(Policies.CustomersRead, policy =>
        policy.Requirements.Add(new AccessRequirement(Permissions.CustomersRead)));
    options.AddPolicy(Policies.CustomersWrite, policy =>
        policy.Requirements.Add(new AccessRequirement(Permissions.CustomersWrite)));
    options.AddPolicy(Policies.ProductsRead, policy =>
        policy.Requirements.Add(new AccessRequirement(Permissions.ProductsRead)));
    options.AddPolicy(Policies.ProductsWrite, policy =>
        policy.Requirements.Add(new AccessRequirement(Permissions.ProductsWrite)));
    options.AddPolicy(Policies.StoreSettingsRead, policy =>
        policy.Requirements.Add(new AccessRequirement(Permissions.StoreSettingsRead)));
    options.AddPolicy(Policies.StoreSettingsWrite, policy =>
        policy.Requirements.Add(new AccessRequirement(Permissions.StoreSettingsWrite)));
    options.AddPolicy(Policies.MerchantsSuspend, policy =>
        policy.Requirements.Add(new AccessRequirement(Permissions.MerchantsSuspend)));
    options.AddPolicy(Policies.MerchantsDelete, policy =>
        policy.Requirements.Add(new AccessRequirement(Permissions.MerchantsDelete)));
    options.AddPolicy(Policies.RefundsOverride, policy =>
        policy.Requirements.Add(new AccessRequirement(Permissions.RefundsOverride)));
    options.AddPolicy(Policies.PayoutsFreeze, policy =>
        policy.Requirements.Add(new AccessRequirement(Permissions.PayoutsFreeze)));
    options.AddPolicy(Policies.PayoutsRelease, policy =>
        policy.Requirements.Add(new AccessRequirement(Permissions.PayoutsRelease)));
    options.AddPolicy(Policies.PlansManage, policy =>
        policy.Requirements.Add(new AccessRequirement(Permissions.PlansManage)));
    options.AddPolicy(Policies.SecurityPoliciesManage, policy =>
        policy.Requirements.Add(new AccessRequirement(Permissions.SecurityPoliciesManage)));
    options.AddPolicy(Policies.PluginsApprove, policy =>
        policy.Requirements.Add(new AccessRequirement(Permissions.PluginsApprove)));
    options.AddPolicy(Policies.ApiKeysRevoke, policy =>
        policy.Requirements.Add(new AccessRequirement(Permissions.ApiKeysRevoke)));
});
builder.Services.AddSingleton<IAuthorizationHandler, AccessRequirementHandler>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("ApiCorsPolicy", policy =>
    {
        var allowAnyOrigin = corsOrigins.Length == 0 || corsOrigins.Contains("*");
        if (allowAnyOrigin)
        {
            policy.AllowAnyOrigin();
        }
        else
        {
            policy.SetIsOriginAllowed(IsAllowedOrigin)
                  .AllowCredentials();
        }

        policy.AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Optionally apply migrations on startup when configured (off by default to avoid blocking design-time tools)
if (builder.Configuration.GetValue("APPLY_MIGRATIONS_ON_STARTUP", false))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS team_invite_tokens (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""Email"" character varying(320) NOT NULL,
  ""TokenHash"" character varying(128) NOT NULL,
  ""Role"" integer NOT NULL,
  ""CustomRoleName"" character varying(120),
  ""ExpiresAt"" timestamp with time zone NOT NULL,
  ""AcceptedAt"" timestamp with time zone NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL,
  ""CreatedByUserId"" uuid NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_team_invite_tokens_TokenHash ON team_invite_tokens (""TokenHash"");");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS ""ReservedQuantity"" integer NOT NULL DEFAULT 0;");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS platform_branding_settings (
  ""Id"" uuid PRIMARY KEY,
  ""Key"" character varying(120) NOT NULL,
  ""Value"" character varying(4000) NOT NULL,
  ""UpdatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_platform_branding_settings_Key ON platform_branding_settings (""Key"");");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""MaxVariantsPerProduct"" integer NOT NULL DEFAULT 100;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""MaxCategories"" integer NOT NULL DEFAULT 100;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""MaxPaymentGateways"" integer NOT NULL DEFAULT 1;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""AllowedGatewayTypesJson"" character varying(500) NOT NULL DEFAULT '[]';");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""CodEnabled"" boolean NOT NULL DEFAULT true;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""SmsEnabled"" boolean NOT NULL DEFAULT false;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""SmsQuotaMonthly"" integer NOT NULL DEFAULT 0;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""EmailEnabled"" boolean NOT NULL DEFAULT true;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""EmailQuotaMonthly"" integer NOT NULL DEFAULT 5000;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""WhatsappEnabled"" boolean NOT NULL DEFAULT false;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""WhatsappFeaturesTier"" character varying(40) NOT NULL DEFAULT 'none';");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""MaxPluginsInstalled"" integer NOT NULL DEFAULT 2;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""AllowedPluginTiersJson"" character varying(500) NOT NULL DEFAULT '[]';");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""PaidPluginsAllowed"" boolean NOT NULL DEFAULT false;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""AllowedThemeTier"" character varying(40) NOT NULL DEFAULT 'free';");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""MaxThemeInstalls"" integer NOT NULL DEFAULT 1;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""PremiumThemeAccess"" boolean NOT NULL DEFAULT false;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS ""CapabilitiesJson"" character varying(4000) NOT NULL DEFAULT '{{}}';");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS store_usage_counters (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""PeriodKey"" character varying(20) NOT NULL,
  ""SmsSent"" integer NOT NULL DEFAULT 0,
  ""EmailSent"" integer NOT NULL DEFAULT 0,
  ""WhatsappMessagesSent"" integer NOT NULL DEFAULT 0,
  ""PluginsInstalled"" integer NOT NULL DEFAULT 0,
  ""ThemeInstalls"" integer NOT NULL DEFAULT 0,
  ""UpdatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_store_usage_counters_StoreId_PeriodKey ON store_usage_counters (""StoreId"", ""PeriodKey"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS audit_logs (
  ""Id"" uuid PRIMARY KEY,
  ""MerchantId"" uuid NULL,
  ""StoreId"" uuid NULL,
  ""ActorUserId"" uuid NULL,
  ""Action"" character varying(80) NOT NULL,
  ""EntityType"" character varying(80) NULL,
  ""EntityId"" character varying(80) NULL,
  ""Details"" character varying(2000) NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE INDEX IF NOT EXISTS IX_audit_logs_CreatedAt ON audit_logs (""CreatedAt"");");
    await db.Database.ExecuteSqlRawAsync(@"CREATE INDEX IF NOT EXISTS IX_audit_logs_StoreId ON audit_logs (""StoreId"");");
    await db.Database.ExecuteSqlRawAsync(@"CREATE INDEX IF NOT EXISTS IX_audit_logs_MerchantId ON audit_logs (""MerchantId"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS merchant_onboarding_profiles (
  ""Id"" uuid PRIMARY KEY,
  ""MerchantId"" uuid NOT NULL,
  ""EmailVerified"" boolean NOT NULL,
  ""MobileVerified"" boolean NOT NULL,
  ""KycVerified"" boolean NOT NULL,
  ""OpsApproved"" boolean NOT NULL,
  ""RiskApproved"" boolean NOT NULL,
  ""PipelineStatus"" character varying(80) NOT NULL,
  ""UpdatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_merchant_onboarding_profiles_MerchantId ON merchant_onboarding_profiles (""MerchantId"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS store_role_templates (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""Name"" character varying(80) NOT NULL,
  ""PermissionsCsv"" character varying(2000) NOT NULL,
  ""IsSensitive"" boolean NOT NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_store_role_templates_StoreId_Name ON store_role_templates (""StoreId"", ""Name"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS sensitive_action_approvals (
  ""Id"" uuid PRIMARY KEY,
  ""ActionType"" character varying(120) NOT NULL,
  ""EntityType"" character varying(80),
  ""EntityId"" character varying(80),
  ""PayloadJson"" character varying(4000),
  ""RequestedByUserId"" uuid NOT NULL,
  ""ApprovedByUserId"" uuid NULL,
  ""Status"" character varying(30) NOT NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL,
  ""ApprovedAt"" timestamp with time zone NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE INDEX IF NOT EXISTS IX_sensitive_action_approvals_Status ON sensitive_action_approvals (""Status"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS franchise_units (
  ""Id"" uuid PRIMARY KEY,
  ""MerchantId"" uuid NOT NULL,
  ""Name"" character varying(120) NOT NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_franchise_units_MerchantId_Name ON franchise_units (""MerchantId"", ""Name"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS franchise_stores (
  ""Id"" uuid PRIMARY KEY,
  ""FranchiseUnitId"" uuid NOT NULL,
  ""StoreId"" uuid NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_franchise_stores_Unit_Store ON franchise_stores (""FranchiseUnitId"", ""StoreId"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS backoffice_assignments (
  ""Id"" uuid PRIMARY KEY,
  ""MerchantId"" uuid NOT NULL,
  ""UserId"" uuid NOT NULL,
  ""StoreScopeId"" uuid NULL,
  ""Scope"" character varying(80) NOT NULL,
  ""Department"" character varying(80) NOT NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS theme_catalog_items (
  ""Id"" uuid PRIMARY KEY,
  ""Name"" character varying(120) NOT NULL,
  ""Slug"" character varying(120) NOT NULL,
  ""Category"" character varying(80),
  ""Description"" character varying(800),
  ""PreviewUrl"" character varying(1000),
  ""IsPaid"" boolean NOT NULL,
  ""Price"" numeric(18,2) NOT NULL,
  ""AllowedPlanCodesCsv"" character varying(500),
  ""IsActive"" boolean NOT NULL,
  ""IsFeatured"" boolean NOT NULL DEFAULT false,
  ""FeaturedRank"" integer NOT NULL DEFAULT 0,
  ""TypographyPack"" character varying(60) NOT NULL DEFAULT 'modern-sans',
  ""LayoutVariant"" character varying(60) NOT NULL DEFAULT 'default',
  ""RuntimePackageJson"" character varying(4000) NOT NULL DEFAULT '{{}}',
  ""CreatedAt"" timestamp with time zone NOT NULL,
  ""UpdatedAt"" timestamp with time zone NOT NULL DEFAULT now()
);");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE theme_catalog_items ADD COLUMN IF NOT EXISTS ""IsFeatured"" boolean NOT NULL DEFAULT false;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE theme_catalog_items ADD COLUMN IF NOT EXISTS ""FeaturedRank"" integer NOT NULL DEFAULT 0;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE theme_catalog_items ADD COLUMN IF NOT EXISTS ""TypographyPack"" character varying(60) NOT NULL DEFAULT 'modern-sans';");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE theme_catalog_items ADD COLUMN IF NOT EXISTS ""LayoutVariant"" character varying(60) NOT NULL DEFAULT 'default';");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE theme_catalog_items ADD COLUMN IF NOT EXISTS ""RuntimePackageJson"" character varying(4000) NOT NULL DEFAULT '{{}}';");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE theme_catalog_items ADD COLUMN IF NOT EXISTS ""TemplatesJson"" character varying(2000) NOT NULL DEFAULT '[""homepage"",""product_listing"",""product_detail"",""cart"",""static_page"",""checkout""]';");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE theme_catalog_items ADD COLUMN IF NOT EXISTS ""SectionSchemasJson"" character varying(4000) NOT NULL DEFAULT '[]';");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE theme_catalog_items ADD COLUMN IF NOT EXISTS ""HookPointsJson"" character varying(2000) NOT NULL DEFAULT '[""BeforePrice"",""AfterPrice"",""BeforeAddToCart"",""AfterDescription""]';");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE theme_catalog_items ADD COLUMN IF NOT EXISTS ""ThemeVersion"" character varying(40) NOT NULL DEFAULT '1.0.0';");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE theme_catalog_items ADD COLUMN IF NOT EXISTS ""PlpVariantsJson"" character varying(4000) NOT NULL DEFAULT '[]';");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE theme_catalog_items ADD COLUMN IF NOT EXISTS ""PdpVariantsJson"" character varying(4000) NOT NULL DEFAULT '[]';");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE theme_catalog_items ADD COLUMN IF NOT EXISTS ""UpdatedAt"" timestamp with time zone NOT NULL DEFAULT now();");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_theme_catalog_items_Slug ON theme_catalog_items (""Slug"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS campaign_template_catalog_items (
  ""Id"" uuid PRIMARY KEY,
  ""Name"" character varying(140) NOT NULL,
  ""Slug"" character varying(140) NOT NULL,
  ""Category"" character varying(80) NULL,
  ""Description"" character varying(1200) NULL,
  ""SectionsJson"" character varying(4000) NOT NULL DEFAULT '[]',
  ""IsPaid"" boolean NOT NULL,
  ""Price"" numeric(18,2) NOT NULL,
  ""AllowedPlanCodesCsv"" character varying(500) NULL,
  ""IsActive"" boolean NOT NULL,
  ""IsFeatured"" boolean NOT NULL DEFAULT false,
  ""FeaturedRank"" integer NOT NULL DEFAULT 0,
  ""CreatedAt"" timestamp with time zone NOT NULL,
  ""UpdatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_campaign_template_catalog_items_Slug ON campaign_template_catalog_items (""Slug"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS store_campaign_template_subscriptions (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""TemplateId"" uuid NOT NULL,
  ""Status"" character varying(30) NOT NULL,
  ""BillingMode"" character varying(40) NOT NULL,
  ""BillingStatus"" character varying(40) NOT NULL,
  ""ChargedAmount"" numeric(18,2) NOT NULL,
  ""Currency"" character varying(8) NOT NULL,
  ""PlanCodeAtPurchase"" character varying(80) NOT NULL,
  ""PaymentReference"" character varying(80) NOT NULL,
  ""PurchasedAt"" timestamp with time zone NOT NULL,
  ""UpdatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_store_campaign_template_subscriptions_Store_Template ON store_campaign_template_subscriptions (""StoreId"", ""TemplateId"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS campaign_payment_events (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""SubscriptionId"" uuid NULL,
  ""EventType"" character varying(40) NOT NULL,
  ""Reference"" character varying(80) NOT NULL,
  ""Gateway"" character varying(40) NOT NULL,
  ""Status"" character varying(40) NOT NULL,
  ""Amount"" numeric(18,2) NOT NULL,
  ""Currency"" character varying(8) NOT NULL,
  ""PayloadJson"" character varying(4000) NOT NULL DEFAULT '{{}}',
  ""CreatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_campaign_payment_events_Store_Reference ON campaign_payment_events (""StoreId"", ""Reference"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS store_theme_configs (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""ActiveThemeId"" uuid NULL,
  ""LogoUrl"" character varying(1000),
  ""FaviconUrl"" character varying(1000),
  ""HeaderJson"" character varying(4000),
  ""FooterJson"" character varying(4000),
  ""BannerJson"" character varying(4000),
  ""DesignTokensJson"" character varying(4000),
  ""QuoteAlertEmail"" character varying(320) NULL,
  ""UpdatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_theme_configs ADD COLUMN IF NOT EXISTS ""ShowPricing"" boolean NOT NULL DEFAULT true;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_theme_configs ADD COLUMN IF NOT EXISTS ""LoginToViewPrice"" boolean NOT NULL DEFAULT false;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_theme_configs ADD COLUMN IF NOT EXISTS ""CatalogMode"" character varying(20) NOT NULL DEFAULT 'retail';");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_theme_configs ADD COLUMN IF NOT EXISTS ""CatalogVisibilityJson"" character varying(4000) NULL;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_theme_configs ADD COLUMN IF NOT EXISTS ""QuoteAlertEmail"" character varying(320) NULL;");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_store_theme_configs_StoreId ON store_theme_configs (""StoreId"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS store_homepage_layouts (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""SectionsJson"" character varying(4000),
  ""UpdatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_store_homepage_layouts_StoreId ON store_homepage_layouts (""StoreId"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS store_navigation_menus (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""Name"" character varying(120),
  ""ItemsJson"" character varying(4000),
  ""IsPrimary"" boolean NOT NULL,
  ""UpdatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_store_navigation_menus_StoreId_Name ON store_navigation_menus (""StoreId"", ""Name"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS store_static_pages (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""Title"" character varying(160) NOT NULL,
  ""Slug"" character varying(200) NOT NULL,
  ""Content"" character varying(10000),
  ""SeoTitle"" character varying(160),
  ""SeoDescription"" character varying(400),
  ""IsPublished"" boolean NOT NULL,
  ""UpdatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_store_static_pages_StoreId_Slug ON store_static_pages (""StoreId"", ""Slug"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS storefront_layout_versions (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""SectionsJson"" character varying(4000),
  ""VersionType"" character varying(20) NOT NULL,
  ""VersionNumber"" integer NOT NULL,
  ""CreatedByUserId"" uuid NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_storefront_layout_versions_StoreId_VersionNumber ON storefront_layout_versions (""StoreId"", ""VersionNumber"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS storefront_edit_sessions (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""UserId"" uuid NOT NULL,
  ""EditorName"" character varying(120),
  ""Status"" character varying(40) NOT NULL,
  ""LastSeenAt"" timestamp with time zone NOT NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE INDEX IF NOT EXISTS IX_storefront_edit_sessions_StoreId_Status ON storefront_edit_sessions (""StoreId"", ""Status"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS store_media_assets (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""FileName"" character varying(260) NOT NULL,
  ""ContentType"" character varying(120) NOT NULL,
  ""SizeBytes"" bigint NOT NULL,
  ""Url"" character varying(1000) NOT NULL,
  ""Kind"" character varying(80) NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE INDEX IF NOT EXISTS IX_store_media_assets_StoreId_Kind ON store_media_assets (""StoreId"", ""Kind"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS store_domains (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""Hostname"" character varying(255) NOT NULL,
  ""VerificationToken"" character varying(120) NOT NULL,
  ""IsVerified"" boolean NOT NULL,
  ""DnsManagedByCloudflare"" boolean NOT NULL DEFAULT false,
  ""DnsStatus"" character varying(40) NOT NULL DEFAULT 'pending',
  ""SslProvider"" character varying(40) NOT NULL,
  ""SslStatus"" character varying(30) NOT NULL,
  ""SslPurchased"" boolean NOT NULL DEFAULT false,
  ""SslPurchaseReference"" character varying(120) NULL,
  ""SslPurchasedAt"" timestamp with time zone NULL,
  ""LastError"" character varying(500) NULL,
  ""SslExpiresAt"" timestamp with time zone NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL,
  ""UpdatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_store_domains_Hostname ON store_domains (""Hostname"");");
    await db.Database.ExecuteSqlRawAsync(@"CREATE INDEX IF NOT EXISTS IX_store_domains_StoreId_IsVerified ON store_domains (""StoreId"", ""IsVerified"");");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_domains ADD COLUMN IF NOT EXISTS ""DnsManagedByCloudflare"" boolean NOT NULL DEFAULT false;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_domains ADD COLUMN IF NOT EXISTS ""DnsStatus"" character varying(40) NOT NULL DEFAULT 'pending';");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_domains ADD COLUMN IF NOT EXISTS ""SslPurchased"" boolean NOT NULL DEFAULT false;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_domains ADD COLUMN IF NOT EXISTS ""SslPurchaseReference"" character varying(120) NULL;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_domains ADD COLUMN IF NOT EXISTS ""SslPurchasedAt"" timestamp with time zone NULL;");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS store_quote_inquiries (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""ProductId"" uuid NULL,
  ""Name"" character varying(200) NOT NULL,
  ""Email"" character varying(320) NOT NULL,
  ""Phone"" character varying(20) NOT NULL,
  ""Message"" character varying(1200) NULL,
  ""Status"" character varying(40) NOT NULL,
  ""AssignedToUserId"" uuid NULL,
  ""Priority"" character varying(20) NOT NULL DEFAULT 'normal',
  ""SlaDueAt"" timestamp with time zone NULL,
  ""LastNotifiedAt"" timestamp with time zone NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL,
  ""UpdatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_quote_inquiries ADD COLUMN IF NOT EXISTS ""AssignedToUserId"" uuid NULL;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_quote_inquiries ADD COLUMN IF NOT EXISTS ""Priority"" character varying(20) NOT NULL DEFAULT 'normal';");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_quote_inquiries ADD COLUMN IF NOT EXISTS ""SlaDueAt"" timestamp with time zone NULL;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_quote_inquiries ADD COLUMN IF NOT EXISTS ""LastNotifiedAt"" timestamp with time zone NULL;");
    await db.Database.ExecuteSqlRawAsync(@"CREATE INDEX IF NOT EXISTS IX_store_quote_inquiries_StoreId_CreatedAt ON store_quote_inquiries (""StoreId"", ""CreatedAt"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS store_customer_credentials (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""CustomerId"" uuid NOT NULL,
  ""Email"" character varying(320) NOT NULL,
  ""PasswordHash"" character varying(400) NOT NULL,
  ""IsActive"" boolean NOT NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL,
  ""UpdatedAt"" timestamp with time zone NOT NULL,
  ""LastLoginAt"" timestamp with time zone NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_customer_credentials ADD COLUMN IF NOT EXISTS ""EmailVerified"" boolean NOT NULL DEFAULT false;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_customer_credentials ADD COLUMN IF NOT EXISTS ""EmailVerificationCodeHash"" character varying(128) NOT NULL DEFAULT '';");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_customer_credentials ADD COLUMN IF NOT EXISTS ""EmailVerificationExpiresAt"" timestamp with time zone NULL;");
    await db.Database.ExecuteSqlRawAsync(@"ALTER TABLE store_customer_credentials ADD COLUMN IF NOT EXISTS ""MfaEnabled"" boolean NOT NULL DEFAULT false;");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_store_customer_credentials_Store_Email ON store_customer_credentials (""StoreId"", ""Email"");");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_store_customer_credentials_Store_Customer ON store_customer_credentials (""StoreId"", ""CustomerId"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS store_customer_sessions (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""CustomerId"" uuid NOT NULL,
  ""TokenHash"" character varying(128) NOT NULL,
  ""UserAgent"" character varying(60) NULL,
  ""ClientIp"" character varying(64) NULL,
  ""ExpiresAt"" timestamp with time zone NOT NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_store_customer_sessions_TokenHash ON store_customer_sessions (""TokenHash"");");
    await db.Database.ExecuteSqlRawAsync(@"CREATE INDEX IF NOT EXISTS IX_store_customer_sessions_Store_Customer_ExpiresAt ON store_customer_sessions (""StoreId"", ""CustomerId"", ""ExpiresAt"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS store_customer_password_resets (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""CustomerId"" uuid NOT NULL,
  ""TokenHash"" character varying(128) NOT NULL,
  ""ExpiresAt"" timestamp with time zone NOT NULL,
  ""UsedAt"" timestamp with time zone NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_store_customer_password_resets_TokenHash ON store_customer_password_resets (""TokenHash"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS store_customer_mfa_challenges (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""CustomerId"" uuid NOT NULL,
  ""CodeHash"" character varying(128) NOT NULL,
  ""ExpiresAt"" timestamp with time zone NOT NULL,
  ""VerifiedAt"" timestamp with time zone NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS customer_groups (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""Name"" character varying(120) NOT NULL,
  ""Description"" character varying(400),
  ""CreatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_customer_groups_StoreId_Name ON customer_groups (""StoreId"", ""Name"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS customer_group_members (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""CustomerGroupId"" uuid NOT NULL,
  ""CustomerId"" uuid NOT NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE UNIQUE INDEX IF NOT EXISTS IX_customer_group_members_StoreId_Group_Customer ON customer_group_members (""StoreId"", ""CustomerGroupId"", ""CustomerId"");");
    await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS visibility_rules (
  ""Id"" uuid PRIMARY KEY,
  ""StoreId"" uuid NOT NULL,
  ""CustomerGroupId"" uuid NULL,
  ""TargetType"" character varying(30) NOT NULL,
  ""TargetKey"" character varying(120) NOT NULL,
  ""Effect"" character varying(10) NOT NULL,
  ""IsActive"" boolean NOT NULL,
  ""CreatedAt"" timestamp with time zone NOT NULL
);");
    await db.Database.ExecuteSqlRawAsync(@"CREATE INDEX IF NOT EXISTS IX_visibility_rules_lookup ON visibility_rules (""StoreId"", ""TargetType"", ""TargetKey"", ""CustomerGroupId"", ""Effect"");");
}

var platformOwnerEmail = builder.Configuration["PLATFORM_OWNER_EMAIL"];
if (!string.IsNullOrWhiteSpace(platformOwnerEmail))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var normalizedOwnerEmail = platformOwnerEmail.Trim().ToLowerInvariant();
    var ownerUser = await db.Users.FirstOrDefaultAsync(u => u.Email == normalizedOwnerEmail);
    if (ownerUser == null)
    {
        ownerUser = new User
        {
            Email = normalizedOwnerEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"), workFactor: 12),
            IsLocked = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.Users.Add(ownerUser);
        await db.SaveChangesAsync();
    }

    var bootstrapPassword = builder.Configuration["PLATFORM_OWNER_BOOTSTRAP_PASSWORD"];
    if (!string.IsNullOrWhiteSpace(bootstrapPassword))
    {
        ownerUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(bootstrapPassword, workFactor: 12);
        ownerUser.IsLocked = false;
        ownerUser.LockoutEnd = null;
        ownerUser.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
    }

    var hasOwnerRole = await db.PlatformUserRoles.AnyAsync(r => r.UserId == ownerUser.Id && r.Role == PlatformRole.Owner);
    if (!hasOwnerRole)
    {
        db.PlatformUserRoles.Add(new PlatformUserRole
        {
            UserId = ownerUser.Id,
            Role = PlatformRole.Owner,
            CreatedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync();
    }
}

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    async Task EnsurePlanAsync(string code, string name, decimal price, int trialDays, int maxProducts, int maxVariantsPerProduct, int maxPaymentGateways, bool premiumThemeAccess, string allowedThemeTier, int maxPluginsInstalled, bool whatsappEnabled, string whatsappTier, bool smsEnabled, int smsQuota)
    {
        var row = await db.BillingPlans.FirstOrDefaultAsync(x => x.Code == code);
        if (row == null)
        {
            row = new BillingPlan { Code = code, Name = name, CreatedAt = DateTimeOffset.UtcNow };
            db.BillingPlans.Add(row);
        }
        row.PricePerMonth = price;
        row.TrialDays = trialDays;
        row.MaxProducts = maxProducts;
        row.MaxVariantsPerProduct = maxVariantsPerProduct;
        row.MaxPaymentGateways = maxPaymentGateways;
        row.CodEnabled = true;
        row.MaxCategories = Math.Max(20, maxProducts / 5);
        row.PremiumThemeAccess = premiumThemeAccess;
        row.AllowedThemeTier = allowedThemeTier;
        row.MaxThemeInstalls = code == "free" ? 1 : code == "growth" ? 5 : 20;
        row.MaxPluginsInstalled = maxPluginsInstalled;
        row.PaidPluginsAllowed = code != "free";
        row.AllowedPluginTiersJson = code == "free" ? "[\"free\"]" : code == "growth" ? "[\"free\",\"standard\"]" : "[\"free\",\"standard\",\"premium\"]";
        row.AllowedGatewayTypesJson = code == "free" ? "[\"upi\"]" : "[\"upi\",\"card\",\"cod\"]";
        row.WhatsappEnabled = whatsappEnabled;
        row.WhatsappFeaturesTier = whatsappTier;
        row.SmsEnabled = smsEnabled;
        row.SmsQuotaMonthly = smsQuota;
        row.EmailEnabled = true;
        row.EmailQuotaMonthly = code == "free" ? 1000 : code == "growth" ? 10000 : 100000;
        row.CapabilitiesJson = "{}";
        row.IsActive = true;
    }

    await EnsurePlanAsync("free", "Free", 0, 14, 50, 20, 1, false, "free", 2, false, "none", false, 0);
    await EnsurePlanAsync("growth", "Growth", 1499, 14, 500, 100, 3, true, "standard", 10, true, "basic", true, 2000);
    await EnsurePlanAsync("pro", "Pro", 2999, 14, 5000, 250, 10, true, "premium", 50, true, "full", true, 10000);
    await EnsurePlanAsync("enterprise", "Enterprise", 7999, 14, 100000, 1000, 50, true, "enterprise", 500, true, "full", true, 50000);
    await db.SaveChangesAsync();

    async Task EnsureThemeAsync(
        string name,
        string slug,
        string category,
        string description,
        string previewUrl,
        bool isPaid,
        decimal price,
        string allowedPlanCodesCsv,
        bool isFeatured,
        int featuredRank,
        string? runtimePackageJson = null,
        string? plpVariantsJson = null,
        string? pdpVariantsJson = null)
    {
        if (await db.ThemeCatalogItems.AnyAsync(x => x.Slug == slug)) return;
        db.ThemeCatalogItems.Add(new ThemeCatalogItem
        {
            Name = name,
            Slug = slug,
            Category = category,
            Description = description,
            PreviewUrl = previewUrl,
            IsPaid = isPaid,
            Price = price,
            AllowedPlanCodesCsv = allowedPlanCodesCsv,
            IsActive = true,
            IsFeatured = isFeatured,
            FeaturedRank = featuredRank,
            RuntimePackageJson = string.IsNullOrWhiteSpace(runtimePackageJson) ? "{}" : runtimePackageJson,
            PlpVariantsJson = string.IsNullOrWhiteSpace(plpVariantsJson) ? "[\"default\",\"cards\"]" : plpVariantsJson,
            PdpVariantsJson = string.IsNullOrWhiteSpace(pdpVariantsJson) ? "[\"default\",\"split\"]" : pdpVariantsJson,
            UpdatedAt = DateTimeOffset.UtcNow
        });
    }

    await EnsureThemeAsync(
        "Starter Minimal",
        "starter-minimal",
        "General",
        "Simple conversion-focused starter storefront.",
        "https://placehold.co/800x500/2563EB/FFFFFF?text=Starter+Minimal",
        false,
        0,
        "",
        true,
        10);
    await EnsureThemeAsync(
        "Fashion Pro",
        "fashion-pro",
        "Fashion / Apparel",
        "Editorial-first catalog with rich hero and lookbook sections.",
        "https://placehold.co/800x500/1D4ED8/FFFFFF?text=Fashion+Pro",
        false,
        0,
        "",
        true,
        9);
    await EnsureThemeAsync(
        "Electronics Mega Store",
        "electronics-mega-store",
        "Electronics",
        "Spec-forward grid, comparison cards, and promo shelves.",
        "https://placehold.co/800x500/0EA5E9/FFFFFF?text=Electronics+Mega+Store",
        true,
        2999,
        "pro,enterprise",
        true,
        8);
    await EnsureThemeAsync(
        "Grocery FastCart",
        "grocery-fastcart",
        "Grocery / FMCG",
        "Fast browse layout tuned for repeat basket orders.",
        "https://placehold.co/800x500/16A34A/FFFFFF?text=Grocery+FastCart",
        false,
        0,
        "",
        false,
        0);
    await EnsureThemeAsync(
        "Pharmacy Care",
        "pharmacy-care",
        "Pharmacy",
        "Trust-first pharmacy storefront with compliance-focused blocks.",
        "https://placehold.co/800x500/0F766E/FFFFFF?text=Pharmacy+Care",
        true,
        1499,
        "growth,pro,enterprise",
        false,
        0);
    await EnsureThemeAsync(
        "Wholesale Distributor",
        "wholesale-distributor",
        "B2B Wholesale",
        "Bulk catalog experience with MOQ and pack-size messaging.",
        "https://placehold.co/800x500/334155/FFFFFF?text=Wholesale+Distributor",
        true,
        3999,
        "pro,enterprise",
        true,
        7);
    await EnsureThemeAsync(
        "Restaurant Ordering",
        "restaurant-ordering",
        "Restaurant / Food",
        "Menu-first ordering theme optimized for quick checkout.",
        "https://placehold.co/800x500/B45309/FFFFFF?text=Restaurant+Ordering",
        false,
        0,
        "",
        false,
        0);
    await EnsureThemeAsync(
        "Single Product Launch",
        "single-product-launch",
        "Single Product",
        "Long-form launch page for one flagship product.",
        "https://placehold.co/800x500/7C3AED/FFFFFF?text=Single+Product+Launch",
        true,
        1299,
        "growth,pro,enterprise",
        false,
        0);
    await EnsureThemeAsync(
        "Minimal Catalog Lite",
        "minimal-catalog-lite",
        "Minimal Catalog",
        "Clean and light storefront for compact catalogs.",
        "https://placehold.co/800x500/475569/FFFFFF?text=Minimal+Catalog+Lite",
        false,
        0,
        "",
        false,
        0);
    await EnsureThemeAsync(
        "Luxury Signature",
        "luxury-signature",
        "Premium Luxury",
        "Premium high-contrast visual system for luxury brands.",
        "https://placehold.co/800x500/111827/FFFFFF?text=Luxury+Signature",
        true,
        4999,
        "enterprise",
        true,
        6);

    await db.SaveChangesAsync();

    async Task EnsureCampaignTemplateAsync(string name, string slug, string category, string description, string sectionsJson, bool isPaid, decimal price, string allowedPlanCodesCsv, bool isFeatured, int featuredRank)
    {
        if (await db.CampaignTemplateCatalogItems.AnyAsync(x => x.Slug == slug)) return;
        db.CampaignTemplateCatalogItems.Add(new CampaignTemplateCatalogItem
        {
            Name = name,
            Slug = slug,
            Category = category,
            Description = description,
            SectionsJson = sectionsJson,
            IsPaid = isPaid,
            Price = price,
            AllowedPlanCodesCsv = allowedPlanCodesCsv,
            IsActive = true,
            IsFeatured = isFeatured,
            FeaturedRank = featuredRank,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
    }

    await EnsureCampaignTemplateAsync("Flash Sale Campaign", "flash-sale-campaign", "Seasonal", "Urgency-led campaign blocks for sales windows.", "[\"announcement-bar-pro\",\"hero-banner-basic\",\"featured-products\"]", true, 599, "growth,pro,enterprise", true, 10);
    await EnsureCampaignTemplateAsync("Festival Launch Campaign", "festival-launch-campaign", "Seasonal", "Festival storefront launch template with premium storytelling sections.", "[\"hero-banner-basic\",\"video-story-pro\",\"featured-products\",\"testimonial-carousel-pro\"]", true, 899, "pro,enterprise", true, 9);
    await EnsureCampaignTemplateAsync("New Arrivals Campaign", "new-arrivals-campaign", "Catalog", "Fast campaign for new arrivals with hero + product shelves.", "[\"hero-banner-basic\",\"featured-products\",\"category-grid\"]", false, 0, "", false, 0);
    await db.SaveChangesAsync();
}

if (builder.Configuration.GetValue("SEED_TEST_USERS", false))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    var merchant = await db.Merchants.FirstOrDefaultAsync(m => m.Name == "Demo Merchant");
    if (merchant == null)
    {
        merchant = new Merchant
        {
            Name = "Demo Merchant",
            Status = MerchantStatus.Active,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.Merchants.Add(merchant);
        await db.SaveChangesAsync();
    }

    var store = await db.Stores.FirstOrDefaultAsync(s => s.MerchantId == merchant.Id && s.Subdomain == "demo");
    if (store == null)
    {
        store = new Store
        {
            MerchantId = merchant.Id,
            Name = "Demo Store",
            Subdomain = "demo",
            Currency = "INR",
            Timezone = "Asia/Kolkata",
            Status = StoreStatus.Active,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.Stores.Add(store);
        await db.SaveChangesAsync();
    }

    async Task<User> EnsureUserAsync(string email, string password)
    {
        var normalized = email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == normalized);
        var hash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
        if (user == null)
        {
            user = new User
            {
                Email = normalized,
                PasswordHash = hash,
                IsLocked = false,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }
        else
        {
            // In seeded test mode we force a known, unlocked login state.
            user.PasswordHash = hash;
            user.IsLocked = false;
            user.LockoutEnd = null;
            user.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
        }
        return user;
    }

    var pwd = builder.Configuration["TEST_USER_PASSWORD"] ?? "9414064554";
    var platformOwner = await EnsureUserAsync("platform.owner@sitesellr.local", pwd);
    var platformStaff = await EnsureUserAsync("platform.staff@sitesellr.local", pwd);
    var storeOwner = await EnsureUserAsync("store.owner@sitesellr.local", pwd);
    var storeAdmin = await EnsureUserAsync("store.admin@sitesellr.local", pwd);
    var storeStaff = await EnsureUserAsync("store.staff@sitesellr.local", pwd);
    _ = await EnsureUserAsync("customer.retail@sitesellr.local", pwd);

    if (!await db.PlatformUserRoles.AnyAsync(x => x.UserId == platformOwner.Id && x.Role == PlatformRole.Owner))
        db.PlatformUserRoles.Add(new PlatformUserRole { UserId = platformOwner.Id, Role = PlatformRole.Owner, CreatedAt = DateTimeOffset.UtcNow });
    if (!await db.PlatformUserRoles.AnyAsync(x => x.UserId == platformStaff.Id && x.Role == PlatformRole.Staff))
        db.PlatformUserRoles.Add(new PlatformUserRole { UserId = platformStaff.Id, Role = PlatformRole.Staff, CreatedAt = DateTimeOffset.UtcNow });

    async Task EnsureStoreRoleAsync(Guid userId, StoreRole role)
    {
        if (await db.StoreUserRoles.AnyAsync(x => x.StoreId == store.Id && x.UserId == userId)) return;
        db.StoreUserRoles.Add(new StoreUserRole
        {
            StoreId = store.Id,
            UserId = userId,
            Role = role,
            CreatedAt = DateTimeOffset.UtcNow
        });
    }

    await EnsureStoreRoleAsync(storeOwner.Id, StoreRole.Owner);
    await EnsureStoreRoleAsync(storeAdmin.Id, StoreRole.Admin);
    await EnsureStoreRoleAsync(storeStaff.Id, StoreRole.Staff);

    async Task SyncStorePermissionsAsync(Guid userId, IReadOnlyCollection<string> desired)
    {
        var existing = await db.StoreUserPermissions.Where(x => x.StoreId == store.Id && x.UserId == userId).ToListAsync();
        db.StoreUserPermissions.RemoveRange(existing);
        foreach (var permission in desired.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            db.StoreUserPermissions.Add(new StoreUserPermission
            {
                StoreId = store.Id,
                UserId = userId,
                Permission = permission,
                CreatedAt = DateTimeOffset.UtcNow
            });
        }
    }

    await SyncStorePermissionsAsync(storeOwner.Id, PermissionCatalog.GetTemplatePermissions(StoreRole.Owner));
    await SyncStorePermissionsAsync(storeAdmin.Id, PermissionCatalog.GetTemplatePermissions(StoreRole.Admin));
    await SyncStorePermissionsAsync(storeStaff.Id, PermissionCatalog.GetTemplatePermissions(StoreRole.Staff));

    await db.SaveChangesAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseForwardedHeaders();
app.UseStaticFiles();
app.UseWebSockets();
if (app.Environment.IsDevelopment() || builder.Configuration.GetValue("FORCE_HTTPS_REDIRECT", false))
{
    app.UseHttpsRedirection();
}
app.UseCors("ApiCorsPolicy");
app.UseIpRateLimiting();
app.UseTightSecurityHeaders();
app.UseCsrfProtection();
app.UseTenancy();
app.UseAuthorization();

var api = app.MapGroup("/api");
app.MapControllers();
app.Map("/ws/storefront/{storeId:guid}", async (HttpContext context, Guid storeId, StorefrontRealtimeService realtime, CancellationToken ct) =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = 400;
        await context.Response.WriteAsync("WebSocket required", ct);
        return;
    }

    using var socket = await context.WebSockets.AcceptWebSocketAsync();
    var clientId = context.Request.Query["clientId"].ToString();
    if (string.IsNullOrWhiteSpace(clientId))
    {
        clientId = Guid.NewGuid().ToString("N");
    }
    await realtime.HandleClientAsync(storeId, clientId, socket, ct);
});

api.MapGet("/", () => Results.Ok(new { message = "Hello World" }))
   .WithName("Root");

api.MapGet("/webauthn/rp", (IConfiguration cfg) =>
{
    var rpId = cfg["WebAuthn:RpId"] ?? "localhost";
    var origin = cfg["WebAuthn:Origin"] ?? "https://localhost:3000";
    return Results.Ok(new { rpId, origin });
});

api.MapPost("/status", async (StatusCheckCreate input, AppDbContext db) =>
{
    var status = new StatusCheck
    {
        ClientName = input.ClientName,
        Timestamp = DateTime.UtcNow
    };

    db.StatusChecks.Add(status);
    await db.SaveChangesAsync();

    return Results.Created($"/api/status/{status.Id}", status);
}).WithName("CreateStatus");

api.MapGet("/status", async (AppDbContext db) =>
{
    var items = await db.StatusChecks
        .AsNoTracking()
        .OrderByDescending(x => x.Timestamp)
        .ToListAsync();

    return Results.Ok(items);
}).WithName("GetStatuses");

api.MapPost("/auth/register", async (RegisterRequest req, AppDbContext db, ITokenService tokenService, ITurnstileService turnstile, HttpContext httpContext, IAntiforgery antiforgery, CancellationToken ct) =>
{
    var normalizedEmail = req.Email.Trim().ToLowerInvariant();
    var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, ct);
    if (existing != null)
    {
        return Results.Conflict(new { error = "email_exists" });
    }

    if (string.IsNullOrWhiteSpace(req.TurnstileToken) || !await turnstile.VerifyAsync(req.TurnstileToken, httpContext.Connection.RemoteIpAddress?.ToString(), ct))
    {
        return Results.BadRequest(new { error = "captcha_failed" });
    }

    var hash = BCrypt.Net.BCrypt.HashPassword(req.Password, workFactor: 12);
    var user = new User
    {
        Email = normalizedEmail,
        PasswordHash = hash,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    db.Users.Add(user);
    await db.SaveChangesAsync(ct);

    var (access, refresh, _, _) = await tokenService.IssueAsync(user, scope: null, clientIp: httpContext.Connection.RemoteIpAddress?.ToString(), userAgent: httpContext.Request.Headers.UserAgent.ToString(), ct);

    var tokens = antiforgery.GetAndStoreTokens(httpContext);
    httpContext.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, new CookieOptions
    {
        HttpOnly = false,
        Secure = true,
        SameSite = SameSiteMode.Lax
    });

    return Results.Ok(new TokenResponse
    {
        AccessToken = access,
        RefreshToken = refresh,
        ExpiresInSeconds = 15 * 60
    });
}).WithName("Register");

api.MapPost("/auth/login", async (LoginRequest req, AppDbContext db, ITokenService tokenService, ITurnstileService turnstile, HttpContext httpContext, IConfiguration config, IAntiforgery antiforgery, CancellationToken ct) =>
{
    var ip = httpContext.Connection.RemoteIpAddress?.ToString();
    var ua = httpContext.Request.Headers.UserAgent.ToString();
    var normalizedEmail = req.Email.Trim().ToLowerInvariant();

    var user = await db.Users.Include(u => u.RefreshTokens)
        .FirstOrDefaultAsync(u => u.Email == normalizedEmail, ct);

    var attempt = new LoginAttempt
    {
        Email = normalizedEmail,
        ClientIp = ip,
        UserAgent = ua
    };

    var lockoutMinutes = config.GetValue("Auth:LockoutMinutes", 15);
    var maxFailures = config.GetValue("Auth:MaxFailedAttempts", 5);

    if (string.IsNullOrWhiteSpace(req.TurnstileToken) || !await turnstile.VerifyAsync(req.TurnstileToken, ip, ct))
    {
        attempt.Success = false;
        db.LoginAttempts.Add(attempt);
        await db.SaveChangesAsync(ct);
        return Results.BadRequest(new { error = "captcha_failed" });
    }

    if (user != null && user.IsLocked && user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow)
    {
        return Results.StatusCode(StatusCodes.Status423Locked);
    }

    if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
    {
        attempt.Success = false;
        db.LoginAttempts.Add(attempt);
        await db.SaveChangesAsync(ct);

        if (user != null)
        {
            var recentFailures = await db.LoginAttempts
                .Where(a => a.Email == normalizedEmail && !a.Success && a.CreatedAt > DateTimeOffset.UtcNow.AddMinutes(-lockoutMinutes))
                .CountAsync(ct);
            if (recentFailures >= maxFailures)
            {
                user.IsLocked = true;
                user.LockoutEnd = DateTimeOffset.UtcNow.AddMinutes(lockoutMinutes);
                await db.SaveChangesAsync(ct);
            }
        }

        return Results.Unauthorized();
    }

    if (user.MfaEnabled)
    {
        if (string.IsNullOrWhiteSpace(user.MfaSecret) || string.IsNullOrWhiteSpace(req.MfaCode))
        {
            return Results.BadRequest(new { error = "mfa_required" });
        }
        var totp = new Totp(Base32Encoding.ToBytes(user.MfaSecret));
        if (!totp.VerifyTotp(req.MfaCode, out _, VerificationWindow.RfcSpecifiedNetworkDelay))
        {
            return Results.BadRequest(new { error = "mfa_invalid" });
        }
    }

    attempt.Success = true;
    db.LoginAttempts.Add(attempt);
    user.IsLocked = false;
    user.LockoutEnd = null;
    await db.SaveChangesAsync(ct);

    var (access, refresh, _, refreshRec) = await tokenService.IssueAsync(user, scope: null, clientIp: ip, userAgent: ua, ct);
    var defaultStoreId = await db.StoreUserRoles.AsNoTracking()
        .Where(r => r.UserId == user.Id)
        .OrderBy(r => r.Role == StoreRole.Owner ? 0 : r.Role == StoreRole.Admin ? 1 : r.Role == StoreRole.Staff ? 2 : 3)
        .Select(r => (Guid?)r.StoreId)
        .FirstOrDefaultAsync(ct);

    // Set HttpOnly secure cookie for session-style usage
    httpContext.Response.Cookies.Append("session", refresh, new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Lax,
        Expires = refreshRec.ExpiresAt.UtcDateTime
    });

    var tokens = antiforgery.GetAndStoreTokens(httpContext);
    httpContext.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, new CookieOptions
    {
        HttpOnly = false,
        Secure = true,
        SameSite = SameSiteMode.Lax
    });

    return Results.Ok(new TokenResponse
    {
        AccessToken = access,
        RefreshToken = refresh,
        ExpiresInSeconds = 15 * 60,
        DefaultStoreId = defaultStoreId
    });
}).WithName("Login");

api.MapPost("/auth/refresh", async (RefreshRequest req, AppDbContext db, ITokenService tokenService, HttpContext httpContext, CancellationToken ct) =>
{
    var ip = httpContext.Connection.RemoteIpAddress?.ToString();
    var ua = httpContext.Request.Headers.UserAgent.ToString();
    var hashed = tokenService.HashToken(req.RefreshToken);

    var refresh = await db.RefreshTokens.Include(r => r.User)
        .FirstOrDefaultAsync(r => r.TokenHash == hashed && r.RevokedAt == null, ct);

    if (refresh == null || refresh.ExpiresAt < DateTimeOffset.UtcNow)
    {
        return Results.Unauthorized();
    }

    await tokenService.RevokeRefreshFamilyAsync(refresh.Id, ct);

    var (access, newRefresh, _, refreshRec) = await tokenService.IssueAsync(refresh.User, scope: null, clientIp: ip, userAgent: ua, ct);
    var defaultStoreId = await db.StoreUserRoles.AsNoTracking()
        .Where(r => r.UserId == refresh.UserId)
        .OrderBy(r => r.Role == StoreRole.Owner ? 0 : r.Role == StoreRole.Admin ? 1 : r.Role == StoreRole.Staff ? 2 : 3)
        .Select(r => (Guid?)r.StoreId)
        .FirstOrDefaultAsync(ct);

    httpContext.Response.Cookies.Append("session", newRefresh, new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Lax,
        Expires = refreshRec.ExpiresAt.UtcDateTime
    });

    var tokens = httpContext.RequestServices.GetRequiredService<IAntiforgery>().GetAndStoreTokens(httpContext);
    httpContext.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, new CookieOptions
    {
        HttpOnly = false,
        Secure = true,
        SameSite = SameSiteMode.Lax
    });

    return Results.Ok(new TokenResponse
    {
        AccessToken = access,
        RefreshToken = newRefresh,
        ExpiresInSeconds = 15 * 60,
        DefaultStoreId = defaultStoreId
    });
}).WithName("Refresh");

api.MapPost("/auth/webauthn/register/options", async (HttpContext ctx, AppDbContext db, ITokenService tokenService, IWebAuthnService webAuthn, CancellationToken ct) =>
{
    var bearer = ctx.Request.Headers.Authorization.FirstOrDefault();
    if (string.IsNullOrWhiteSpace(bearer) || !bearer.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
    {
        return Results.Unauthorized();
    }

    var token = bearer.Substring("Bearer ".Length).Trim();
    var hashed = tokenService.HashToken(token);
    var access = await db.AccessTokens.Include(a => a.User).FirstOrDefaultAsync(a => a.TokenHash == hashed && a.RevokedAt == null, ct);
    if (access == null || access.ExpiresAt < DateTimeOffset.UtcNow) return Results.Unauthorized();

    var options = await webAuthn.StartRegistrationAsync(access.User, access.User.Email, ct);
    return Results.Ok(options);
}).WithName("WebAuthnRegisterOptions");

api.MapPost("/auth/webauthn/register/verify", async (HttpContext ctx, AppDbContext db, ITokenService tokenService, IWebAuthnService webAuthn, CancellationToken ct) =>
{
    var bearer = ctx.Request.Headers.Authorization.FirstOrDefault();
    if (string.IsNullOrWhiteSpace(bearer) || !bearer.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
    {
        return Results.Unauthorized();
    }

    var token = bearer.Substring("Bearer ".Length).Trim();
    var hashed = tokenService.HashToken(token);
    var access = await db.AccessTokens.Include(a => a.User).FirstOrDefaultAsync(a => a.TokenHash == hashed && a.RevokedAt == null, ct);
    if (access == null || access.ExpiresAt < DateTimeOffset.UtcNow) return Results.Unauthorized();

    var attestation = await ctx.Request.ReadFromJsonAsync<AuthenticatorAttestationRawResponse>(cancellationToken: ct);
    if (attestation == null) return Results.BadRequest(new { error = "invalid_payload" });

    var ok = await webAuthn.FinishRegistrationAsync(access.User, attestation, ct);
    return ok ? Results.Ok() : Results.BadRequest(new { error = "webauthn_failed" });
}).WithName("WebAuthnRegisterVerify");

api.MapPost("/auth/webauthn/login/options", async (WebAuthnLoginOptionsRequest req, AppDbContext db, IWebAuthnService webAuthn, CancellationToken ct) =>
{
    var normalizedEmail = req.Email.Trim().ToLowerInvariant();
    var user = await db.Users.Include(u => u.WebAuthnCredentials).FirstOrDefaultAsync(u => u.Email == normalizedEmail, ct);
    if (user == null || !user.WebAuthnCredentials.Any())
    {
        return Results.NotFound(new { error = "no_webauthn" });
    }

    var options = await webAuthn.StartAssertionAsync(user, ct);
    return Results.Ok(options);
}).WithName("WebAuthnLoginOptions");

api.MapPost("/auth/webauthn/login/verify", async (HttpContext ctx, AppDbContext db, IWebAuthnService webAuthn, ITokenService tokenService, CancellationToken ct) =>
{
    var assertion = await ctx.Request.ReadFromJsonAsync<AuthenticatorAssertionRawResponse>(cancellationToken: ct);
    if (assertion == null) return Results.BadRequest(new { error = "invalid_payload" });

    var (ok, user) = await webAuthn.FinishAssertionAsync(assertion, ct);
    if (!ok || user == null) return Results.Unauthorized();

    var ip = ctx.Connection.RemoteIpAddress?.ToString();
    var ua = ctx.Request.Headers.UserAgent.ToString();
    var (access, refresh, _, refreshRec) = await tokenService.IssueAsync(user, scope: null, clientIp: ip, userAgent: ua, ct);
    var defaultStoreId = await db.StoreUserRoles.AsNoTracking()
        .Where(r => r.UserId == user.Id)
        .OrderBy(r => r.Role == StoreRole.Owner ? 0 : r.Role == StoreRole.Admin ? 1 : r.Role == StoreRole.Staff ? 2 : 3)
        .Select(r => (Guid?)r.StoreId)
        .FirstOrDefaultAsync(ct);

    ctx.Response.Cookies.Append("session", refresh, new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Lax,
        Expires = refreshRec.ExpiresAt.UtcDateTime
    });

    var tokens = ctx.RequestServices.GetRequiredService<IAntiforgery>().GetAndStoreTokens(ctx);
    ctx.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, new CookieOptions
    {
        HttpOnly = false,
        Secure = true,
        SameSite = SameSiteMode.Lax
    });

    return Results.Ok(new TokenResponse
    {
        AccessToken = access,
        RefreshToken = refresh,
        ExpiresInSeconds = 15 * 60,
        DefaultStoreId = defaultStoreId
    });
}).WithName("WebAuthnLoginVerify");

api.MapPost("/auth/mfa/enroll", async (HttpContext ctx, AppDbContext db, ITokenService tokenService, CancellationToken ct) =>
{
    var bearer = ctx.Request.Headers.Authorization.FirstOrDefault();
    if (string.IsNullOrWhiteSpace(bearer) || !bearer.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
    {
        return Results.Unauthorized();
    }

    var token = bearer.Substring("Bearer ".Length).Trim();
    var hashed = tokenService.HashToken(token);
    var access = await db.AccessTokens.Include(a => a.User).FirstOrDefaultAsync(a => a.TokenHash == hashed && a.RevokedAt == null, ct);
    if (access == null || access.ExpiresAt < DateTimeOffset.UtcNow) return Results.Unauthorized();

    var secret = Base32Encoding.ToString(KeyGeneration.GenerateRandomKey(20));
    access.User.MfaSecret = secret;
    await db.SaveChangesAsync(ct);

    var otpauth = $"otpauth://totp/Sitesellr:{Uri.EscapeDataString(access.User.Email)}?secret={secret}&issuer=Sitesellr&digits=6&period=30";
    return Results.Ok(new { secret, otpauth });
}).WithName("MfaEnroll");

api.MapPost("/auth/mfa/verify", async (HttpContext ctx, AppDbContext db, ITokenService tokenService, CancellationToken ct) =>
{
    var bearer = ctx.Request.Headers.Authorization.FirstOrDefault();
    if (string.IsNullOrWhiteSpace(bearer) || !bearer.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
    {
        return Results.Unauthorized();
    }

    var token = bearer.Substring("Bearer ".Length).Trim();
    var hashed = tokenService.HashToken(token);
    var access = await db.AccessTokens.Include(a => a.User).FirstOrDefaultAsync(a => a.TokenHash == hashed && a.RevokedAt == null, ct);
    if (access == null || access.ExpiresAt < DateTimeOffset.UtcNow) return Results.Unauthorized();

    var body = await ctx.Request.ReadFromJsonAsync<Dictionary<string, string>>(cancellationToken: ct);
    if (body == null || !body.TryGetValue("mfa_code", out var code))
    {
        return Results.BadRequest(new { error = "mfa_required" });
    }

    if (string.IsNullOrWhiteSpace(access.User.MfaSecret))
    {
        return Results.BadRequest(new { error = "mfa_not_enrolled" });
    }

    var totp = new Totp(Base32Encoding.ToBytes(access.User.MfaSecret));
    if (!totp.VerifyTotp(code, out _, VerificationWindow.RfcSpecifiedNetworkDelay))
    {
        return Results.BadRequest(new { error = "mfa_invalid" });
    }

    access.User.MfaEnabled = true;
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { enabled = true });
}).WithName("MfaVerify");

api.MapPost("/auth/logout", async (LogoutRequest req, AppDbContext db, ITokenService tokenService, CancellationToken ct) =>
{
    var hashed = tokenService.HashToken(req.RefreshToken);
    var refresh = await db.RefreshTokens.FirstOrDefaultAsync(r => r.TokenHash == hashed && r.RevokedAt == null, ct);
    if (refresh != null)
    {
        refresh.RevokedAt = DateTimeOffset.UtcNow;
        await tokenService.RevokeRefreshFamilyAsync(refresh.Id, ct);
        await db.SaveChangesAsync(ct);
    }
    return Results.Ok();
}).WithName("Logout");

api.MapGet("/auth/me", async (HttpContext context, AppDbContext db, ITokenService tokenService, CancellationToken ct) =>
{
    var bearer = context.Request.Headers.Authorization.FirstOrDefault();
    if (string.IsNullOrWhiteSpace(bearer) || !bearer.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
    {
        return Results.Unauthorized();
    }

    var token = bearer.Substring("Bearer ".Length).Trim();
    var hashed = tokenService.HashToken(token);
    var access = await db.AccessTokens.Include(a => a.User)
        .FirstOrDefaultAsync(a => a.TokenHash == hashed && a.RevokedAt == null, ct);

    if (access == null || access.ExpiresAt < DateTimeOffset.UtcNow)
    {
        return Results.Unauthorized();
    }

    var user = access.User;
    return Results.Ok(new
    {
        user.Id,
        user.Email,
        user.MfaEnabled,
        user.CreatedAt
    });
}).WithName("Me");

string GenerateOtp()
{
    return Random.Shared.Next(100000, 999999).ToString();
}

var onboardingSessions = new ConcurrentDictionary<Guid, OnboardingMemorySession>();

async Task<string> EnsureUniqueStoreSubdomainAsync(AppDbContext db, string? requested, string? fallbackName, CancellationToken ct)
{
    string seed;
    if (!string.IsNullOrWhiteSpace(requested))
    {
        if (!SubdomainPolicy.TryNormalizeRequested(requested, out var requestedNormalized, out _))
        {
            throw new InvalidOperationException("subdomain_invalid");
        }
        seed = requestedNormalized;
    }
    else
    {
        seed = SubdomainPolicy.BuildSeedFromFallback(fallbackName);
    }

    var candidate = seed;
    var suffix = 1;
    while (await db.Stores.AnyAsync(s => s.Subdomain == candidate, ct))
    {
        candidate = $"{seed}{suffix++}";
    }
    return candidate;
}

api.MapPost("/onboarding/start", async (AppDbContext db, OnboardingStartRequest req, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Mobile) || string.IsNullOrWhiteSpace(req.Password))
        return Results.BadRequest(new { error = "invalid_input" });

    var normalizedEmail = req.Email.Trim().ToLowerInvariant();
    if (await db.Users.AnyAsync(u => u.Email == normalizedEmail, ct))
        return Results.Conflict(new { error = "email_exists" });

    var hash = BCrypt.Net.BCrypt.HashPassword(req.Password, workFactor: 12);
    var session = new OnboardingMemorySession
    {
        Id = Guid.NewGuid(),
        Name = req.Name.Trim(),
        Email = normalizedEmail,
        Mobile = req.Mobile.Trim(),
        PasswordHash = hash,
        EmailOtp = GenerateOtp(),
        MobileOtp = GenerateOtp(),
        Status = OnboardingMemoryStatus.Started,
        UpdatedAt = DateTimeOffset.UtcNow,
        CreatedAt = DateTimeOffset.UtcNow
    };

    onboardingSessions[session.Id] = session;

    return Results.Ok(new
    {
        sessionId = session.Id,
        emailOtp = session.EmailOtp,
        mobileOtp = session.MobileOtp
    });
});

api.MapPost("/onboarding/verify-email", (OtpVerifyRequest req) =>
{
    onboardingSessions.TryGetValue(req.SessionId, out var session);
    if (session == null) return Results.NotFound();
    if (session.EmailOtp != req.Otp) return Results.BadRequest(new { error = "invalid_otp" });
    session.EmailVerified = true;
    session.Status = session.MobileVerified ? OnboardingMemoryStatus.OtpVerified : session.Status;
    session.UpdatedAt = DateTimeOffset.UtcNow;
    return Results.Ok(new { emailVerified = true, mobileVerified = session.MobileVerified });
});

api.MapPost("/onboarding/verify-mobile", (OtpVerifyRequest req) =>
{
    onboardingSessions.TryGetValue(req.SessionId, out var session);
    if (session == null) return Results.NotFound();
    if (session.MobileOtp != req.Otp) return Results.BadRequest(new { error = "invalid_otp" });
    session.MobileVerified = true;
    session.Status = session.EmailVerified ? OnboardingMemoryStatus.OtpVerified : session.Status;
    session.UpdatedAt = DateTimeOffset.UtcNow;
    return Results.Ok(new { emailVerified = session.EmailVerified, mobileVerified = true });
});

api.MapGet("/onboarding/plans", async (AppDbContext db, CancellationToken ct) =>
{
    var plans = await db.BillingPlans.AsNoTracking()
        .Where(x => x.IsActive)
        .OrderBy(x => x.PricePerMonth)
        .Select(x => new
        {
            x.Code,
            x.Name,
            x.PricePerMonth,
            x.TrialDays,
            capabilities = new
            {
                x.MaxProducts,
                x.MaxVariantsPerProduct,
                x.MaxCategories,
                x.MaxPaymentGateways,
                x.CodEnabled,
                x.SmsEnabled,
                x.SmsQuotaMonthly,
                x.EmailEnabled,
                x.EmailQuotaMonthly,
                x.WhatsappEnabled,
                x.WhatsappFeaturesTier,
                x.MaxPluginsInstalled,
                x.PaidPluginsAllowed,
                x.AllowedThemeTier,
                x.MaxThemeInstalls,
                x.PremiumThemeAccess
            }
        })
        .ToListAsync(ct);

    if (plans.Count == 0)
    {
        return Results.Ok(new[]
        {
            new { Code = "free", Name = "Free", PricePerMonth = 0m, TrialDays = 14, capabilities = new { maxProducts = 50, maxVariantsPerProduct = 20, maxPaymentGateways = 1, allowedThemeTier = "free", premiumThemeAccess = false, maxPluginsInstalled = 2, smsEnabled = false, smsQuotaMonthly = 0, whatsappEnabled = false, whatsappFeaturesTier = "none" } },
            new { Code = "growth", Name = "Growth", PricePerMonth = 1499m, TrialDays = 14, capabilities = new { maxProducts = 500, maxVariantsPerProduct = 100, maxPaymentGateways = 3, allowedThemeTier = "standard", premiumThemeAccess = true, maxPluginsInstalled = 10, smsEnabled = true, smsQuotaMonthly = 2000, whatsappEnabled = true, whatsappFeaturesTier = "basic" } },
            new { Code = "pro", Name = "Pro", PricePerMonth = 2999m, TrialDays = 14, capabilities = new { maxProducts = 5000, maxVariantsPerProduct = 250, maxPaymentGateways = 10, allowedThemeTier = "premium", premiumThemeAccess = true, maxPluginsInstalled = 50, smsEnabled = true, smsQuotaMonthly = 10000, whatsappEnabled = true, whatsappFeaturesTier = "full" } },
            new { Code = "enterprise", Name = "Enterprise", PricePerMonth = 7999m, TrialDays = 14, capabilities = new { maxProducts = 100000, maxVariantsPerProduct = 1000, maxPaymentGateways = 50, allowedThemeTier = "enterprise", premiumThemeAccess = true, maxPluginsInstalled = 500, smsEnabled = true, smsQuotaMonthly = 50000, whatsappEnabled = true, whatsappFeaturesTier = "full" } }
        });
    }

    return Results.Ok(plans);
});

api.MapPost("/onboarding/choose-plan", async (AppDbContext db, ChoosePlanRequest req, CancellationToken ct) =>
{
    onboardingSessions.TryGetValue(req.SessionId, out var session);
    if (session == null) return Results.NotFound();
    if (!session.EmailVerified || !session.MobileVerified) return Results.BadRequest(new { error = "otp_not_verified" });

    var plan = await db.BillingPlans.AsNoTracking().FirstOrDefaultAsync(x => x.Code == req.PlanCode && x.IsActive, ct);
    var price = plan?.PricePerMonth ?? (req.PlanCode == "free" ? 0m : 1999m);
    session.PlanCode = req.PlanCode;
    session.PaymentRequired = price > 0;
    session.Status = OnboardingMemoryStatus.PlanChosen;
    session.UpdatedAt = DateTimeOffset.UtcNow;
    return Results.Ok(new { paymentRequired = session.PaymentRequired, amount = price });
});

api.MapPost("/onboarding/confirm-payment", (SessionOnlyRequest req) =>
{
    onboardingSessions.TryGetValue(req.SessionId, out var session);
    if (session == null) return Results.NotFound();
    if (session.Status < OnboardingMemoryStatus.PlanChosen) return Results.BadRequest(new { error = "plan_not_chosen" });
    session.PaymentDone = true;
    session.Status = OnboardingMemoryStatus.PaymentCompleted;
    session.UpdatedAt = DateTimeOffset.UtcNow;
    return Results.Ok(new { paid = true });
});

api.MapPost("/onboarding/setup-store", async (AppDbContext db, SetupStoreRequest req, CancellationToken ct) =>
{
    onboardingSessions.TryGetValue(req.SessionId, out var session);
    if (session == null) return Results.NotFound();
    if (session.PaymentRequired && !session.PaymentDone) return Results.BadRequest(new { error = "payment_required" });

    if (!SubdomainPolicy.TryNormalizeRequested(req.Subdomain, out _, out var subdomainError))
    {
        return Results.BadRequest(new { error = subdomainError ?? "subdomain_invalid" });
    }

    var sub = await EnsureUniqueStoreSubdomainAsync(db, req.Subdomain, req.StoreName, ct);

    session.StoreName = req.StoreName.Trim();
    session.Subdomain = sub;
    session.Status = OnboardingMemoryStatus.StoreSetup;
    session.UpdatedAt = DateTimeOffset.UtcNow;
    return Results.Ok(new { storeName = session.StoreName, subdomain = session.Subdomain });
});

api.MapPost("/onboarding/complete", async (AppDbContext db, SessionOnlyRequest req, ITokenService tokenService, ICloudflareDnsService cloudflareDns, HttpContext httpContext, CancellationToken ct) =>
{
    onboardingSessions.TryGetValue(req.SessionId, out var session);
    if (session == null) return Results.NotFound();
    if (session.Status < OnboardingMemoryStatus.StoreSetup) return Results.BadRequest(new { error = "store_not_setup" });

    var existingUser = await db.Users.FirstOrDefaultAsync(x => x.Email == session.Email, ct);
    if (existingUser != null) return Results.Conflict(new { error = "email_exists" });

    var user = new User
    {
        Email = session.Email,
        PasswordHash = session.PasswordHash,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };
    db.Users.Add(user);

    var merchant = new Merchant
    {
        Name = $"{session.Name}'s Merchant",
        Status = MerchantStatus.Trial,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };
    db.Merchants.Add(merchant);

    var store = new Store
    {
        Merchant = merchant,
        Name = session.StoreName ?? "My Store",
        Subdomain = session.Subdomain,
        Status = StoreStatus.Active,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };
    db.Stores.Add(store);

    var role = new StoreUserRole
    {
        Store = store,
        User = user,
        Role = StoreRole.Owner
    };
    db.StoreUserRoles.Add(role);

    var selectedPlan = await db.BillingPlans.FirstOrDefaultAsync(x => x.Code == session.PlanCode && x.IsActive, ct);
    if (selectedPlan != null)
    {
        db.MerchantSubscriptions.Add(new MerchantSubscription
        {
            Merchant = merchant,
            Plan = selectedPlan,
            StartedAt = DateTimeOffset.UtcNow,
            TrialEndsAt = DateTimeOffset.UtcNow.AddDays(selectedPlan.TrialDays)
        });
    }

    await db.SaveChangesAsync(ct);
    if (!string.IsNullOrWhiteSpace(store.Subdomain))
    {
        await cloudflareDns.EnsureTenantSubdomainAsync(store.Subdomain, ct);
    }
    onboardingSessions.TryRemove(req.SessionId, out _);

    var ip = httpContext.Connection.RemoteIpAddress?.ToString();
    var ua = httpContext.Request.Headers.UserAgent.ToString();
    var (access, refresh, _, _) = await tokenService.IssueAsync(user, scope: null, clientIp: ip, userAgent: ua, ct);
    return Results.Ok(new
    {
        access_token = access,
        refresh_token = refresh,
        storeId = store.Id
    });
});

app.Run();
