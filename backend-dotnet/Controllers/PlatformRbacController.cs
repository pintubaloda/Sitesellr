using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/platform/rbac")]
[Authorize(Policy = Policies.PlatformOwner)]
public class PlatformRbacController : ControllerBase
{
    private readonly AppDbContext _db;

    public PlatformRbacController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("users/{userId:guid}/platform-roles")]
    public async Task<IActionResult> GetPlatformRoles(Guid userId, CancellationToken ct)
    {
        var roles = await _db.PlatformUserRoles.AsNoTracking()
            .Where(x => x.UserId == userId)
            .Select(x => x.Role)
            .ToListAsync(ct);
        return Ok(roles);
    }

    [HttpPut("users/{userId:guid}/platform-roles")]
    public async Task<IActionResult> SetPlatformRoles(Guid userId, [FromBody] PlatformRolesRequest req, CancellationToken ct)
    {
        if (!await _db.Users.AnyAsync(u => u.Id == userId, ct)) return NotFound(new { error = "user_not_found" });

        var existing = _db.PlatformUserRoles.Where(x => x.UserId == userId);
        _db.PlatformUserRoles.RemoveRange(existing);

        var distinctRoles = req.Roles.Distinct().ToList();
        foreach (var role in distinctRoles)
        {
            _db.PlatformUserRoles.Add(new PlatformUserRole
            {
                UserId = userId,
                Role = role,
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        await _db.SaveChangesAsync(ct);
        return Ok(new { userId, roles = distinctRoles });
    }

    [HttpGet("stores/{storeId:guid}/users/{userId:guid}/permissions")]
    public async Task<IActionResult> GetStorePermissions(Guid storeId, Guid userId, CancellationToken ct)
    {
        var permissions = await _db.StoreUserPermissions.AsNoTracking()
            .Where(x => x.StoreId == storeId && x.UserId == userId)
            .Select(x => x.Permission)
            .ToListAsync(ct);
        return Ok(permissions);
    }

    [HttpPut("stores/{storeId:guid}/users/{userId:guid}/permissions")]
    public async Task<IActionResult> SetStorePermissions(Guid storeId, Guid userId, [FromBody] StorePermissionsRequest req, CancellationToken ct)
    {
        if (!await _db.Stores.AnyAsync(s => s.Id == storeId, ct)) return NotFound(new { error = "store_not_found" });
        if (!await _db.Users.AnyAsync(u => u.Id == userId, ct)) return NotFound(new { error = "user_not_found" });

        var existing = _db.StoreUserPermissions.Where(x => x.StoreId == storeId && x.UserId == userId);
        _db.StoreUserPermissions.RemoveRange(existing);

        var distinctPermissions = req.Permissions
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        foreach (var permission in distinctPermissions)
        {
            _db.StoreUserPermissions.Add(new StoreUserPermission
            {
                StoreId = storeId,
                UserId = userId,
                Permission = permission,
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        await _db.SaveChangesAsync(ct);
        return Ok(new { storeId, userId, permissions = distinctPermissions });
    }
}

public record PlatformRolesRequest(List<PlatformRole> Roles);

public record StorePermissionsRequest(List<string> Permissions);
