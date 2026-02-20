using backend_dotnet.Models;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<StatusCheck> StatusChecks => Set<StatusCheck>();
    public DbSet<User> Users => Set<User>();
    public DbSet<AccessToken> AccessTokens => Set<AccessToken>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<LoginAttempt> LoginAttempts => Set<LoginAttempt>();
    public DbSet<WebAuthnCredential> WebAuthnCredentials => Set<WebAuthnCredential>();
    public DbSet<Merchant> Merchants => Set<Merchant>();
    public DbSet<Store> Stores => Set<Store>();
    public DbSet<StoreUserRole> StoreUserRoles => Set<StoreUserRole>();
    public DbSet<StoreUserPermission> StoreUserPermissions => Set<StoreUserPermission>();
    public DbSet<PlatformUserRole> PlatformUserRoles => Set<PlatformUserRole>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<CustomerAddress> CustomerAddresses => Set<CustomerAddress>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<ProductMedia> ProductMedia => Set<ProductMedia>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<BillingPlan> BillingPlans => Set<BillingPlan>();
    public DbSet<MerchantSubscription> MerchantSubscriptions => Set<MerchantSubscription>();
    public DbSet<TeamInviteToken> TeamInviteTokens => Set<TeamInviteToken>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<MerchantOnboardingProfile> MerchantOnboardingProfiles => Set<MerchantOnboardingProfile>();
    public DbSet<StoreRoleTemplate> StoreRoleTemplates => Set<StoreRoleTemplate>();
    public DbSet<SensitiveActionApproval> SensitiveActionApprovals => Set<SensitiveActionApproval>();
    public DbSet<FranchiseUnit> FranchiseUnits => Set<FranchiseUnit>();
    public DbSet<FranchiseStore> FranchiseStores => Set<FranchiseStore>();
    public DbSet<BackofficeAssignment> BackofficeAssignments => Set<BackofficeAssignment>();
    public DbSet<ThemeCatalogItem> ThemeCatalogItems => Set<ThemeCatalogItem>();
    public DbSet<CampaignTemplateCatalogItem> CampaignTemplateCatalogItems => Set<CampaignTemplateCatalogItem>();
    public DbSet<StoreCampaignTemplateSubscription> StoreCampaignTemplateSubscriptions => Set<StoreCampaignTemplateSubscription>();
    public DbSet<StoreThemeConfig> StoreThemeConfigs => Set<StoreThemeConfig>();
    public DbSet<StoreHomepageLayout> StoreHomepageLayouts => Set<StoreHomepageLayout>();
    public DbSet<StorefrontLayoutVersion> StorefrontLayoutVersions => Set<StorefrontLayoutVersion>();
    public DbSet<StorefrontEditSession> StorefrontEditSessions => Set<StorefrontEditSession>();
    public DbSet<StoreNavigationMenu> StoreNavigationMenus => Set<StoreNavigationMenu>();
    public DbSet<StoreStaticPage> StoreStaticPages => Set<StoreStaticPage>();
    public DbSet<StoreMediaAsset> StoreMediaAssets => Set<StoreMediaAsset>();
    public DbSet<StoreDomain> StoreDomains => Set<StoreDomain>();
    public DbSet<StoreQuoteInquiry> StoreQuoteInquiries => Set<StoreQuoteInquiry>();
    public DbSet<StoreCustomerCredential> StoreCustomerCredentials => Set<StoreCustomerCredential>();
    public DbSet<StoreCustomerSession> StoreCustomerSessions => Set<StoreCustomerSession>();
    public DbSet<CustomerGroup> CustomerGroups => Set<CustomerGroup>();
    public DbSet<CustomerGroupMember> CustomerGroupMembers => Set<CustomerGroupMember>();
    public DbSet<VisibilityRule> VisibilityRules => Set<VisibilityRule>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<StatusCheck>();

        entity.ToTable("status_checks");
        entity.HasKey(x => x.Id);

        entity.Property(x => x.ClientName)
              .IsRequired()
              .HasMaxLength(200);

        entity.Property(x => x.Timestamp)
              .HasColumnType("timestamp with time zone")
              .IsRequired();

        modelBuilder.Entity<User>(b =>
        {
            b.ToTable("users");
            b.HasKey(u => u.Id);
            b.Property(u => u.Email).IsRequired().HasMaxLength(320);
            b.HasIndex(u => u.Email).IsUnique();
            b.Property(u => u.PasswordHash).IsRequired().HasMaxLength(200);
            b.Property(u => u.IsLocked).HasDefaultValue(false);
            b.Property(u => u.LockoutEnd).HasColumnType("timestamp with time zone");
            b.Property(u => u.MfaEnabled).HasDefaultValue(false);
            b.Property(u => u.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(u => u.UpdatedAt).HasColumnType("timestamp with time zone");
        });

        modelBuilder.Entity<Merchant>(b =>
        {
            b.ToTable("merchants");
            b.HasKey(m => m.Id);
            b.Property(m => m.Name).IsRequired().HasMaxLength(200);
            b.Property(m => m.PrimaryDomain).HasMaxLength(200);
            b.Property(m => m.Status).HasConversion<int>();
            b.Property(m => m.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(m => m.UpdatedAt).HasColumnType("timestamp with time zone");
        });

        modelBuilder.Entity<Store>(b =>
        {
            b.ToTable("stores");
            b.HasKey(s => s.Id);
            b.Property(s => s.Name).IsRequired().HasMaxLength(200);
            b.Property(s => s.Subdomain).HasMaxLength(120);
            b.Property(s => s.Currency).HasMaxLength(10);
            b.Property(s => s.Timezone).HasMaxLength(100);
            b.Property(s => s.Status).HasConversion<int>();
            b.Property(s => s.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(s => s.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasOne(s => s.Merchant)
                .WithMany(m => m.Stores)
                .HasForeignKey(s => s.MerchantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StoreUserRole>(b =>
        {
            b.ToTable("store_user_roles");
            b.HasKey(su => su.Id);
            b.Property(su => su.Role).HasConversion<int>();
            b.Property(su => su.CustomRoleName).HasMaxLength(120);
            b.Property(su => su.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(su => new { su.StoreId, su.UserId }).IsUnique();
            b.HasOne(su => su.Store).WithMany(s => s.StoreUsers).HasForeignKey(su => su.StoreId);
            b.HasOne(su => su.User).WithMany().HasForeignKey(su => su.UserId);
        });

        modelBuilder.Entity<StoreUserPermission>(b =>
        {
            b.ToTable("store_user_permissions");
            b.HasKey(p => p.Id);
            b.Property(p => p.Permission).IsRequired().HasMaxLength(120);
            b.Property(p => p.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(p => new { p.StoreId, p.UserId, p.Permission }).IsUnique();
            b.HasOne(p => p.Store).WithMany().HasForeignKey(p => p.StoreId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(p => p.User).WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PlatformUserRole>(b =>
        {
            b.ToTable("platform_user_roles");
            b.HasKey(p => p.Id);
            b.Property(p => p.Role).HasConversion<int>();
            b.Property(p => p.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(p => new { p.UserId, p.Role }).IsUnique();
            b.HasOne(p => p.User).WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Category>(b =>
        {
            b.ToTable("categories");
            b.HasKey(c => c.Id);
            b.Property(c => c.Name).IsRequired().HasMaxLength(120);
            b.Property(c => c.Slug).IsRequired().HasMaxLength(160);
            b.Property(c => c.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(c => new { c.StoreId, c.Slug }).IsUnique();
        });

        modelBuilder.Entity<Product>(b =>
        {
            b.ToTable("products");
            b.HasKey(p => p.Id);
            b.Property(p => p.Title).IsRequired().HasMaxLength(200);
            b.Property(p => p.Description).HasMaxLength(500);
            b.Property(p => p.SKU).HasMaxLength(64);
            b.Property(p => p.Price).HasColumnType("numeric(18,2)");
            b.Property(p => p.CompareAtPrice).HasColumnType("numeric(18,2)");
            b.Property(p => p.Currency).HasMaxLength(10);
            b.Property(p => p.Status).HasConversion<int>();
            b.Property(p => p.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(p => p.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasOne(p => p.Store).WithMany(s => s.Products).HasForeignKey(p => p.StoreId);
            b.HasOne(p => p.Category).WithMany().HasForeignKey(p => p.CategoryId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ProductVariant>(b =>
        {
            b.ToTable("product_variants");
            b.HasKey(v => v.Id);
            b.Property(v => v.SKU).HasMaxLength(64);
            b.Property(v => v.Price).HasColumnType("numeric(18,2)");
            b.Property(v => v.AttributesJson).HasMaxLength(200);
            b.HasOne(v => v.Product).WithMany(p => p.Variants).HasForeignKey(v => v.ProductId);
        });

        modelBuilder.Entity<ProductMedia>(b =>
        {
            b.ToTable("product_media");
            b.HasKey(m => m.Id);
            b.Property(m => m.Url).IsRequired().HasMaxLength(500);
            b.Property(m => m.SortOrder).HasDefaultValue(0);
            b.HasOne(m => m.Product).WithMany(p => p.Media).HasForeignKey(m => m.ProductId);
        });

        modelBuilder.Entity<Customer>(b =>
        {
            b.ToTable("customers");
            b.HasKey(c => c.Id);
            b.Property(c => c.Name).IsRequired().HasMaxLength(200);
            b.Property(c => c.Email).HasMaxLength(320);
            b.Property(c => c.Phone).HasMaxLength(20);
            b.Property(c => c.CompanyName).HasMaxLength(200);
            b.Property(c => c.GSTIN).HasMaxLength(15);
            b.Property(c => c.Type).HasConversion<int>();
            b.Property(c => c.CreditLimit).HasColumnType("numeric(18,2)");
            b.Property(c => c.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(c => c.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasOne(c => c.Store).WithMany(s => s.Customers).HasForeignKey(c => c.StoreId);
        });

        modelBuilder.Entity<CustomerAddress>(b =>
        {
            b.ToTable("customer_addresses");
            b.HasKey(a => a.Id);
            b.Property(a => a.Label).HasMaxLength(100);
            b.Property(a => a.Line1).HasMaxLength(200);
            b.Property(a => a.Line2).HasMaxLength(200);
            b.Property(a => a.City).HasMaxLength(100);
            b.Property(a => a.State).HasMaxLength(100);
            b.Property(a => a.PostalCode).HasMaxLength(20);
            b.Property(a => a.Country).HasMaxLength(100);
            b.Property(a => a.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasOne(a => a.Customer).WithMany(c => c.Addresses).HasForeignKey(a => a.CustomerId);
        });

        modelBuilder.Entity<Order>(b =>
        {
            b.ToTable("orders");
            b.HasKey(o => o.Id);
            b.Property(o => o.Type).HasConversion<int>();
            b.Property(o => o.Status).HasConversion<int>();
            b.Property(o => o.PaymentStatus).HasConversion<int>();
            b.Property(o => o.Subtotal).HasColumnType("numeric(18,2)");
            b.Property(o => o.Tax).HasColumnType("numeric(18,2)");
            b.Property(o => o.Shipping).HasColumnType("numeric(18,2)");
            b.Property(o => o.Total).HasColumnType("numeric(18,2)");
            b.Property(o => o.Currency).HasMaxLength(10);
            b.Property(o => o.Notes).HasMaxLength(200);
            b.Property(o => o.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(o => o.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasOne(o => o.Store).WithMany(s => s.Orders).HasForeignKey(o => o.StoreId);
            b.HasOne(o => o.Customer).WithMany(c => c.Orders).HasForeignKey(o => o.CustomerId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<OrderItem>(b =>
        {
            b.ToTable("order_items");
            b.HasKey(oi => oi.Id);
            b.Property(oi => oi.Title).IsRequired().HasMaxLength(200);
            b.Property(oi => oi.SKU).HasMaxLength(64);
            b.Property(oi => oi.Price).HasColumnType("numeric(18,2)");
            b.Property(oi => oi.Total).HasColumnType("numeric(18,2)");
            b.HasOne(oi => oi.Order).WithMany(o => o.Items).HasForeignKey(oi => oi.OrderId);
        });

        modelBuilder.Entity<BillingPlan>(b =>
        {
            b.ToTable("billing_plans");
            b.HasKey(p => p.Id);
            b.Property(p => p.Name).IsRequired().HasMaxLength(120);
            b.Property(p => p.Code).IsRequired().HasMaxLength(50);
            b.Property(p => p.PricePerMonth).HasColumnType("numeric(18,2)");
            b.Property(p => p.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(p => p.Code).IsUnique();
        });

        modelBuilder.Entity<MerchantSubscription>(b =>
        {
            b.ToTable("merchant_subscriptions");
            b.HasKey(s => s.Id);
            b.Property(s => s.StartedAt).HasColumnType("timestamp with time zone");
            b.Property(s => s.TrialEndsAt).HasColumnType("timestamp with time zone");
            b.Property(s => s.ExpiresAt).HasColumnType("timestamp with time zone");
            b.HasOne(s => s.Merchant).WithMany().HasForeignKey(s => s.MerchantId);
            b.HasOne(s => s.Plan).WithMany().HasForeignKey(s => s.PlanId);
        });

        modelBuilder.Entity<TeamInviteToken>(b =>
        {
            b.ToTable("team_invite_tokens");
            b.HasKey(x => x.Id);
            b.Property(x => x.Email).IsRequired().HasMaxLength(320);
            b.Property(x => x.TokenHash).IsRequired().HasMaxLength(128);
            b.Property(x => x.Role).HasConversion<int>();
            b.Property(x => x.CustomRoleName).HasMaxLength(120);
            b.Property(x => x.ExpiresAt).HasColumnType("timestamp with time zone");
            b.Property(x => x.AcceptedAt).HasColumnType("timestamp with time zone");
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => x.TokenHash).IsUnique();
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AuditLog>(b =>
        {
            b.ToTable("audit_logs");
            b.HasKey(x => x.Id);
            b.Property(x => x.Action).IsRequired().HasMaxLength(80);
            b.Property(x => x.EntityType).HasMaxLength(80);
            b.Property(x => x.EntityId).HasMaxLength(80);
            b.Property(x => x.Details).HasMaxLength(2000);
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => x.CreatedAt);
            b.HasIndex(x => x.StoreId);
            b.HasIndex(x => x.MerchantId);
        });

        modelBuilder.Entity<MerchantOnboardingProfile>(b =>
        {
            b.ToTable("merchant_onboarding_profiles");
            b.HasKey(x => x.Id);
            b.Property(x => x.PipelineStatus).HasMaxLength(80);
            b.Property(x => x.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => x.MerchantId).IsUnique();
            b.HasOne(x => x.Merchant).WithMany().HasForeignKey(x => x.MerchantId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StoreRoleTemplate>(b =>
        {
            b.ToTable("store_role_templates");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(80);
            b.Property(x => x.PermissionsCsv).IsRequired().HasMaxLength(2000);
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => new { x.StoreId, x.Name }).IsUnique();
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SensitiveActionApproval>(b =>
        {
            b.ToTable("sensitive_action_approvals");
            b.HasKey(x => x.Id);
            b.Property(x => x.ActionType).IsRequired().HasMaxLength(120);
            b.Property(x => x.EntityType).HasMaxLength(80);
            b.Property(x => x.EntityId).HasMaxLength(80);
            b.Property(x => x.PayloadJson).HasMaxLength(4000);
            b.Property(x => x.Status).HasMaxLength(30);
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(x => x.ApprovedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => x.Status);
        });

        modelBuilder.Entity<FranchiseUnit>(b =>
        {
            b.ToTable("franchise_units");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(120);
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => new { x.MerchantId, x.Name }).IsUnique();
            b.HasOne(x => x.Merchant).WithMany().HasForeignKey(x => x.MerchantId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FranchiseStore>(b =>
        {
            b.ToTable("franchise_stores");
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.FranchiseUnitId, x.StoreId }).IsUnique();
            b.HasOne(x => x.FranchiseUnit).WithMany().HasForeignKey(x => x.FranchiseUnitId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BackofficeAssignment>(b =>
        {
            b.ToTable("backoffice_assignments");
            b.HasKey(x => x.Id);
            b.Property(x => x.Scope).HasMaxLength(80);
            b.Property(x => x.Department).HasMaxLength(80);
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => new { x.MerchantId, x.UserId, x.Scope, x.Department });
            b.HasOne(x => x.Merchant).WithMany().HasForeignKey(x => x.MerchantId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.StoreScope).WithMany().HasForeignKey(x => x.StoreScopeId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ThemeCatalogItem>(b =>
        {
            b.ToTable("theme_catalog_items");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(120);
            b.Property(x => x.Slug).IsRequired().HasMaxLength(120);
            b.Property(x => x.Category).HasMaxLength(80);
            b.Property(x => x.Description).HasMaxLength(800);
            b.Property(x => x.PreviewUrl).HasMaxLength(1000);
            b.Property(x => x.Price).HasColumnType("numeric(18,2)");
            b.Property(x => x.AllowedPlanCodesCsv).HasMaxLength(500);
            b.Property(x => x.FeaturedRank).HasDefaultValue(0);
            b.Property(x => x.TypographyPack).HasMaxLength(60);
            b.Property(x => x.LayoutVariant).HasMaxLength(60);
            b.Property(x => x.RuntimePackageJson).HasMaxLength(4000);
            b.Property(x => x.PlpVariantsJson).HasMaxLength(4000);
            b.Property(x => x.PdpVariantsJson).HasMaxLength(4000);
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(x => x.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => x.Slug).IsUnique();
        });

        modelBuilder.Entity<CampaignTemplateCatalogItem>(b =>
        {
            b.ToTable("campaign_template_catalog_items");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(140);
            b.Property(x => x.Slug).IsRequired().HasMaxLength(140);
            b.Property(x => x.Category).HasMaxLength(80);
            b.Property(x => x.Description).HasMaxLength(1200);
            b.Property(x => x.SectionsJson).HasMaxLength(4000);
            b.Property(x => x.Price).HasColumnType("numeric(18,2)");
            b.Property(x => x.AllowedPlanCodesCsv).HasMaxLength(500);
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(x => x.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => x.Slug).IsUnique();
        });

        modelBuilder.Entity<StoreCampaignTemplateSubscription>(b =>
        {
            b.ToTable("store_campaign_template_subscriptions");
            b.HasKey(x => x.Id);
            b.Property(x => x.Status).HasMaxLength(30);
            b.Property(x => x.BillingMode).HasMaxLength(40);
            b.Property(x => x.BillingStatus).HasMaxLength(40);
            b.Property(x => x.ChargedAmount).HasColumnType("numeric(18,2)");
            b.Property(x => x.Currency).HasMaxLength(8);
            b.Property(x => x.PlanCodeAtPurchase).HasMaxLength(80);
            b.Property(x => x.PaymentReference).HasMaxLength(80);
            b.Property(x => x.PurchasedAt).HasColumnType("timestamp with time zone");
            b.Property(x => x.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => new { x.StoreId, x.TemplateId }).IsUnique();
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.Template).WithMany().HasForeignKey(x => x.TemplateId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StoreThemeConfig>(b =>
        {
            b.ToTable("store_theme_configs");
            b.HasKey(x => x.Id);
            b.Property(x => x.LogoUrl).HasMaxLength(1000);
            b.Property(x => x.FaviconUrl).HasMaxLength(1000);
            b.Property(x => x.HeaderJson).HasMaxLength(4000);
            b.Property(x => x.FooterJson).HasMaxLength(4000);
            b.Property(x => x.BannerJson).HasMaxLength(4000);
            b.Property(x => x.DesignTokensJson).HasMaxLength(4000);
            b.Property(x => x.CatalogMode).HasMaxLength(20);
            b.Property(x => x.CatalogVisibilityJson).HasMaxLength(4000);
            b.Property(x => x.QuoteAlertEmail).HasMaxLength(320);
            b.Property(x => x.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => x.StoreId).IsUnique();
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.ActiveTheme).WithMany().HasForeignKey(x => x.ActiveThemeId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<StoreHomepageLayout>(b =>
        {
            b.ToTable("store_homepage_layouts");
            b.HasKey(x => x.Id);
            b.Property(x => x.SectionsJson).HasMaxLength(4000);
            b.Property(x => x.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => x.StoreId).IsUnique();
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StorefrontLayoutVersion>(b =>
        {
            b.ToTable("storefront_layout_versions");
            b.HasKey(x => x.Id);
            b.Property(x => x.SectionsJson).HasMaxLength(4000);
            b.Property(x => x.VersionType).HasMaxLength(20);
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => new { x.StoreId, x.VersionNumber }).IsUnique();
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StorefrontEditSession>(b =>
        {
            b.ToTable("storefront_edit_sessions");
            b.HasKey(x => x.Id);
            b.Property(x => x.EditorName).HasMaxLength(120);
            b.Property(x => x.Status).HasMaxLength(40);
            b.Property(x => x.LastSeenAt).HasColumnType("timestamp with time zone");
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => new { x.StoreId, x.Status });
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StoreNavigationMenu>(b =>
        {
            b.ToTable("store_navigation_menus");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).HasMaxLength(120);
            b.Property(x => x.ItemsJson).HasMaxLength(4000);
            b.Property(x => x.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => new { x.StoreId, x.Name }).IsUnique();
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StoreStaticPage>(b =>
        {
            b.ToTable("store_static_pages");
            b.HasKey(x => x.Id);
            b.Property(x => x.Title).IsRequired().HasMaxLength(160);
            b.Property(x => x.Slug).IsRequired().HasMaxLength(200);
            b.Property(x => x.Content).HasMaxLength(10000);
            b.Property(x => x.SeoTitle).HasMaxLength(160);
            b.Property(x => x.SeoDescription).HasMaxLength(400);
            b.Property(x => x.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => new { x.StoreId, x.Slug }).IsUnique();
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StoreMediaAsset>(b =>
        {
            b.ToTable("store_media_assets");
            b.HasKey(x => x.Id);
            b.Property(x => x.FileName).IsRequired().HasMaxLength(260);
            b.Property(x => x.ContentType).IsRequired().HasMaxLength(120);
            b.Property(x => x.Url).IsRequired().HasMaxLength(1000);
            b.Property(x => x.Kind).HasMaxLength(80);
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => new { x.StoreId, x.Kind });
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StoreDomain>(b =>
        {
            b.ToTable("store_domains");
            b.HasKey(x => x.Id);
            b.Property(x => x.Hostname).IsRequired().HasMaxLength(255);
            b.Property(x => x.VerificationToken).HasMaxLength(120);
            b.Property(x => x.SslProvider).HasMaxLength(40);
            b.Property(x => x.SslStatus).HasMaxLength(30);
            b.Property(x => x.LastError).HasMaxLength(500);
            b.Property(x => x.SslExpiresAt).HasColumnType("timestamp with time zone");
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(x => x.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => x.Hostname).IsUnique();
            b.HasIndex(x => new { x.StoreId, x.IsVerified });
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StoreQuoteInquiry>(b =>
        {
            b.ToTable("store_quote_inquiries");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).HasMaxLength(200);
            b.Property(x => x.Email).HasMaxLength(320);
            b.Property(x => x.Phone).HasMaxLength(20);
            b.Property(x => x.Message).HasMaxLength(1200);
            b.Property(x => x.Status).HasMaxLength(40);
            b.Property(x => x.Priority).HasMaxLength(20);
            b.Property(x => x.SlaDueAt).HasColumnType("timestamp with time zone");
            b.Property(x => x.LastNotifiedAt).HasColumnType("timestamp with time zone");
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(x => x.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => new { x.StoreId, x.CreatedAt });
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.SetNull);
            b.HasOne(x => x.AssignedToUser).WithMany().HasForeignKey(x => x.AssignedToUserId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<StoreCustomerCredential>(b =>
        {
            b.ToTable("store_customer_credentials");
            b.HasKey(x => x.Id);
            b.Property(x => x.Email).IsRequired().HasMaxLength(320);
            b.Property(x => x.PasswordHash).IsRequired().HasMaxLength(400);
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(x => x.UpdatedAt).HasColumnType("timestamp with time zone");
            b.Property(x => x.LastLoginAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => new { x.StoreId, x.Email }).IsUnique();
            b.HasIndex(x => new { x.StoreId, x.CustomerId }).IsUnique();
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StoreCustomerSession>(b =>
        {
            b.ToTable("store_customer_sessions");
            b.HasKey(x => x.Id);
            b.Property(x => x.TokenHash).IsRequired().HasMaxLength(128);
            b.Property(x => x.UserAgent).HasMaxLength(60);
            b.Property(x => x.ClientIp).HasMaxLength(64);
            b.Property(x => x.ExpiresAt).HasColumnType("timestamp with time zone");
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => x.TokenHash).IsUnique();
            b.HasIndex(x => new { x.StoreId, x.CustomerId, x.ExpiresAt });
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CustomerGroup>(b =>
        {
            b.ToTable("customer_groups");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(120);
            b.Property(x => x.Description).HasMaxLength(400);
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => new { x.StoreId, x.Name }).IsUnique();
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CustomerGroupMember>(b =>
        {
            b.ToTable("customer_group_members");
            b.HasKey(x => x.Id);
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => new { x.StoreId, x.CustomerGroupId, x.CustomerId }).IsUnique();
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.CustomerGroup).WithMany().HasForeignKey(x => x.CustomerGroupId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<VisibilityRule>(b =>
        {
            b.ToTable("visibility_rules");
            b.HasKey(x => x.Id);
            b.Property(x => x.TargetType).IsRequired().HasMaxLength(30);
            b.Property(x => x.TargetKey).IsRequired().HasMaxLength(120);
            b.Property(x => x.Effect).IsRequired().HasMaxLength(10);
            b.Property(x => x.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(x => new { x.StoreId, x.TargetType, x.TargetKey, x.CustomerGroupId, x.Effect });
            b.HasOne(x => x.Store).WithMany().HasForeignKey(x => x.StoreId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne(x => x.CustomerGroup).WithMany().HasForeignKey(x => x.CustomerGroupId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AccessToken>(b =>
        {
            b.ToTable("access_tokens");
            b.HasKey(t => t.Id);
            b.HasIndex(t => t.TokenHash).IsUnique();
            b.Property(t => t.TokenHash).IsRequired().HasMaxLength(128);
            b.Property(t => t.Scope).HasMaxLength(200);
            b.Property(t => t.ExpiresAt).HasColumnType("timestamp with time zone");
            b.Property(t => t.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(t => t.RevokedAt).HasColumnType("timestamp with time zone");
            b.Property(t => t.ClientIp).HasMaxLength(64);
            b.Property(t => t.UserAgent).HasMaxLength(256);
            b.HasOne(t => t.User)
                .WithMany(u => u.AccessTokens)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RefreshToken>(b =>
        {
            b.ToTable("refresh_tokens");
            b.HasKey(t => t.Id);
            b.HasIndex(t => t.TokenHash).IsUnique();
            b.Property(t => t.TokenHash).IsRequired().HasMaxLength(128);
            b.Property(t => t.ExpiresAt).HasColumnType("timestamp with time zone");
            b.Property(t => t.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(t => t.RevokedAt).HasColumnType("timestamp with time zone");
            b.Property(t => t.ClientIp).HasMaxLength(64);
            b.Property(t => t.UserAgent).HasMaxLength(256);
            b.Property(t => t.ParentTokenId);
            b.HasOne(t => t.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LoginAttempt>(b =>
        {
            b.ToTable("login_attempts");
            b.HasKey(a => a.Id);
            b.Property(a => a.Email).IsRequired().HasMaxLength(320);
            b.Property(a => a.Success).IsRequired();
            b.Property(a => a.ClientIp).HasMaxLength(64);
            b.Property(a => a.UserAgent).HasMaxLength(256);
            b.Property(a => a.CreatedAt).HasColumnType("timestamp with time zone");
        });

        modelBuilder.Entity<WebAuthnCredential>(b =>
        {
            b.ToTable("webauthn_credentials");
            b.HasKey(c => c.Id);
            b.Property(c => c.CredentialId).IsRequired().HasMaxLength(512);
            b.HasIndex(c => c.CredentialId).IsUnique();
            b.Property(c => c.PublicKey).IsRequired();
            b.Property(c => c.SignCount).IsRequired();
            b.Property(c => c.AaGuid).IsRequired();
            b.Property(c => c.CredType).HasMaxLength(32);
            b.Property(c => c.Transports).HasMaxLength(64);
            b.Property(c => c.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasOne(c => c.User)
                .WithMany(u => u.WebAuthnCredentials)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
