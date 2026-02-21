using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using backend_dotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http.Extensions;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/platform/owner")]
[Authorize(Policy = Policies.PlatformOwner)]
public class PlatformOwnerModulesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly ICloudflareDnsService _cloudflareDns;
    private readonly ISslProviderFactory _sslProviders;
    private readonly IOriginTlsService _originTls;

    public PlatformOwnerModulesController(AppDbContext db, IConfiguration config, ICloudflareDnsService cloudflareDns, ISslProviderFactory sslProviders, IOriginTlsService originTls)
    {
        _db = db;
        _config = config;
        _cloudflareDns = cloudflareDns;
        _sslProviders = sslProviders;
        _originTls = originTls;
    }

    [HttpGet("payments")]
    public async Task<IActionResult> Payments(CancellationToken ct)
    {
        var paid = (int)PaymentStatus.Paid;
        var refunded = (int)PaymentStatus.Refunded;
        var pending = (int)PaymentStatus.Pending;

        var totalTransactions = await _db.Orders.CountAsync(ct);
        var paidTransactions = await _db.Orders.CountAsync(x => (int)x.PaymentStatus == paid, ct);
        var pendingTransactions = await _db.Orders.CountAsync(x => (int)x.PaymentStatus == pending, ct);
        var refundedTransactions = await _db.Orders.CountAsync(x => (int)x.PaymentStatus == refunded, ct);
        var grossVolume = await _db.Orders.Where(x => (int)x.PaymentStatus == paid).SumAsync(x => (decimal?)x.Total, ct) ?? 0m;

        var recent = await _db.Orders.AsNoTracking()
            .Include(x => x.Store)
            .ThenInclude(s => s.Merchant)
            .OrderByDescending(x => x.CreatedAt)
            .Take(20)
            .Select(x => new
            {
                x.Id,
                x.CreatedAt,
                x.Total,
                x.Currency,
                PaymentStatus = x.PaymentStatus.ToString(),
                StoreName = x.Store.Name,
                MerchantName = x.Store.Merchant.Name
            })
            .ToListAsync(ct);

        return Ok(new
        {
            totalTransactions,
            paidTransactions,
            pendingTransactions,
            refundedTransactions,
            grossVolume,
            paymentSuccessRate = totalTransactions == 0 ? 0 : Math.Round((double)paidTransactions / totalTransactions * 100, 2),
            recent
        });
    }

    [HttpGet("billing")]
    public async Task<IActionResult> Billing(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var plans = await _db.BillingPlans.AsNoTracking()
            .OrderBy(x => x.PricePerMonth)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Code,
                x.PricePerMonth,
                x.IsActive,
                x.TrialDays,
                x.MaxStores,
                x.MaxProducts
            })
            .ToListAsync(ct);

        var subscriptions = await _db.MerchantSubscriptions.AsNoTracking()
            .Include(x => x.Merchant)
            .Include(x => x.Plan)
            .OrderByDescending(x => x.StartedAt)
            .Take(100)
            .ToListAsync(ct);

        var totalSubscriptions = await _db.MerchantSubscriptions.CountAsync(ct);
        var activeSubscriptions = await _db.MerchantSubscriptions.CountAsync(x => !x.IsCancelled && (!x.ExpiresAt.HasValue || x.ExpiresAt.Value > now), ct);
        var trialSubscriptions = await _db.MerchantSubscriptions.CountAsync(x => x.TrialEndsAt.HasValue && x.TrialEndsAt.Value >= now, ct);
        var cancelledSubscriptions = await _db.MerchantSubscriptions.CountAsync(x => x.IsCancelled, ct);

        return Ok(new
        {
            totalSubscriptions,
            activeSubscriptions,
            trialSubscriptions,
            cancelledSubscriptions,
            plans,
            recentSubscriptions = subscriptions.Select(x => new
            {
                x.Id,
                MerchantName = x.Merchant.Name,
                PlanName = x.Plan.Name,
                x.StartedAt,
                x.TrialEndsAt,
                x.ExpiresAt,
                x.IsCancelled
            })
        });
    }

    [HttpGet("plugins")]
    public async Task<IActionResult> Plugins(CancellationToken ct)
    {
        var themesTotal = await _db.ThemeCatalogItems.CountAsync(ct);
        var themesActive = await _db.ThemeCatalogItems.CountAsync(x => x.IsActive, ct);
        var themesFeatured = await _db.ThemeCatalogItems.CountAsync(x => x.IsFeatured, ct);
        var paidThemes = await _db.ThemeCatalogItems.CountAsync(x => x.IsPaid, ct);
        var campaignTemplatesTotal = await _db.CampaignTemplateCatalogItems.CountAsync(ct);
        var campaignTemplatesActive = await _db.CampaignTemplateCatalogItems.CountAsync(x => x.IsActive, ct);
        var campaignEvents = await _db.CampaignPaymentEvents.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(20)
            .Select(x => new
            {
                x.Id,
                x.EventType,
                x.Gateway,
                x.Status,
                x.Amount,
                x.Currency,
                x.CreatedAt
            })
            .ToListAsync(ct);

        var settings = await _db.PlatformBrandingSettings.AsNoTracking()
            .Where(x => x.Key == "platform.plugins.kill_switch")
            .ToListAsync(ct);
        var killSwitch = string.Equals(settings.FirstOrDefault()?.Value, "true", StringComparison.OrdinalIgnoreCase);

        return Ok(new
        {
            themesTotal,
            themesActive,
            themesFeatured,
            paidThemes,
            campaignTemplatesTotal,
            campaignTemplatesActive,
            killSwitch,
            campaignEvents
        });
    }

    [HttpPut("plugins/kill-switch")]
    public async Task<IActionResult> UpdatePluginsKillSwitch([FromBody] PlatformPluginsKillSwitchRequest req, CancellationToken ct)
    {
        var kv = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["platform.plugins.kill_switch"] = req.Enabled ? "true" : "false"
        };
        await UpsertSettingsAsync(kv, ct);
        return Ok(new { saved = true, enabled = req.Enabled });
    }

    [HttpGet("api-integrations")]
    public async Task<IActionResult> ApiIntegrations(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var activeTokens = await _db.AccessTokens.CountAsync(x => !x.RevokedAt.HasValue && x.ExpiresAt > now, ct);
        var revokedTokens = await _db.AccessTokens.CountAsync(x => x.RevokedAt.HasValue, ct);
        var failedLogins24h = await _db.LoginAttempts.CountAsync(x => !x.Success && x.CreatedAt >= now.AddHours(-24), ct);
        var topIps = await _db.LoginAttempts.AsNoTracking()
            .Where(x => x.CreatedAt >= now.AddHours(-24) && x.ClientIp != null)
            .GroupBy(x => x.ClientIp)
            .Select(g => new { clientIp = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(10)
            .ToListAsync(ct);

        var map = await _db.PlatformBrandingSettings.AsNoTracking()
            .Where(x => EF.Functions.ILike(x.Key, "platform.api.%"))
            .ToDictionaryAsync(x => x.Key, x => x.Value, ct);

        return Ok(new
        {
            activeTokens,
            revokedTokens,
            failedLogins24h,
            topIps,
            config = new
            {
                globalDisable = map.GetValueOrDefault("platform.api.global_disable", "false"),
                defaultRateLimitRpm = map.GetValueOrDefault("platform.api.default_rate_limit_rpm", "120"),
                versionPolicy = map.GetValueOrDefault("platform.api.version_policy", "v1")
            }
        });
    }

    [HttpPut("api-integrations/config")]
    public async Task<IActionResult> UpdateApiIntegrationsConfig([FromBody] PlatformApiConfigRequest req, CancellationToken ct)
    {
        var kv = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["platform.api.global_disable"] = req.GlobalDisable.Trim().ToLowerInvariant(),
            ["platform.api.default_rate_limit_rpm"] = req.DefaultRateLimitRpm.Trim(),
            ["platform.api.version_policy"] = req.VersionPolicy.Trim()
        };
        await UpsertSettingsAsync(kv, ct);
        return Ok(new { saved = true });
    }

    [HttpGet("risk")]
    public async Task<IActionResult> Risk(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var suspendedMerchants = await _db.Merchants.CountAsync(x => x.Status == MerchantStatus.Suspended, ct);
        var expiredMerchants = await _db.Merchants.CountAsync(x => x.Status == MerchantStatus.Expired, ct);
        var failedLogins24h = await _db.LoginAttempts.CountAsync(x => !x.Success && x.CreatedAt >= now.AddHours(-24), ct);
        var pendingApprovals = await _db.SensitiveActionApprovals.CountAsync(x => x.Status == "pending", ct);
        var highValueTx24h = await _db.Orders.CountAsync(x => x.CreatedAt >= now.AddHours(-24) && x.Total >= 50000, ct);

        var alerts = new List<object>();
        if (failedLogins24h > 10) alerts.Add(new { severity = "high", message = $"High failed login volume in last 24h ({failedLogins24h})." });
        if (pendingApprovals > 0) alerts.Add(new { severity = "medium", message = $"Pending sensitive approvals: {pendingApprovals}." });
        if (suspendedMerchants > 0) alerts.Add(new { severity = "medium", message = $"Suspended merchants currently: {suspendedMerchants}." });
        if (highValueTx24h > 0) alerts.Add(new { severity = "low", message = $"High-value transactions in last 24h: {highValueTx24h}." });

        return Ok(new
        {
            suspendedMerchants,
            expiredMerchants,
            failedLogins24h,
            pendingApprovals,
            highValueTx24h,
            alerts
        });
    }

    [HttpGet("reports")]
    public async Task<IActionResult> Reports(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var from = now.AddMonths(-5);

        var paidByMonth = await _db.Orders.AsNoTracking()
            .Where(x => x.CreatedAt >= from && x.PaymentStatus == PaymentStatus.Paid)
            .GroupBy(x => new { x.CreatedAt.Year, x.CreatedAt.Month })
            .Select(g => new
            {
                key = $"{g.Key.Year:D4}-{g.Key.Month:D2}",
                revenue = g.Sum(x => x.Total),
                transactions = g.Count()
            })
            .OrderBy(x => x.key)
            .ToListAsync(ct);

        var merchantsByMonth = await _db.Merchants.AsNoTracking()
            .Where(x => x.CreatedAt >= from)
            .GroupBy(x => new { x.CreatedAt.Year, x.CreatedAt.Month })
            .Select(g => new { key = $"{g.Key.Year:D4}-{g.Key.Month:D2}", count = g.Count() })
            .OrderBy(x => x.key)
            .ToListAsync(ct);

        var securityEventsByMonth = await _db.AuditLogs.AsNoTracking()
            .Where(x => x.CreatedAt >= from && (x.Action.Contains("security") || x.Action.Contains("merchant.lifecycle")))
            .GroupBy(x => new { x.CreatedAt.Year, x.CreatedAt.Month })
            .Select(g => new { key = $"{g.Key.Year:D4}-{g.Key.Month:D2}", count = g.Count() })
            .OrderBy(x => x.key)
            .ToListAsync(ct);

        return Ok(new
        {
            paidByMonth,
            merchantsByMonth,
            securityEventsByMonth
        });
    }

    [HttpGet("domains")]
    public async Task<IActionResult> Domains(CancellationToken ct)
    {
        var customDomains = await _db.StoreDomains.AsNoTracking()
            .Include(x => x.Store)
            .ThenInclude(s => s.Merchant)
            .OrderByDescending(x => x.CreatedAt)
            .Take(500)
            .Select(x => new
            {
                x.Id,
                x.StoreId,
                StoreName = x.Store.Name,
                MerchantName = x.Store.Merchant.Name,
                x.Hostname,
                x.IsVerified,
                x.DnsManagedByCloudflare,
                x.DnsStatus,
                x.SslPurchased,
                x.SslProvider,
                x.SslStatus,
                x.SslPurchaseReference,
                x.SslPurchasedAt,
                x.SslExpiresAt,
                x.LastError,
                x.CreatedAt
            })
            .ToListAsync(ct);

        var subdomains = await _db.Stores.AsNoTracking()
            .Include(x => x.Merchant)
            .OrderByDescending(x => x.CreatedAt)
            .Take(500)
            .Select(x => new
            {
                x.Id,
                x.Name,
                MerchantName = x.Merchant.Name,
                x.Subdomain,
                x.CreatedAt
            })
            .ToListAsync(ct);

        var cfg = await _db.PlatformBrandingSettings.AsNoTracking()
            .Where(x => EF.Functions.ILike(x.Key, "platform.domains.%"))
            .ToDictionaryAsync(x => x.Key, x => x.Value, ct);

        var cloudflareApiToken = cfg.GetValueOrDefault("platform.domains.cloudflare.api_token", string.Empty);
        var cloudflareZoneId = cfg.GetValueOrDefault("platform.domains.cloudflare.zone_id", _config["CLOUDFLARE_ZONE_ID"] ?? string.Empty);
        var platformBaseDomain = cfg.GetValueOrDefault("platform.domains.platform_base_domain", _config["PLATFORM_BASE_DOMAIN"] ?? string.Empty);
        var platformIngressHost = cfg.GetValueOrDefault("platform.domains.platform_ingress_host", _config["PLATFORM_INGRESS_HOST"] ?? string.Empty);
        var sslIssuerCommand = cfg.GetValueOrDefault("platform.domains.ssl.issuer_command", _config["SSL_ISSUER_COMMAND"] ?? string.Empty);
        var sslContactEmail = cfg.GetValueOrDefault("platform.domains.ssl.contact_email", _config["SSL_CONTACT_EMAIL"] ?? string.Empty);
        var requireMarketplacePurchase = cfg.GetValueOrDefault("platform.domains.ssl.require_marketplace_purchase", (_config.GetValue("SSL_REQUIRE_MARKETPLACE_PURCHASE", true)).ToString().ToLowerInvariant());
        var sslPriceInr = cfg.GetValueOrDefault("platform.domains.ssl.price_inr", _config["SSL_PRICE_INR"] ?? "999");

        return Ok(new
        {
            summary = new
            {
                totalSubdomains = subdomains.Count(x => !string.IsNullOrWhiteSpace(x.Subdomain)),
                totalCustomDomains = customDomains.Count,
                verifiedCustomDomains = customDomains.Count(x => x.IsVerified),
                activeSslCustomDomains = customDomains.Count(x => string.Equals(x.SslStatus, "active", StringComparison.OrdinalIgnoreCase)),
                pendingSslCustomDomains = customDomains.Count(x => string.Equals(x.SslStatus, "pending", StringComparison.OrdinalIgnoreCase) || string.Equals(x.SslStatus, "issuing", StringComparison.OrdinalIgnoreCase)),
                failedSslCustomDomains = customDomains.Count(x => string.Equals(x.SslStatus, "failed", StringComparison.OrdinalIgnoreCase)),
                paymentRequiredSslCustomDomains = customDomains.Count(x => string.Equals(x.SslStatus, "payment_required", StringComparison.OrdinalIgnoreCase))
            },
            subdomainPolicy = "Requested subdomain is normalized and auto-uniqued. If taken, numeric suffix is appended (example: demo, demo1, demo2).",
            subdomains,
            customDomains,
            config = new
            {
                cloudflareApiTokenMasked = string.IsNullOrWhiteSpace(cloudflareApiToken) ? "" : $"***{cloudflareApiToken[^Math.Min(4, cloudflareApiToken.Length)..]}",
                cloudflareZoneId,
                platformBaseDomain,
                platformIngressHost,
                sslIssuerCommand,
                sslContactEmail,
                sslPriceInr,
                sslRequireMarketplacePurchase = requireMarketplacePurchase,
                acmeClient = cfg.GetValueOrDefault("platform.domains.acme.client", _config["ACME_CLIENT"] ?? "certbot"),
                acmeChallengeMethod = cfg.GetValueOrDefault("platform.domains.acme.challenge_method", _config["ACME_CHALLENGE_METHOD"] ?? "dns-01"),
                acmeDirectoryUrl = cfg.GetValueOrDefault("platform.domains.acme.directory_url", _config["ACME_DIRECTORY_URL"] ?? "https://acme-v02.api.letsencrypt.org/directory"),
                originTlsMode = cfg.GetValueOrDefault("platform.domains.origin_tls.mode", _config["ORIGIN_TLS_MODE"] ?? "cloudflare_origin_ca"),
                originTlsIssuerCommand = cfg.GetValueOrDefault("platform.domains.origin_tls.issuer_command", _config["ORIGIN_TLS_ISSUER_COMMAND"] ?? string.Empty),
                originTlsCertPath = cfg.GetValueOrDefault("platform.domains.origin_tls.cert_path", _config["ORIGIN_TLS_CERT_PATH"] ?? string.Empty),
                originTlsKeyPath = cfg.GetValueOrDefault("platform.domains.origin_tls.key_path", _config["ORIGIN_TLS_KEY_PATH"] ?? string.Empty),
                cloudflareOauthAuthorizeUrl = cfg.GetValueOrDefault("platform.domains.cloudflare.oauth.authorize_url", _config["CLOUDFLARE_OAUTH_AUTHORIZE_URL"] ?? "https://dash.cloudflare.com/oauth2/auth"),
                cloudflareOauthTokenUrl = cfg.GetValueOrDefault("platform.domains.cloudflare.oauth.token_url", _config["CLOUDFLARE_OAUTH_TOKEN_URL"] ?? "https://dash.cloudflare.com/oauth2/token"),
                cloudflareOauthClientId = cfg.GetValueOrDefault("platform.domains.cloudflare.oauth.client_id", _config["CLOUDFLARE_OAUTH_CLIENT_ID"] ?? string.Empty),
                cloudflareOauthClientSecret = string.Empty,
                cloudflareOauthRedirectUri = cfg.GetValueOrDefault("platform.domains.cloudflare.oauth.redirect_uri", _config["CLOUDFLARE_OAUTH_REDIRECT_URI"] ?? ResolveOAuthRedirectUri()),
                cloudflareOauthScope = cfg.GetValueOrDefault("platform.domains.cloudflare.oauth.scope", _config["CLOUDFLARE_OAUTH_SCOPE"] ?? "zone:read dns_records:edit"),
                cloudflareOauthPostConnectRedirect = cfg.GetValueOrDefault("platform.domains.cloudflare.oauth.post_connect_redirect", _config["CLOUDFLARE_OAUTH_POST_CONNECT_REDIRECT"] ?? "/admin/platform-domains"),
                runtime = new
                {
                    cloudflareConfigured = !string.IsNullOrWhiteSpace(cloudflareApiToken) && !string.IsNullOrWhiteSpace(cloudflareZoneId) && !string.IsNullOrWhiteSpace(platformBaseDomain) && !string.IsNullOrWhiteSpace(platformIngressHost),
                    letsEncryptConfigured = !string.IsNullOrWhiteSpace(sslIssuerCommand) && !string.IsNullOrWhiteSpace(sslContactEmail)
                }
            }
        });
    }

    [HttpGet("domains/cloudflare-zones")]
    public async Task<IActionResult> GetCloudflareZones(CancellationToken ct)
    {
        var result = await _cloudflareDns.ListZonesAsync(ct);
        if (!result.Success)
        {
            return BadRequest(new { error = result.Error ?? "cloudflare_zones_failed" });
        }
        return Ok(new { zones = result.Zones });
    }

    [HttpGet("domains/cloudflare-oauth/start")]
    public async Task<IActionResult> StartCloudflareOAuth(CancellationToken ct)
    {
        var settings = await _db.PlatformBrandingSettings.AsNoTracking()
            .Where(x => EF.Functions.ILike(x.Key, "platform.domains.cloudflare.oauth.%"))
            .ToDictionaryAsync(x => x.Key, x => x.Value, ct);

        var authorizeUrl = settings.GetValueOrDefault("platform.domains.cloudflare.oauth.authorize_url", _config["CLOUDFLARE_OAUTH_AUTHORIZE_URL"] ?? "https://dash.cloudflare.com/oauth2/auth");
        var clientId = settings.GetValueOrDefault("platform.domains.cloudflare.oauth.client_id", _config["CLOUDFLARE_OAUTH_CLIENT_ID"] ?? string.Empty);
        var redirectUri = settings.GetValueOrDefault("platform.domains.cloudflare.oauth.redirect_uri", _config["CLOUDFLARE_OAUTH_REDIRECT_URI"] ?? ResolveOAuthRedirectUri());
        var scope = settings.GetValueOrDefault("platform.domains.cloudflare.oauth.scope", _config["CLOUDFLARE_OAUTH_SCOPE"] ?? "zone:read dns_records:edit");

        if (string.IsNullOrWhiteSpace(authorizeUrl) || string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(redirectUri))
        {
            return BadRequest(new { error = "cloudflare_oauth_not_configured" });
        }

        var state = Convert.ToBase64String(Guid.NewGuid().ToByteArray())
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');

        await UpsertSettingsAsync(new Dictionary<string, string>
        {
            ["platform.domains.cloudflare.oauth.pending_state"] = state,
            ["platform.domains.cloudflare.oauth.pending_state_at"] = DateTimeOffset.UtcNow.ToString("O")
        }, ct);

        var url = $"{authorizeUrl}?response_type=code&client_id={Uri.EscapeDataString(clientId)}&redirect_uri={Uri.EscapeDataString(redirectUri)}&scope={Uri.EscapeDataString(scope)}&state={Uri.EscapeDataString(state)}";
        return Ok(new { url });
    }

    [AllowAnonymous]
    [HttpGet("domains/cloudflare-oauth/callback")]
    public async Task<IActionResult> CompleteCloudflareOAuth([FromQuery] string? code, [FromQuery] string? state, CancellationToken ct)
    {
        var settings = await _db.PlatformBrandingSettings.AsNoTracking()
            .Where(x => EF.Functions.ILike(x.Key, "platform.domains.cloudflare.oauth.%"))
            .ToDictionaryAsync(x => x.Key, x => x.Value, ct);
        var pendingState = settings.GetValueOrDefault("platform.domains.cloudflare.oauth.pending_state", string.Empty);
        var tokenUrl = settings.GetValueOrDefault("platform.domains.cloudflare.oauth.token_url", _config["CLOUDFLARE_OAUTH_TOKEN_URL"] ?? "https://dash.cloudflare.com/oauth2/token");
        var clientId = settings.GetValueOrDefault("platform.domains.cloudflare.oauth.client_id", _config["CLOUDFLARE_OAUTH_CLIENT_ID"] ?? string.Empty);
        var clientSecret = settings.GetValueOrDefault("platform.domains.cloudflare.oauth.client_secret", _config["CLOUDFLARE_OAUTH_CLIENT_SECRET"] ?? string.Empty);
        var redirectUri = settings.GetValueOrDefault("platform.domains.cloudflare.oauth.redirect_uri", _config["CLOUDFLARE_OAUTH_REDIRECT_URI"] ?? ResolveOAuthRedirectUri());
        var postConnectRedirect = settings.GetValueOrDefault("platform.domains.cloudflare.oauth.post_connect_redirect", _config["CLOUDFLARE_OAUTH_POST_CONNECT_REDIRECT"] ?? "/admin/platform-domains");

        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state) || !string.Equals(state, pendingState, StringComparison.Ordinal))
        {
            return Redirect($"{postConnectRedirect}?cf_connect=failed&reason=state_or_code_invalid");
        }
        if (string.IsNullOrWhiteSpace(tokenUrl) || string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret) || string.IsNullOrWhiteSpace(redirectUri))
        {
            return Redirect($"{postConnectRedirect}?cf_connect=failed&reason=oauth_config_missing");
        }

        try
        {
            using var http = new HttpClient();
            var form = new Dictionary<string, string>
            {
                ["grant_type"] = "authorization_code",
                ["code"] = code,
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["redirect_uri"] = redirectUri
            };
            var resp = await http.PostAsync(tokenUrl, new FormUrlEncodedContent(form), ct);
            if (!resp.IsSuccessStatusCode)
            {
                return Redirect($"{postConnectRedirect}?cf_connect=failed&reason=token_exchange_failed");
            }

            var body = await resp.Content.ReadAsStringAsync(ct);
            using var doc = System.Text.Json.JsonDocument.Parse(body);
            var accessToken = doc.RootElement.TryGetProperty("access_token", out var node) ? node.GetString() : null;
            if (string.IsNullOrWhiteSpace(accessToken))
            {
                return Redirect($"{postConnectRedirect}?cf_connect=failed&reason=token_missing");
            }

            await UpsertSettingsAsync(new Dictionary<string, string>
            {
                ["platform.domains.cloudflare.api_token"] = accessToken.Trim(),
                ["platform.domains.cloudflare.oauth.pending_state"] = string.Empty,
                ["platform.domains.cloudflare.oauth.connected_at"] = DateTimeOffset.UtcNow.ToString("O")
            }, ct);

            return Redirect($"{postConnectRedirect}?cf_connect=ok");
        }
        catch
        {
            return Redirect($"{postConnectRedirect}?cf_connect=failed&reason=exception");
        }
    }

    [HttpPost("domains/test-cloudflare")]
    public async Task<IActionResult> TestCloudflare([FromBody] CloudflareTestRequest req, CancellationToken ct)
    {
        var overrideToken = string.IsNullOrWhiteSpace(req.ApiToken) ? null : req.ApiToken.Trim();
        var connectivity = await _cloudflareDns.TestConnectivityAsync(ct, overrideToken);
        if (!connectivity.Success)
        {
            return BadRequest(new { success = false, message = connectivity.Error });
        }
        var zones = await _cloudflareDns.ListZonesAsync(ct, overrideToken);
        return Ok(new
        {
            success = true,
            message = "Cloudflare token is valid.",
            zonesCount = zones.Zones.Count,
            zones = zones.Zones
        });
    }

    [HttpPost("domains/test-ssl")]
    public async Task<IActionResult> TestSslProvider([FromBody] SslProviderTestRequest req, CancellationToken ct)
    {
        var providerName = string.IsNullOrWhiteSpace(req.Provider) ? "letsencrypt" : req.Provider.Trim().ToLowerInvariant();
        var provider = _sslProviders.Resolve(providerName);
        if (provider == null)
        {
            return BadRequest(new { success = false, message = "ssl_provider_not_supported", provider = providerName });
        }

        var health = await provider.HealthCheckAsync(ct);
        return Ok(new
        {
            success = health.Configured && health.ExecutableFound,
            provider = provider.Name,
            health.Configured,
            health.ExecutableFound,
            health.Executable,
            health.Message
        });
    }

    [HttpGet("domains/origin-tls/status")]
    public async Task<IActionResult> OriginTlsStatus(CancellationToken ct)
    {
        var status = await _originTls.GetStatusAsync(ct);
        return Ok(new
        {
            status.Configured,
            status.CertFileExists,
            status.KeyFileExists,
            status.ExpiresAt,
            status.DaysRemaining,
            status.Message
        });
    }

    [HttpPost("domains/origin-tls/issue")]
    public async Task<IActionResult> OriginTlsIssue(CancellationToken ct)
    {
        var result = await _originTls.IssueOrRenewAsync(ct);
        if (!result.Success)
        {
            return BadRequest(new { success = false, message = result.Message ?? "origin_tls_issue_failed" });
        }
        var status = await _originTls.GetStatusAsync(ct);
        return Ok(new
        {
            success = true,
            message = result.Message,
            status = new
            {
                status.Configured,
                status.CertFileExists,
                status.KeyFileExists,
                status.ExpiresAt,
                status.DaysRemaining
            }
        });
    }

    [HttpPut("domains/config")]
    public async Task<IActionResult> UpdateDomainsConfig([FromBody] PlatformDomainsConfigRequest req, CancellationToken ct)
    {
        var oauthAuthorizeUrl = string.IsNullOrWhiteSpace(req.CloudflareOauthAuthorizeUrl) ? "https://dash.cloudflare.com/oauth2/auth" : req.CloudflareOauthAuthorizeUrl.Trim();
        var oauthTokenUrl = string.IsNullOrWhiteSpace(req.CloudflareOauthTokenUrl) ? "https://dash.cloudflare.com/oauth2/token" : req.CloudflareOauthTokenUrl.Trim();
        var oauthRedirectUri = string.IsNullOrWhiteSpace(req.CloudflareOauthRedirectUri) ? ResolveOAuthRedirectUri() : req.CloudflareOauthRedirectUri.Trim();

        var kv = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["platform.domains.cloudflare.zone_id"] = req.CloudflareZoneId.Trim(),
            ["platform.domains.platform_base_domain"] = req.PlatformBaseDomain.Trim().ToLowerInvariant(),
            ["platform.domains.platform_ingress_host"] = req.PlatformIngressHost.Trim().ToLowerInvariant(),
            ["platform.domains.ssl.issuer_command"] = req.SslIssuerCommand.Trim(),
            ["platform.domains.ssl.contact_email"] = req.SslContactEmail.Trim(),
            ["platform.domains.ssl.price_inr"] = req.SslPriceInr.Trim(),
            ["platform.domains.ssl.require_marketplace_purchase"] = req.SslRequireMarketplacePurchase.Trim().ToLowerInvariant(),
            ["platform.domains.acme.client"] = req.AcmeClient.Trim().ToLowerInvariant(),
            ["platform.domains.acme.challenge_method"] = req.AcmeChallengeMethod.Trim().ToLowerInvariant(),
            ["platform.domains.acme.directory_url"] = req.AcmeDirectoryUrl.Trim(),
            ["platform.domains.origin_tls.mode"] = req.OriginTlsMode.Trim().ToLowerInvariant(),
            ["platform.domains.origin_tls.issuer_command"] = req.OriginTlsIssuerCommand.Trim(),
            ["platform.domains.origin_tls.cert_path"] = req.OriginTlsCertPath.Trim(),
            ["platform.domains.origin_tls.key_path"] = req.OriginTlsKeyPath.Trim(),
            ["platform.domains.cloudflare.oauth.authorize_url"] = oauthAuthorizeUrl,
            ["platform.domains.cloudflare.oauth.token_url"] = oauthTokenUrl,
            ["platform.domains.cloudflare.oauth.client_id"] = req.CloudflareOauthClientId.Trim(),
            ["platform.domains.cloudflare.oauth.redirect_uri"] = oauthRedirectUri,
            ["platform.domains.cloudflare.oauth.scope"] = req.CloudflareOauthScope.Trim(),
            ["platform.domains.cloudflare.oauth.post_connect_redirect"] = req.CloudflareOauthPostConnectRedirect.Trim()
        };
        if (!string.IsNullOrWhiteSpace(req.CloudflareOauthClientSecret))
        {
            kv["platform.domains.cloudflare.oauth.client_secret"] = req.CloudflareOauthClientSecret.Trim();
        }
        if (!string.IsNullOrWhiteSpace(req.CloudflareApiToken))
        {
            kv["platform.domains.cloudflare.api_token"] = req.CloudflareApiToken.Trim();
        }

        foreach (var pair in kv)
        {
            if (pair.Value.Length > 4000) return BadRequest(new { error = "config_value_too_long", key = pair.Key });
        }

        await UpsertSettingsAsync(kv, ct);
        return Ok(new { saved = true });
    }

    [HttpGet("config")]
    public async Task<IActionResult> Config(CancellationToken ct)
    {
        var map = await _db.PlatformBrandingSettings.AsNoTracking()
            .Where(x => EF.Functions.ILike(x.Key, "platform.config.%"))
            .ToDictionaryAsync(x => x.Key, x => x.Value, ct);
        return Ok(new
        {
            paymentGatewayProvider = map.GetValueOrDefault("platform.config.payment_gateway_provider", "default"),
            taxGstPercent = map.GetValueOrDefault("platform.config.tax_gst_percent", "18"),
            featureFlagsJson = map.GetValueOrDefault("platform.config.feature_flags_json", "{}"),
            limitsJson = map.GetValueOrDefault("platform.config.limits_json", "{}"),
            communicationProvider = map.GetValueOrDefault("platform.config.communication_provider", "smtp"),
            regionRulesJson = map.GetValueOrDefault("platform.config.region_rules_json", "{}"),
            corsOriginsCsv = map.GetValueOrDefault("platform.config.cors_origins_csv", _config["CORS_ORIGINS"] ?? "*")
        });
    }

    [HttpPut("config")]
    public async Task<IActionResult> UpdateConfig([FromBody] PlatformConfigRequest req, CancellationToken ct)
    {
        var kv = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["platform.config.payment_gateway_provider"] = req.PaymentGatewayProvider.Trim(),
            ["platform.config.tax_gst_percent"] = req.TaxGstPercent.Trim(),
            ["platform.config.feature_flags_json"] = req.FeatureFlagsJson.Trim(),
            ["platform.config.limits_json"] = req.LimitsJson.Trim(),
            ["platform.config.communication_provider"] = req.CommunicationProvider.Trim(),
            ["platform.config.region_rules_json"] = req.RegionRulesJson.Trim(),
            ["platform.config.cors_origins_csv"] = req.CorsOriginsCsv.Trim()
        };
        kv["platform.security.cors.origins"] = req.CorsOriginsCsv.Trim();
        foreach (var pair in kv)
        {
            if (pair.Value.Length > 4000) return BadRequest(new { error = "config_value_too_long", key = pair.Key });
        }
        await UpsertSettingsAsync(kv, ct);
        return Ok(new { saved = true });
    }

    private async Task UpsertSettingsAsync(Dictionary<string, string> kv, CancellationToken ct)
    {
        var rows = await _db.PlatformBrandingSettings.Where(x => kv.Keys.Contains(x.Key)).ToListAsync(ct);
        foreach (var pair in kv)
        {
            var row = rows.FirstOrDefault(x => x.Key == pair.Key);
            if (row == null)
            {
                _db.PlatformBrandingSettings.Add(new PlatformBrandingSetting
                {
                    Key = pair.Key,
                    Value = pair.Value,
                    UpdatedAt = DateTimeOffset.UtcNow
                });
            }
            else
            {
                row.Value = pair.Value;
                row.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }
        await _db.SaveChangesAsync(ct);
    }

    private string ResolveOAuthRedirectUri()
    {
        var requestUrl = HttpContext?.Request?.GetDisplayUrl();
        if (string.IsNullOrWhiteSpace(requestUrl))
        {
            return string.Empty;
        }
        try
        {
            var uri = new Uri(requestUrl);
            return $"{uri.Scheme}://{uri.Authority}/api/platform/owner/domains/cloudflare-oauth/callback";
        }
        catch
        {
            return string.Empty;
        }
    }
}

public class PlatformApiConfigRequest
{
    public string GlobalDisable { get; set; } = "false";
    public string DefaultRateLimitRpm { get; set; } = "120";
    public string VersionPolicy { get; set; } = "v1";
}

public class PlatformPluginsKillSwitchRequest
{
    public bool Enabled { get; set; }
}

public class PlatformConfigRequest
{
    public string PaymentGatewayProvider { get; set; } = "default";
    public string TaxGstPercent { get; set; } = "18";
    public string FeatureFlagsJson { get; set; } = "{}";
    public string LimitsJson { get; set; } = "{}";
    public string CommunicationProvider { get; set; } = "smtp";
    public string RegionRulesJson { get; set; } = "{}";
    public string CorsOriginsCsv { get; set; } = "*";
}

public class PlatformDomainsConfigRequest
{
    public string CloudflareApiToken { get; set; } = string.Empty;
    public string CloudflareZoneId { get; set; } = string.Empty;
    public string PlatformBaseDomain { get; set; } = string.Empty;
    public string PlatformIngressHost { get; set; } = string.Empty;
    public string SslIssuerCommand { get; set; } = string.Empty;
    public string SslContactEmail { get; set; } = string.Empty;
    public string SslPriceInr { get; set; } = "999";
    public string SslRequireMarketplacePurchase { get; set; } = "true";
    public string AcmeClient { get; set; } = "certbot";
    public string AcmeChallengeMethod { get; set; } = "dns-01";
    public string AcmeDirectoryUrl { get; set; } = "https://acme-v02.api.letsencrypt.org/directory";
    public string OriginTlsMode { get; set; } = "cloudflare_origin_ca";
    public string OriginTlsIssuerCommand { get; set; } = string.Empty;
    public string OriginTlsCertPath { get; set; } = string.Empty;
    public string OriginTlsKeyPath { get; set; } = string.Empty;
    public string CloudflareOauthAuthorizeUrl { get; set; } = string.Empty;
    public string CloudflareOauthTokenUrl { get; set; } = string.Empty;
    public string CloudflareOauthClientId { get; set; } = string.Empty;
    public string CloudflareOauthClientSecret { get; set; } = string.Empty;
    public string CloudflareOauthRedirectUri { get; set; } = string.Empty;
    public string CloudflareOauthScope { get; set; } = "zone:read dns_records:edit";
    public string CloudflareOauthPostConnectRedirect { get; set; } = "/admin/platform-domains";
}

public class CloudflareTestRequest
{
    public string ApiToken { get; set; } = string.Empty;
}

public class SslProviderTestRequest
{
    public string Provider { get; set; } = "letsencrypt";
}
