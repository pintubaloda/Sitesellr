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
    private TenancyContext? Tenancy => HttpContext.Items["Tenancy"] as TenancyContext;

    public DomainSslController(AppDbContext db, ISslProviderFactory sslProviders, ICloudflareDnsService cloudflareDns, IConfiguration config)
    {
        _db = db;
        _sslProviders = sslProviders;
        _cloudflareDns = cloudflareDns;
        _config = config;
    }

    [HttpGet]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> List(Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var rows = await _db.StoreDomains.AsNoTracking().Where(x => x.StoreId == storeId).OrderByDescending(x => x.CreatedAt).ToListAsync(ct);
        var sslPriceInr = await GetSslPriceInrAsync(ct);
        return Ok(rows.Select(x => new
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
            sslPriceInr
        }));
    }

    [HttpPost]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> Add(Guid storeId, [FromBody] AddDomainRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var storeExists = await _db.Stores.AsNoTracking().AnyAsync(x => x.Id == storeId, ct);
        if (!storeExists) return NotFound(new { error = "store_not_found" });

        var hostname = req.Hostname.Trim().ToLowerInvariant();
        var exists = await _db.StoreDomains.AsNoTracking().AnyAsync(x => x.Hostname == hostname, ct);
        if (exists) return Conflict(new { error = "domain_exists" });
        var token = Convert.ToHexString(Guid.NewGuid().ToByteArray())[..16].ToLowerInvariant();
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
        var dns = await _cloudflareDns.EnsureCustomDomainAsync(row.Hostname, row.VerificationToken, ct);
        row.DnsManagedByCloudflare = dns.ManagedByCloudflare;
        row.DnsStatus = dns.Success ? "configured" : "pending";
        row.LastError = dns.Error;
        await _db.SaveChangesAsync(ct);
        var auto = await TryAutoVerifyAndIssueAsync(row, ct);
        var sslPriceInr = await GetSslPriceInrAsync(ct);
        return Ok(new
        {
            row.Id,
            row.Hostname,
            row.SslProvider,
            row.IsVerified,
            row.DnsManagedByCloudflare,
            row.DnsStatus,
            row.SslPurchased,
            row.SslStatus,
            row.LastError,
            sslPriceInr,
            verification = new
            {
                type = "txt",
                host = $"_sitesellr-verify.{hostname}",
                value = token
            },
            mapping = new
            {
                type = "cname",
                host = hostname,
                target = dns.TargetHost
            },
            notes = "Auto verify/issue attempted. If failed, use Verify DNS and Issue SSL buttons.",
            autoAttempt = auto
        });
    }

    [HttpPost("{domainId:guid}/verify")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> MarkVerified(Guid storeId, Guid domainId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var row = await _db.StoreDomains.FirstOrDefaultAsync(x => x.Id == domainId && x.StoreId == storeId, ct);
        if (row == null) return NotFound();
        var dnsState = await _cloudflareDns.CheckCustomDomainAsync(row.Hostname, row.VerificationToken, ct);
        row.DnsManagedByCloudflare = dnsState.ManagedByCloudflare;
        row.DnsStatus = dnsState.Success ? "configured" : "pending";
        var verified = dnsState.Success || await CheckDomainResolvableAsync(row.Hostname);
        row.IsVerified = verified;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        row.LastError = verified ? null : (dnsState.Error ?? "DNS not resolving to platform yet.");
        await _db.SaveChangesAsync(ct);
        if (verified && row.SslPurchased && row.SslStatus != "active")
        {
            await RunIssueAsync(row, ct);
        }
        if (verified && !row.SslPurchased)
        {
            row.SslStatus = "payment_required";
            await _db.SaveChangesAsync(ct);
        }
        return Ok(new { verified = row.IsVerified, row.DnsStatus, row.DnsManagedByCloudflare, row.SslPurchased, row.SslStatus, row.LastError });
    }

    [HttpPost("{domainId:guid}/issue-ssl")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> IssueSsl(Guid storeId, Guid domainId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var row = await _db.StoreDomains.FirstOrDefaultAsync(x => x.Id == domainId && x.StoreId == storeId, ct);
        if (row == null) return NotFound();
        if (!row.SslPurchased) return BadRequest(new { error = "ssl_purchase_required" });
        if (!row.IsVerified) return BadRequest(new { error = "domain_not_verified" });
        await RunIssueAsync(row, ct);

        return Ok(new
        {
            success = row.SslStatus == "active",
            row.SslStatus,
            row.SslExpiresAt,
            row.LastError
        });
    }

    [HttpPost("{domainId:guid}/purchase-ssl")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> PurchaseSsl(Guid storeId, Guid domainId, [FromBody] PurchaseSslRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var row = await _db.StoreDomains.FirstOrDefaultAsync(x => x.Id == domainId && x.StoreId == storeId, ct);
        if (row == null) return NotFound();
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
        {
            await RunIssueAsync(row, ct);
        }
        var sslPriceInr = await GetSslPriceInrAsync(ct);

        return Ok(new
        {
            purchased = true,
            row.SslPurchased,
            row.SslPurchaseReference,
            row.SslPurchasedAt,
            row.SslStatus,
            row.LastError,
            sslPriceInr
        });
    }

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

    private async Task<object> TryAutoVerifyAndIssueAsync(StoreDomain row, CancellationToken ct)
    {
        var dnsState = await _cloudflareDns.CheckCustomDomainAsync(row.Hostname, row.VerificationToken, ct);
        row.DnsManagedByCloudflare = dnsState.ManagedByCloudflare;
        row.DnsStatus = dnsState.Success ? "configured" : "pending";
        var verified = dnsState.Success || await CheckDomainResolvableAsync(row.Hostname);
        row.IsVerified = verified;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        row.LastError = verified ? null : (dnsState.Error ?? "Auto-verify failed: DNS not ready.");
        await _db.SaveChangesAsync(ct);

        if (!verified) return new { verified = false, sslIssued = false, row.DnsStatus, row.LastError };
        if (!row.SslPurchased)
        {
            row.SslStatus = "payment_required";
            await _db.SaveChangesAsync(ct);
            return new { verified = true, sslIssued = false, paymentRequired = true, row.SslStatus };
        }
        await RunIssueAsync(row, ct);
        return new { verified = row.IsVerified, sslIssued = row.SslStatus == "active", row.SslStatus, row.LastError };
    }

    private async Task RunIssueAsync(StoreDomain row, CancellationToken ct)
    {
        var provider = _sslProviders.Resolve(row.SslProvider);
        if (provider == null)
        {
            row.SslStatus = "failed";
            row.LastError = "ssl_provider_not_supported";
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
        row.LastError = result.Error;
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
        {
            return parsed;
        }
        return _config.GetValue("SSL_REQUIRE_MARKETPLACE_PURCHASE", true);
    }

    private async Task<int> GetSslPriceInrAsync(CancellationToken ct)
    {
        var value = await _db.PlatformBrandingSettings.AsNoTracking()
            .Where(x => x.Key == "platform.domains.ssl.price_inr")
            .Select(x => x.Value)
            .FirstOrDefaultAsync(ct);
        if (!string.IsNullOrWhiteSpace(value) && int.TryParse(value, out var parsed) && parsed >= 0)
        {
            return parsed;
        }
        return _config.GetValue("SSL_PRICE_INR", 999);
    }
}

public class AddDomainRequest
{
    [Required, RegularExpression("^[a-z0-9.-]+$", ErrorMessage = "Invalid hostname format.")]
    public string Hostname { get; set; } = string.Empty;
    [RegularExpression("^(letsencrypt)$", ErrorMessage = "Supported: letsencrypt")]
    public string? SslProvider { get; set; }
}

public class PurchaseSslRequest
{
    [MaxLength(120)]
    public string? PaymentReference { get; set; }
}
