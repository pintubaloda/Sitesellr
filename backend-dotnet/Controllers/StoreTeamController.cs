using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/stores/{storeId:guid}/team")]
public class StoreTeamController : ControllerBase
{
    private readonly AppDbContext _db;

    public StoreTeamController(AppDbContext db)
    {
        _db = db;
    }

    private backend_dotnet.Services.TenancyContext? Tenancy => HttpContext.Items["Tenancy"] as backend_dotnet.Services.TenancyContext;

    [HttpGet]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> List(Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();

        var rows = await _db.StoreUserRoles.AsNoTracking()
            .Include(x => x.User)
            .Where(x => x.StoreId == storeId)
            .OrderBy(x => x.Role)
            .ThenBy(x => x.CreatedAt)
            .Select(x => new
            {
                x.UserId,
                x.User.Email,
                x.Role,
                x.CustomRoleName,
                x.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(rows);
    }

    [HttpPost]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> Add(Guid storeId, [FromBody] AddTeamMemberRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        if (string.IsNullOrWhiteSpace(req.Email)) return BadRequest(new { error = "email_required" });

        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(s => s.Id == storeId, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });

        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, ct);
        if (user == null)
        {
            user = new User
            {
                Email = normalizedEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N"), workFactor: 12),
                IsLocked = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync(ct);
        }

        var exists = await _db.StoreUserRoles.AnyAsync(x => x.StoreId == storeId && x.UserId == user.Id, ct);
        if (exists) return Conflict(new { error = "member_exists" });

        _db.StoreUserRoles.Add(new StoreUserRole
        {
            StoreId = storeId,
            UserId = user.Id,
            Role = ParseRole(req.Role),
            CustomRoleName = req.CustomRoleName?.Trim(),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync(ct);
        return Ok(new { added = true });
    }

    [HttpPut("{userId:guid}")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> Update(Guid storeId, Guid userId, [FromBody] UpdateTeamMemberRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();

        var row = await _db.StoreUserRoles.FirstOrDefaultAsync(x => x.StoreId == storeId && x.UserId == userId, ct);
        if (row == null) return NotFound();

        row.Role = ParseRole(req.Role);
        row.CustomRoleName = req.CustomRoleName?.Trim();
        await _db.SaveChangesAsync(ct);
        return Ok(new { updated = true });
    }

    [HttpDelete("{userId:guid}")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> Remove(Guid storeId, Guid userId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();

        var row = await _db.StoreUserRoles.FirstOrDefaultAsync(x => x.StoreId == storeId && x.UserId == userId, ct);
        if (row == null) return NotFound();

        if (row.Role == StoreRole.Owner)
        {
            var ownerCount = await _db.StoreUserRoles.CountAsync(x => x.StoreId == storeId && x.Role == StoreRole.Owner, ct);
            if (ownerCount <= 1) return BadRequest(new { error = "last_owner_cannot_be_removed" });
        }

        _db.StoreUserRoles.Remove(row);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static StoreRole ParseRole(string? raw)
    {
        if (Enum.TryParse<StoreRole>(raw, true, out var parsed))
        {
            return parsed;
        }
        return StoreRole.Staff;
    }
}

public record AddTeamMemberRequest(string Email, string? Role, string? CustomRoleName);
public record UpdateTeamMemberRequest(string? Role, string? CustomRoleName);
