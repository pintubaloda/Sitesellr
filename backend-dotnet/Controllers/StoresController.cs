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

    public StoresController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [Authorize(Policy = Policies.StoreOwnerOrAdmin)]
    public async Task<IActionResult> List([FromQuery] Guid? merchantId, CancellationToken ct)
    {
        IQueryable<Store> q = _db.Stores.AsNoTracking().Include(s => s.Merchant);
        if (merchantId.HasValue) q = q.Where(s => s.MerchantId == merchantId.Value);
        return Ok(await q.ToListAsync(ct));
    }

    [HttpPost]
    [Authorize(Policy = Policies.StoreOwnerOrAdmin)]
    public async Task<IActionResult> Create([FromBody] Store input, CancellationToken ct)
    {
        input.Id = Guid.NewGuid();
        input.CreatedAt = DateTimeOffset.UtcNow;
        input.UpdatedAt = DateTimeOffset.UtcNow;
        _db.Stores.Add(input);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = input.Id }, input);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = Policies.StoreOwnerOrAdmin)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var store = await _db.Stores.Include(s => s.Merchant).FirstOrDefaultAsync(s => s.Id == id, ct);
        return store == null ? NotFound() : Ok(store);
    }
}
