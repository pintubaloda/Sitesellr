using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace backend_dotnet.Controllers;

public class OrdersController : BaseApiController
{
    private readonly AppDbContext _db;

    public OrdersController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [Authorize(Policy = Policies.StoreStaff)]
    public async Task<IActionResult> List([FromQuery] Guid storeId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var orders = await _db.Orders.AsNoTracking()
            .Where(o => o.StoreId == storeId)
            .Include(o => o.Items)
            .Include(o => o.Customer)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return Ok(orders);
    }

    [HttpPost]
    [Authorize(Policy = Policies.StoreOwnerOrAdmin)]
    public async Task<IActionResult> Create([FromBody] Order input, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        if (input.StoreId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != input.StoreId) return Forbid();
        input.Id = Guid.NewGuid();
        input.CreatedAt = DateTimeOffset.UtcNow;
        input.UpdatedAt = DateTimeOffset.UtcNow;
        _db.Orders.Add(input);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = input.Id, storeId = input.StoreId }, input);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = Policies.StoreStaff)]
    public async Task<IActionResult> Get(Guid id, [FromQuery] Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var order = await _db.Orders
            .Include(o => o.Items)
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == id && o.StoreId == storeId, ct);
        return order == null ? NotFound() : Ok(order);
    }
}
