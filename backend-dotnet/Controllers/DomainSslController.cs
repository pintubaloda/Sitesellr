using System.ComponentModel.DataAnnotations;
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
    private TenancyContext? Tenancy => HttpContext.Items["Tenancy"] as TenancyContext;

    public DomainSslController(AppDbContext db, ISslProviderFactory sslProviders)
    {
        _db = db;
        _sslProviders = sslProviders;
    }

    [HttpGet]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> List(Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var rows = await _db.StoreDomains.AsNoTracking().Where(x => x.StoreId == storeId).OrderByDescending(x => x.CreatedAt).ToListAsync(ct);
        return Ok(rows);
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

        var row = new StoreDomain
        {
            StoreId = storeId,
            Hostname = hostname,
            VerificationToken = token,
            IsVerified = false,
            SslProvider = string.IsNullOrWhiteSpace(req.SslProvider) ? "letsencrypt" : req.SslProvider.Trim().ToLowerInvariant(),
            SslStatus = "pending",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.StoreDomains.Add(row);
        await _db.SaveChangesAsync(ct);
        return Ok(new
        {
            row.Id,
            row.Hostname,
            row.SslProvider,
            verification = new
            {
                type = "txt",
                host = $"_sitesellr-verify.{hostname}",
                value = token
            },
            notes = "For Cloudflare-managed domains, add TXT record then call verify endpoint."
        });
    }

    [HttpPost("{domainId:guid}/verify")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> MarkVerified(Guid storeId, Guid domainId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var row = await _db.StoreDomains.FirstOrDefaultAsync(x => x.Id == domainId && x.StoreId == storeId, ct);
        if (row == null) return NotFound();
        row.IsVerified = true;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { verified = true });
    }

    [HttpPost("{domainId:guid}/issue-ssl")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> IssueSsl(Guid storeId, Guid domainId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var row = await _db.StoreDomains.FirstOrDefaultAsync(x => x.Id == domainId && x.StoreId == storeId, ct);
        if (row == null) return NotFound();
        if (!row.IsVerified) return BadRequest(new { error = "domain_not_verified" });

        var provider = _sslProviders.Resolve(row.SslProvider);
        if (provider == null) return BadRequest(new { error = "ssl_provider_not_supported" });

        row.SslStatus = "issuing";
        row.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        var result = await provider.IssueAsync(row, ct);
        row.SslStatus = result.Success ? "active" : "failed";
        row.SslExpiresAt = result.ExpiresAt;
        row.LastError = result.Error;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            success = result.Success,
            row.SslStatus,
            row.SslExpiresAt,
            row.LastError
        });
    }
}

public class AddDomainRequest
{
    [Required, RegularExpression("^[a-z0-9.-]+$", ErrorMessage = "Invalid hostname format.")]
    public string Hostname { get; set; } = string.Empty;
    [RegularExpression("^(letsencrypt)$", ErrorMessage = "Supported: letsencrypt")]
    public string? SslProvider { get; set; }
}
