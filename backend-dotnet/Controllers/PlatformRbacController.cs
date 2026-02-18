using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using backend_dotnet.Services;
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
    private readonly IConfiguration _config;

    public PlatformRbacController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    private TenancyContext? Tenancy => HttpContext.Items["Tenancy"] as TenancyContext;

    private IActionResult? ValidateSensitiveAction(string actionName, string? reason)
    {
        var requireStepUp = _config.GetValue("REQUIRE_STEP_UP_FOR_SENSITIVE", false);
        if (string.IsNullOrWhiteSpace(reason))
        {
            return BadRequest(new { error = "reason_required", action = actionName });
        }

        if (!requireStepUp)
        {
            return null;
        }

        var stepUp = HttpContext.Request.Headers["X-Step-Up-Auth"].FirstOrDefault();
        if (!string.Equals(stepUp, "true", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(StatusCodes.Status428PreconditionRequired, new
            {
                error = "step_up_required",
                action = actionName,
                message = "Set X-Step-Up-Auth=true after completing 2FA re-auth flow."
            });
        }

        return null;
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

    [HttpGet("catalog/platform-owner")]
    public IActionResult GetPlatformOwnerPermissionCatalog()
    {
        return Ok(PermissionCatalog.GetPlatformOwnerTemplatePermissions().OrderBy(x => x).ToArray());
    }

    [HttpPut("users/{userId:guid}/platform-roles")]
    public async Task<IActionResult> SetPlatformRoles(Guid userId, [FromBody] PlatformRolesRequest req, CancellationToken ct)
    {
        var guardError = ValidateSensitiveAction("platform.roles.update", req.Reason);
        if (guardError != null) return guardError;
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

        _db.AuditLogs.Add(new AuditLog
        {
            ActorUserId = Tenancy?.UserId,
            Action = "platform.roles.updated",
            EntityType = "user",
            EntityId = userId.ToString(),
            Details = $"roles={string.Join(",", distinctRoles)};reason={req.Reason}",
            CreatedAt = DateTimeOffset.UtcNow
        });

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
        var guardError = ValidateSensitiveAction("store.permissions.update", req.Reason);
        if (guardError != null) return guardError;
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

        _db.AuditLogs.Add(new AuditLog
        {
            StoreId = storeId,
            ActorUserId = Tenancy?.UserId,
            Action = "store.permissions.updated",
            EntityType = "user",
            EntityId = userId.ToString(),
            Details = $"permissions={string.Join(",", distinctPermissions)};reason={req.Reason}",
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync(ct);
        return Ok(new { storeId, userId, permissions = distinctPermissions });
    }
}

public record PlatformRolesRequest(List<PlatformRole> Roles, string? Reason);

public record StorePermissionsRequest(List<string> Permissions, string? Reason);
