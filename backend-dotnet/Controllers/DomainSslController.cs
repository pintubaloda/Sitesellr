using System.ComponentModel.DataAnnotations;
using System.Net;
using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using backend_dotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/stores/{storeId:guid}/domains")]
public class DomainSslController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ISslProviderFactory _sslProviders;
    private readonly ICloudflareDnsService _cloudflareDns;
    private readonly IConfiguration _config;
    private readonly ILogger<DomainSslController> _logger;
    private TenancyContext? Tenancy => HttpContext.Items["Tenancy"] as TenancyContext;

    public DomainSslController(
        AppDbContext db,
        ISslProviderFactory sslProviders,
        ICloudflareDnsService cloudflareDns,
        IConfiguration config,
        ILogger<DomainSslController> logger)
    {
        _db = db;
        _sslProviders = sslProviders;
        _cloudflareDns = cloudflareDns;
        _config = config;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> List(Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var rows = await _db.StoreDomains.AsNoTracking()
            .Where(x => x.StoreId == storeId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
        var sslPriceInr = await GetSslPriceInrAsync(ct);
        var ingressHost = await GetIngressHostAsync(ct);
        return Ok(rows.Select(x => MapRow(x, sslPriceInr, ingressHost)));
    }

    [HttpPost]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> Add(Guid storeId, [FromBody] AddDomainRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();

        var storeExists = await _db.Stores.AsNoTracking().AnyAsync(x => x.Id == storeId, ct);
        if (!storeExists) return NotFound(new { error = "store_not_found" });

        var hostname = req.Hostname.Trim().ToLowerInvariant();

        // Reject wildcard or overly long hostnames
        if (hostname.StartsWith("*") || hostname.Length > 253)
            return BadRequest(new { error = "hostname_invalid" });

        var exists = await _db.StoreDomains.AsNoTracking().AnyAsync(x => x.Hostname == hostname, ct);
        if (exists) return Conflict(new { error = "domain_already_exists", message = $"'{hostname}' is already registered on this platform." });

        var token = GenerateVerificationToken();
        var sslPurchaseRequired = await IsSslMarketplacePurchaseRequiredAsync(ct);

        var row = new StoreDomain
        {
            StoreId = storeId,
            Hostname = hostname,
            VerificationToken = token,
            IsVerified = false,
            DnsManagedByCloudflare = false,
            DnsStatus = "pending",
            SslProvider = string.IsNullOrWhiteSpace(req.SslProvider) ? "letsencrypt" : req.SslProvider.Trim().ToLowerInvariant(),
            SslPurchased = !sslPurchaseRequired,
            SslStatus = sslPurchaseRequired ? "payment_required" : "pending",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.StoreDomains.Add(row);
        await _db.SaveChangesAsync(ct);

        // Attempt automatic Cloudflare DNS setup — never fail the whole request if this errors
        CustomDomainDnsResult? dns = null;
        try
        {
            dns = await _cloudflareDns.EnsureCustomDomainAsync(row.Hostname, row.VerificationToken, ct);
            row.DnsManagedByCloudflare = dns.ManagedByCloudflare;
            row.DnsStatus = dns.Success ? "configured" : "pending";
            // Only persist Cloudflare error if it is actionable — don't overwrite a previously set error
            if (!dns.Success && !string.IsNullOrWhiteSpace(dns.Error))
                row.LastError = dns.Error;
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cloudflare DNS setup failed for {Hostname} (non-fatal)", hostname);
        }

        // Attempt automatic verification + SSL issuance in background-style (non-fatal)
        AutoAttemptResult autoAttempt;
        try
        {
            autoAttempt = await TryAutoVerifyAndIssueAsync(row, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Auto verify/issue failed for {Hostname} (non-fatal)", hostname);
            autoAttempt = new AutoAttemptResult(false, false, row.DnsStatus, row.SslStatus, row.LastError);
        }

        var sslPriceInr = await GetSslPriceInrAsync(ct);
        var ingressHost = dns?.TargetHost ?? await GetIngressHostAsync(ct);

        return Ok(new
        {
            id = row.Id,
            hostname = row.Hostname,
            sslProvider = row.SslProvider,
            isVerified = row.IsVerified,
            dnsManagedByCloudflare = row.DnsManagedByCloudflare,
            dnsStatus = row.DnsStatus,
            sslPurchased = row.SslPurchased,
            sslStatus = row.SslStatus,
            lastError = row.LastError,
            sslPriceInr,
            verification = new
            {
                type = "TXT",
                host = $"_sitesellr-verify.{hostname}",
                value = token,
                note = "Add this TXT record to your DNS so we can confirm domain ownership."
            },
            mapping = new
            {
                type = "CNAME",
                host = hostname,
                target = ingressHost,
                note = "Add this CNAME so your domain points to our platform."
            },
            autoAttempt
        });
    }

    [HttpPost("{domainId:guid}/verify")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> MarkVerified(Guid storeId, Guid domainId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var row = await _db.StoreDomains.FirstOrDefaultAsync(x => x.Id == domainId && x.StoreId == storeId, ct);
        if (row == null) return NotFound(new { error = "domain_not_found" });

        CustomDomainDnsResult? dnsState = null;
        try
        {
            dnsState = await _cloudflareDns.CheckCustomDomainAsync(row.Hostname, row.VerificationToken, ct);
            row.DnsManagedByCloudflare = dnsState.ManagedByCloudflare;
            row.DnsStatus = dnsState.Success ? "configured" : "pending";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "CheckCustomDomain failed for {Hostname} (non-fatal)", row.Hostname);
        }

        // Fall back to raw DNS resolution if Cloudflare check is unavailable
        var verified = (dnsState?.Success == true) || await CheckDomainResolvableAsync(row.Hostname);
        row.IsVerified = verified;
        row.UpdatedAt = DateTimeOffset.UtcNow;

        if (verified)
        {
            row.LastError = null;
            if (row.SslPurchased && row.SslStatus != "active")
                await RunIssueAsync(row, ct);
            else if (!row.SslPurchased)
                row.SslStatus = "payment_required";
        }
        else
        {
            row.LastError = dnsState?.Error ?? "DNS records are not yet propagated. Please wait a few minutes and try again.";
        }

        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            verified = row.IsVerified,
            dnsStatus = row.DnsStatus,
            dnsManagedByCloudflare = row.DnsManagedByCloudflare,
            sslPurchased = row.SslPurchased,
            sslStatus = row.SslStatus,
            lastError = row.LastError,
            message = verified
                ? (row.SslPurchased ? "Domain verified. SSL issuance started." : "Domain verified. Purchase SSL to issue certificate.")
                : "Verification failed — DNS not yet propagated. Try again after a few minutes."
        });
    }

    [HttpPost("{domainId:guid}/purchase-ssl")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> PurchaseSsl(Guid storeId, Guid domainId, [FromBody] PurchaseSslRequest? req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var row = await _db.StoreDomains.FirstOrDefaultAsync(x => x.Id == domainId && x.StoreId == storeId, ct);
        if (row == null) return NotFound(new { error = "domain_not_found" });
        if (row.SslPurchased) return BadRequest(new { error = "ssl_already_purchased", message = "SSL has already been purchased for this domain." });

        req ??= new PurchaseSslRequest();
        row.SslPurchased = true;
        row.SslPurchasedAt = DateTimeOffset.UtcNow;
        row.SslPurchaseReference = string.IsNullOrWhiteSpace(req.PaymentReference)
            ? $"ssl_{Guid.NewGuid().ToString("N")[..16]}"
            : req.PaymentReference.Trim();
        row.SslStatus = row.IsVerified ? "pending" : "pending_verification";
        row.LastError = null;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        if (row.IsVerified)
            await RunIssueAsync(row, ct);

        var sslPriceInr = await GetSslPriceInrAsync(ct);
        return Ok(new
        {
            purchased = true,
            sslPurchased = row.SslPurchased,
            sslPurchaseReference = row.SslPurchaseReference,
            sslPurchasedAt = row.SslPurchasedAt,
            sslStatus = row.SslStatus,
            lastError = row.LastError,
            sslPriceInr,
            message = row.IsVerified
                ? "SSL purchased. Certificate issuance started automatically."
                : "SSL purchased. Verify your domain DNS to trigger certificate issuance."
        });
    }

    [HttpPost("{domainId:guid}/issue-ssl")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> IssueSsl(Guid storeId, Guid domainId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var row = await _db.StoreDomains.FirstOrDefaultAsync(x => x.Id == domainId && x.StoreId == storeId, ct);
        if (row == null) return NotFound(new { error = "domain_not_found" });
        if (!row.SslPurchased) return BadRequest(new { error = "ssl_purchase_required", message = "Please purchase SSL from the marketplace first." });
        if (!row.IsVerified) return BadRequest(new { error = "domain_not_verified", message = "Domain DNS is not yet verified. Use 'Verify DNS' first." });
        if (row.SslStatus == "issuing") return BadRequest(new { error = "ssl_already_issuing", message = "SSL issuance is already in progress." });

        await RunIssueAsync(row, ct);
        return Ok(new
        {
            success = row.SslStatus == "active",
            sslStatus = row.SslStatus,
            sslExpiresAt = row.SslExpiresAt,
            lastError = row.LastError,
            message = row.SslStatus == "active"
                ? "SSL certificate issued successfully."
                : $"SSL issuance failed: {row.LastError ?? "unknown error"}. Check your ACME client configuration."
        });
    }

    // ─── Private helpers ───────────────────────────────────────────────────────

    private async Task<bool> CheckDomainResolvableAsync(string hostname)
    {
        try
        {
            var addrs = await Dns.GetHostAddressesAsync(hostname);
            return addrs.Length > 0;
        }
        catch
        {
            return false;
        }
    }

    private async Task<AutoAttemptResult> TryAutoVerifyAndIssueAsync(StoreDomain row, CancellationToken ct)
    {
        CustomDomainDnsResult? dnsState = null;
        try
        {
            dnsState = await _cloudflareDns.CheckCustomDomainAsync(row.Hostname, row.VerificationToken, ct);
            row.DnsManagedByCloudflare = dnsState.ManagedByCloudflare;
            row.DnsStatus = dnsState.Success ? "configured" : "pending";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Auto-verify CheckCustomDomain failed for {Hostname}", row.Hostname);
        }

        var verified = (dnsState?.Success == true) || await CheckDomainResolvableAsync(row.Hostname);
        row.IsVerified = verified;
        row.UpdatedAt = DateTimeOffset.UtcNow;

        if (verified)
            row.LastError = null;

        await _db.SaveChangesAsync(ct);

        if (!verified)
            return new AutoAttemptResult(false, false, row.DnsStatus, row.SslStatus,
                "DNS not yet propagated — use Verify DNS once your records are set up.");

        if (!row.SslPurchased)
        {
            row.SslStatus = "payment_required";
            await _db.SaveChangesAsync(ct);
            return new AutoAttemptResult(true, false, row.DnsStatus, row.SslStatus, null);
        }

        await RunIssueAsync(row, ct);
        return new AutoAttemptResult(row.IsVerified, row.SslStatus == "active", row.DnsStatus, row.SslStatus, row.LastError);
    }

    private async Task RunIssueAsync(StoreDomain row, CancellationToken ct)
    {
        var provider = _sslProviders.Resolve(row.SslProvider);
        if (provider == null)
        {
            row.SslStatus = "failed";
            row.LastError = $"SSL provider '{row.SslProvider}' is not supported.";
            row.UpdatedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
            return;
        }

        row.SslStatus = "issuing";
        row.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        var result = await provider.IssueAsync(row, ct);
        row.SslStatus = result.Success ? "active" : "failed";
        row.SslExpiresAt = result.ExpiresAt;
        // Surface a clean error; hide internal stderr dumps beyond a safe length
        row.LastError = result.Error is { Length: > 400 }
            ? result.Error[..400] + "… (truncated, see server logs)"
            : result.Error;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    private async Task<bool> IsSslMarketplacePurchaseRequiredAsync(CancellationToken ct)
    {
        var value = await _db.PlatformBrandingSettings.AsNoTracking()
            .Where(x => x.Key == "platform.domains.ssl.require_marketplace_purchase")
            .Select(x => x.Value)
            .FirstOrDefaultAsync(ct);
        if (!string.IsNullOrWhiteSpace(value) && bool.TryParse(value, out var parsed))
            return parsed;
        return _config.GetValue("SSL_REQUIRE_MARKETPLACE_PURCHASE", true);
    }

    private async Task<int> GetSslPriceInrAsync(CancellationToken ct)
    {
        var value = await _db.PlatformBrandingSettings.AsNoTracking()
            .Where(x => x.Key == "platform.domains.ssl.price_inr")
            .Select(x => x.Value)
            .FirstOrDefaultAsync(ct);
        if (!string.IsNullOrWhiteSpace(value) && int.TryParse(value, out var parsed) && parsed >= 0)
            return parsed;
        return _config.GetValue("SSL_PRICE_INR", 999);
    }

    private async Task<string?> GetIngressHostAsync(CancellationToken ct)
    {
        var value = await _db.PlatformBrandingSettings.AsNoTracking()
            .Where(x => x.Key == "platform.domains.platform_ingress_host")
            .Select(x => x.Value)
            .FirstOrDefaultAsync(ct);
        return !string.IsNullOrWhiteSpace(value) ? value : _config["PLATFORM_INGRESS_HOST"];
    }

    private static string GenerateVerificationToken()
        => Convert.ToHexString(Guid.NewGuid().ToByteArray())[..16].ToLowerInvariant();

    private static object MapRow(StoreDomain x, int sslPriceInr, string? ingressHost) => new
    {
        x.Id,
        x.StoreId,
        x.Hostname,
        x.VerificationToken,
        x.IsVerified,
        x.DnsManagedByCloudflare,
        x.DnsStatus,
        x.SslProvider,
        x.SslPurchased,
        x.SslPurchaseReference,
        x.SslPurchasedAt,
        x.SslStatus,
        x.SslExpiresAt,
        x.LastError,
        x.CreatedAt,
        x.UpdatedAt,
        sslPriceInr,
        mapping = new
        {
            type = "CNAME",
            host = x.Hostname,
            target = ingressHost
        },
        verification = new
        {
            type = "TXT",
            host = $"_sitesellr-verify.{x.Hostname}",
            value = x.VerificationToken
        }
    };
}

// DTO for auto-attempt result returned in the Add response
public record AutoAttemptResult(bool Verified, bool SslIssued, string? DnsStatus, string? SslStatus, string? Error);

public class AddDomainRequest
{
    [Required]
    [RegularExpression(@"^[a-z0-9]([a-z0-9\-\.]{0,251}[a-z0-9])?$", ErrorMessage = "Invalid hostname format.")]
    public string Hostname { get; set; } = string.Empty;

    [RegularExpression("^(letsencrypt)$", ErrorMessage = "Supported providers: letsencrypt")]
    public string? SslProvider { get; set; }
}

public class PurchaseSslRequest
{
    [MaxLength(120)]
    public string? PaymentReference { get; set; }
}
