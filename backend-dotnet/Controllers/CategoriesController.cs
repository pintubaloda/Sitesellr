using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using backend_dotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

public class CategoriesController : BaseApiController
{
    private readonly AppDbContext _db;
    private readonly ISubscriptionCapabilityService _caps;

    public CategoriesController(AppDbContext db, ISubscriptionCapabilityService caps)
    {
        _db = db;
        _caps = caps;
    }

    [HttpGet]
    [Authorize(Policy = Policies.ProductsRead)]
    public async Task<IActionResult> List([FromQuery] Guid storeId, CancellationToken ct)
    {
        if (storeId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var rows = await _db.Categories.AsNoTracking().Where(x => x.StoreId == storeId).OrderBy(x => x.Name).ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost]
    [Authorize(Policy = Policies.ProductsWrite)]
    public async Task<IActionResult> Create([FromBody] Category req, CancellationToken ct)
    {
        if (req.StoreId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != req.StoreId) return Forbid();
        var caps = await _caps.GetCapabilitiesAsync(req.StoreId, ct);
        var current = await _db.Categories.AsNoTracking().CountAsync(x => x.StoreId == req.StoreId, ct);
        if (caps.MaxCategories > 0 && current >= caps.MaxCategories)
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "plan_limit_exceeded", details = new { action = "categories.create", limit = caps.MaxCategories, current } });
        var slug = req.Slug.Trim().ToLowerInvariant();
        var exists = await _db.Categories.AsNoTracking().AnyAsync(x => x.StoreId == req.StoreId && x.Slug == slug, ct);
        if (exists) return Conflict(new { error = "category_slug_exists" });
        req.Id = Guid.NewGuid();
        req.Slug = slug;
        req.CreatedAt = DateTimeOffset.UtcNow;
        _db.Categories.Add(req);
        await _db.SaveChangesAsync(ct);
        return Ok(req);
    }
}
