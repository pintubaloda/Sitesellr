using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Services;
using backend_dotnet.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace backend_dotnet.Controllers;

public class MerchantsController : BaseApiController
{
    private readonly AppDbContext _db;

    public MerchantsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [Authorize(Policy = Policies.PlatformStaffRead)]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var merchants = await _db.Merchants.AsNoTracking()
            .Include(m => m.Stores)
            .Select(m => new
            {
                m.Id,
                m.Name,
                m.PrimaryDomain,
                m.Status,
                m.CreatedAt,
                m.UpdatedAt,
                Stores = m.Stores
                    .OrderBy(s => s.Name)
                    .Select(s => new
                    {
                        s.Id,
                        s.Name,
                        s.Subdomain,
                        s.Status,
                        s.Currency,
                        s.IsWholesaleEnabled
                    })
                    .ToList()
            })
            .ToListAsync(ct);
        return Ok(merchants);
    }

    [HttpPost]
    [Authorize(Policy = Policies.PlatformOwner)]
    public async Task<IActionResult> Create([FromBody] Merchant input, CancellationToken ct)
    {
        input.Id = Guid.NewGuid();
        input.CreatedAt = DateTimeOffset.UtcNow;
        input.UpdatedAt = DateTimeOffset.UtcNow;
        _db.Merchants.Add(input);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = input.Id }, input);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = Policies.PlatformStaffRead)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var merchant = await _db.Merchants.FindAsync(new object[] { id }, ct);
        return merchant == null ? NotFound() : Ok(merchant);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Policies.PlatformOwner)]
    public async Task<IActionResult> Update(Guid id, [FromBody] Merchant input, CancellationToken ct)
    {
        var merchant = await _db.Merchants.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (merchant == null) return NotFound();

        var previousStatus = merchant.Status;
        merchant.Name = string.IsNullOrWhiteSpace(input.Name) ? merchant.Name : input.Name.Trim();
        merchant.PrimaryDomain = string.IsNullOrWhiteSpace(input.PrimaryDomain) ? null : input.PrimaryDomain.Trim();
        merchant.Status = input.Status;
        merchant.UpdatedAt = DateTimeOffset.UtcNow;
        if (previousStatus != merchant.Status)
        {
            _db.AuditLogs.Add(new AuditLog
            {
                MerchantId = merchant.Id,
                ActorUserId = Tenancy?.UserId,
                Action = "merchant.status_changed",
                EntityType = "merchant",
                EntityId = merchant.Id.ToString(),
                Details = $"{previousStatus}->{merchant.Status}",
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        await _db.SaveChangesAsync(ct);
        return Ok(merchant);
    }
}
