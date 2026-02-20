using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/platform/owner")]
[Authorize(Policy = Policies.PlatformOwner)]
public class PlatformOwnerModulesController : ControllerBase
{
    private readonly AppDbContext _db;

    public PlatformOwnerModulesController(AppDbContext db)
    {
        _db = db;
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
            .Where(x => x.Key.StartsWith("platform.api.", StringComparison.OrdinalIgnoreCase))
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

    [HttpGet("config")]
    public async Task<IActionResult> Config(CancellationToken ct)
    {
        var map = await _db.PlatformBrandingSettings.AsNoTracking()
            .Where(x => x.Key.StartsWith("platform.config.", StringComparison.OrdinalIgnoreCase))
            .ToDictionaryAsync(x => x.Key, x => x.Value, ct);
        return Ok(new
        {
            paymentGatewayProvider = map.GetValueOrDefault("platform.config.payment_gateway_provider", "default"),
            taxGstPercent = map.GetValueOrDefault("platform.config.tax_gst_percent", "18"),
            featureFlagsJson = map.GetValueOrDefault("platform.config.feature_flags_json", "{}"),
            limitsJson = map.GetValueOrDefault("platform.config.limits_json", "{}"),
            communicationProvider = map.GetValueOrDefault("platform.config.communication_provider", "smtp"),
            regionRulesJson = map.GetValueOrDefault("platform.config.region_rules_json", "{}")
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
            ["platform.config.region_rules_json"] = req.RegionRulesJson.Trim()
        };
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
}
