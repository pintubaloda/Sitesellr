using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace backend_dotnet.Controllers;

public class CustomersController : BaseApiController
{
    private readonly AppDbContext _db;

    public CustomersController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [Authorize(Policy = Policies.CustomersRead)]
    public async Task<IActionResult> List([FromQuery] Guid storeId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        if (storeId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var customers = await _db.Customers.AsNoTracking()
            .Where(c => c.StoreId == storeId)
            .Include(c => c.Addresses)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return Ok(customers);
    }

    [HttpPost]
    [Authorize(Policy = Policies.CustomersWrite)]
    public async Task<IActionResult> Create([FromBody] Customer input, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        if (input.StoreId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != input.StoreId) return Forbid();
        input.Id = Guid.NewGuid();
        input.CreatedAt = DateTimeOffset.UtcNow;
        input.UpdatedAt = DateTimeOffset.UtcNow;
        _db.Customers.Add(input);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = input.Id, storeId = input.StoreId }, input);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = Policies.CustomersRead)]
    public async Task<IActionResult> Get(Guid id, [FromQuery] Guid storeId, CancellationToken ct)
    {
        if (storeId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var customer = await _db.Customers.Include(c => c.Addresses)
            .FirstOrDefaultAsync(c => c.Id == id && c.StoreId == storeId, ct);
        return customer == null ? NotFound() : Ok(customer);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Policies.CustomersWrite)]
    public async Task<IActionResult> Update(Guid id, [FromBody] Customer input, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        if (input.StoreId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != input.StoreId) return Forbid();
        if (id != input.Id && input.Id != Guid.Empty) return BadRequest(new { error = "id_mismatch" });

        var customer = await _db.Customers
            .Include(c => c.Addresses)
            .FirstOrDefaultAsync(c => c.Id == id && c.StoreId == input.StoreId, ct);
        if (customer == null) return NotFound();

        customer.Name = input.Name;
        customer.Email = input.Email;
        customer.Phone = input.Phone;
        customer.Type = input.Type;
        customer.GSTIN = input.GSTIN;
        customer.CompanyName = input.CompanyName;
        customer.CreditLimit = input.CreditLimit;
        customer.UpdatedAt = DateTimeOffset.UtcNow;

        if (input.Addresses?.Count > 0)
        {
            _db.CustomerAddresses.RemoveRange(customer.Addresses);
            customer.Addresses = input.Addresses.Select(a => new CustomerAddress
            {
                Id = a.Id == Guid.Empty ? Guid.NewGuid() : a.Id,
                CustomerId = customer.Id,
                Label = a.Label,
                Line1 = a.Line1,
                Line2 = a.Line2,
                City = a.City,
                State = a.State,
                PostalCode = a.PostalCode,
                Country = a.Country,
                IsDefault = a.IsDefault
            }).ToList();
        }

        await _db.SaveChangesAsync(ct);
        return Ok(customer);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Policies.CustomersWrite)]
    public async Task<IActionResult> Delete(Guid id, [FromQuery] Guid storeId, CancellationToken ct)
    {
        if (storeId == Guid.Empty) return BadRequest(new { error = "store_required" });
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == id && c.StoreId == storeId, ct);
        if (customer == null) return NotFound();
        _db.Customers.Remove(customer);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
