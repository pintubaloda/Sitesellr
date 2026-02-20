using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Services;
using backend_dotnet.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace backend_dotnet.Controllers;

public class StoresController : BaseApiController
{
    private readonly AppDbContext _db;
    private readonly ICloudflareDnsService _cloudflareDns;

    public StoresController(AppDbContext db, ICloudflareDnsService cloudflareDns)
    {
        _db = db;
        _cloudflareDns = cloudflareDns;
    }

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> List([FromQuery] Guid? merchantId, CancellationToken ct)
    {
        if (Tenancy?.UserId == null)
        {
            return Unauthorized();
        }

        IQueryable<Store> q = _db.Stores.AsNoTracking().Include(s => s.Merchant);
        if (merchantId.HasValue)
        {
            q = q.Where(s => s.MerchantId == merchantId.Value);
        }

        // Platform users can view platform-wide stores.
        if (Tenancy.IsPlatformOwner || Tenancy.IsPlatformStaff)
        {
            return Ok(await q.OrderBy(s => s.Name).ToListAsync(ct));
        }

        // Store users only get stores they are members of.
        var userId = Tenancy.UserId.Value;
        q = q.Where(s => _db.StoreUserRoles.Any(r => r.StoreId == s.Id && r.UserId == userId));
        return Ok(await q.OrderBy(s => s.Name).ToListAsync(ct));
    }

    [HttpPost]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> Create([FromBody] Store input, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.MerchantId != input.MerchantId) return Forbid();
        input.Subdomain = await EnsureUniqueSubdomainAsync(input.Subdomain, input.Name, null, ct);
        input.Id = Guid.NewGuid();
        input.CreatedAt = DateTimeOffset.UtcNow;
        input.UpdatedAt = DateTimeOffset.UtcNow;
        _db.Stores.Add(input);
        await _db.SaveChangesAsync(ct);
        if (!string.IsNullOrWhiteSpace(input.Subdomain))
        {
            await _cloudflareDns.EnsureTenantSubdomainAsync(input.Subdomain, ct);
        }
        return CreatedAtAction(nameof(Get), new { id = input.Id }, input);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != id) return Forbid();
        var store = await _db.Stores.Include(s => s.Merchant).FirstOrDefaultAsync(s => s.Id == id, ct);
        return store == null ? NotFound() : Ok(store);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] Store input, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        if (id != input.Id && input.Id != Guid.Empty) return BadRequest(new { error = "id_mismatch" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != id) return Forbid();

        var store = await _db.Stores.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (store == null) return NotFound();

        store.Name = input.Name;
        store.Subdomain = await EnsureUniqueSubdomainAsync(input.Subdomain, input.Name, id, ct);
        store.Currency = input.Currency;
        store.Timezone = input.Timezone;
        store.Status = input.Status;
        store.IsWholesaleEnabled = input.IsWholesaleEnabled;
        store.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);
        if (!string.IsNullOrWhiteSpace(store.Subdomain))
        {
            await _cloudflareDns.EnsureTenantSubdomainAsync(store.Subdomain, ct);
        }
        return Ok(store);
    }

    private async Task<string> EnsureUniqueSubdomainAsync(string? requested, string? fallbackName, Guid? excludingStoreId, CancellationToken ct)
    {
        var seed = SanitizeSubdomain(string.IsNullOrWhiteSpace(requested) ? fallbackName : requested);
        if (string.IsNullOrWhiteSpace(seed))
        {
            seed = "store";
        }

        var candidate = seed;
        var suffix = 1;
        while (await _db.Stores.AsNoTracking().AnyAsync(
                   s => s.Subdomain == candidate && (!excludingStoreId.HasValue || s.Id != excludingStoreId.Value), ct))
        {
            candidate = $"{seed}{suffix++}";
        }

        return candidate;
    }

    private static string SanitizeSubdomain(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var chars = value.Trim().ToLowerInvariant()
            .Select(ch => char.IsLetterOrDigit(ch) ? ch : '-')
            .ToArray();
        var normalized = new string(chars);
        while (normalized.Contains("--", StringComparison.Ordinal))
        {
            normalized = normalized.Replace("--", "-", StringComparison.Ordinal);
        }
        normalized = normalized.Trim('-');
        return normalized.Length > 50 ? normalized[..50] : normalized;
    }
}
