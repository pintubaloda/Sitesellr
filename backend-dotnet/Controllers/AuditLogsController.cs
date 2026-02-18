using backend_dotnet.Data;
using backend_dotnet.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Policy = Policies.PlatformStaffRead)]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuditLogsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] Guid? merchantId,
        [FromQuery] Guid? storeId,
        [FromQuery] string? action,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var q = _db.AuditLogs.AsNoTracking().AsQueryable();
        if (merchantId.HasValue) q = q.Where(x => x.MerchantId == merchantId.Value);
        if (storeId.HasValue) q = q.Where(x => x.StoreId == storeId.Value);
        if (!string.IsNullOrWhiteSpace(action)) q = q.Where(x => x.Action.Contains(action));

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return Ok(new { items, total, page, pageSize });
    }
}
