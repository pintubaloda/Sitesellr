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
    private readonly ILogger<StoresController> _logger;

    public StoresController(AppDbContext db, ICloudflareDnsService cloudflareDns, ILogger<StoresController> logger)
    {
        _db = db;
        _cloudflareDns = cloudflareDns;
        _logger = logger;
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
    public async Task<IActionResult> Create([FromBody] StoreUpsertRequest input, CancellationToken ct)
    {
        try
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            if (string.IsNullOrWhiteSpace(input.Name))
            {
                return BadRequest(new { error = "name_required" });
            }
            var merchantId = input.MerchantId;
            if (!merchantId.HasValue && Tenancy?.Store != null)
            {
                merchantId = Tenancy.Store.MerchantId;
            }
            if (!merchantId.HasValue || merchantId.Value == Guid.Empty)
            {
                return BadRequest(new { error = "merchant_required" });
            }
            if (Tenancy?.Store != null && Tenancy.Store.MerchantId != merchantId.Value) return Forbid();
            if (!string.IsNullOrWhiteSpace(input.Subdomain) && !SubdomainPolicy.TryNormalizeRequested(input.Subdomain, out _, out var createError))
            {
                return BadRequest(new { error = createError ?? "subdomain_invalid" });
            }
            var created = new Store
            {
                Id = Guid.NewGuid(),
                MerchantId = merchantId.Value,
                Name = input.Name.Trim(),
                Subdomain = await EnsureUniqueSubdomainAsync(input.Subdomain, input.Name, null, ct),
                Currency = string.IsNullOrWhiteSpace(input.Currency) ? "INR" : input.Currency.Trim(),
                Timezone = string.IsNullOrWhiteSpace(input.Timezone) ? "Asia/Kolkata" : input.Timezone.Trim(),
                Status = input.Status,
                IsWholesaleEnabled = input.IsWholesaleEnabled,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.Stores.Add(created);
            await _db.SaveChangesAsync(ct);
            if (!string.IsNullOrWhiteSpace(created.Subdomain))
            {
                var dnsResult = await _cloudflareDns.EnsureTenantSubdomainAsync(created.Subdomain, ct);
                if (!dnsResult.Success)
                {
                    _logger.LogWarning("Cloudflare subdomain provisioning skipped for store {StoreId}: {Error}", created.Id, dnsResult.Error);
                }
            }
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Create store failed");
            return StatusCode(500, new { error = "store_create_failed", detail = ex.Message });
        }
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != id) return Forbid();
        var store = await _db.Stores.Include(s => s.Merchant).FirstOrDefaultAsync(s => s.Id == id, ct);
        return store == null ? NotFound() : Ok(store);
    }

    [HttpGet("{id:guid}/cors-origins")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> GetCorsOrigins(Guid id, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != id) return Forbid();
        var exists = await _db.Stores.AsNoTracking().AnyAsync(s => s.Id == id, ct);
        if (!exists) return NotFound();
        var key = $"store.security.cors.origins.{id:N}";
        var value = await _db.PlatformBrandingSettings.AsNoTracking()
            .Where(x => x.Key == key)
            .Select(x => x.Value)
            .FirstOrDefaultAsync(ct);
        return Ok(new { storeId = id, corsOriginsCsv = value ?? string.Empty });
    }

    [HttpPut("{id:guid}/cors-origins")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> UpdateCorsOrigins(Guid id, [FromBody] StoreCorsOriginsRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != id) return Forbid();
        var exists = await _db.Stores.AsNoTracking().AnyAsync(s => s.Id == id, ct);
        if (!exists) return NotFound();
        var key = $"store.security.cors.origins.{id:N}";
        var value = (req.CorsOriginsCsv ?? string.Empty).Trim();
        var row = await _db.PlatformBrandingSettings.FirstOrDefaultAsync(x => x.Key == key, ct);
        if (row == null)
        {
            row = new PlatformBrandingSetting
            {
                Key = key,
                Value = value,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.PlatformBrandingSettings.Add(row);
        }
        else
        {
            row.Value = value;
            row.UpdatedAt = DateTimeOffset.UtcNow;
        }
        await _db.SaveChangesAsync(ct);
        return Ok(new { storeId = id, corsOriginsCsv = value, saved = true });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] StoreUpsertRequest input, CancellationToken ct)
    {
        try
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            if (string.IsNullOrWhiteSpace(input.Name))
            {
                return BadRequest(new { error = "name_required" });
            }
            if (Tenancy?.Store != null && Tenancy.Store.Id != id) return Forbid();

            var store = await _db.Stores.FirstOrDefaultAsync(s => s.Id == id, ct);
            if (store == null) return NotFound();
            if (!string.IsNullOrWhiteSpace(input.Subdomain) && !SubdomainPolicy.TryNormalizeRequested(input.Subdomain, out _, out var updateError))
            {
                return BadRequest(new { error = updateError ?? "subdomain_invalid" });
            }

            if (input.MerchantId.HasValue && input.MerchantId.Value != Guid.Empty)
            {
                if (Tenancy?.Store != null && Tenancy.Store.MerchantId != input.MerchantId.Value) return Forbid();
                store.MerchantId = input.MerchantId.Value;
            }

            store.Name = input.Name.Trim();
            store.Subdomain = await EnsureUniqueSubdomainAsync(input.Subdomain, input.Name, id, ct);
            store.Currency = string.IsNullOrWhiteSpace(input.Currency) ? store.Currency : input.Currency.Trim();
            store.Timezone = string.IsNullOrWhiteSpace(input.Timezone) ? store.Timezone : input.Timezone.Trim();
            store.Status = input.Status;
            store.IsWholesaleEnabled = input.IsWholesaleEnabled;
            store.UpdatedAt = DateTimeOffset.UtcNow;

            await _db.SaveChangesAsync(ct);
            if (!string.IsNullOrWhiteSpace(store.Subdomain))
            {
                var dnsResult = await _cloudflareDns.EnsureTenantSubdomainAsync(store.Subdomain, ct);
                if (!dnsResult.Success)
                {
                    _logger.LogWarning("Cloudflare subdomain provisioning skipped for store {StoreId}: {Error}", store.Id, dnsResult.Error);
                }
            }
            return Ok(store);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Update store failed for {StoreId}", id);
            return StatusCode(500, new { error = "store_update_failed", detail = ex.Message });
        }
    }

    private async Task<string> EnsureUniqueSubdomainAsync(string? requested, string? fallbackName, Guid? excludingStoreId, CancellationToken ct)
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
        while (await _db.Stores.AsNoTracking().AnyAsync(
                   s => s.Subdomain == candidate && (!excludingStoreId.HasValue || s.Id != excludingStoreId.Value), ct))
        {
            candidate = $"{seed}{suffix++}";
        }

        return candidate;
    }
}

public class StoreUpsertRequest
{
    public Guid? MerchantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Subdomain { get; set; }
    public string Currency { get; set; } = "INR";
    public string Timezone { get; set; } = "Asia/Kolkata";
    public StoreStatus Status { get; set; } = StoreStatus.Active;
    public bool IsWholesaleEnabled { get; set; }
}

public class StoreCorsOriginsRequest
{
    public string CorsOriginsCsv { get; set; } = string.Empty;
}
