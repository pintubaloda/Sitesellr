using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using backend_dotnet.Services;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/stores/{storeId:guid}/role-templates")]
public class RoleTemplatesController : ControllerBase
{
    private readonly AppDbContext _db;

    public RoleTemplatesController(AppDbContext db)
    {
        _db = db;
    }

    private TenancyContext? Tenancy => HttpContext.Items["Tenancy"] as TenancyContext;

    [HttpGet]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> List(Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var rows = await _db.StoreRoleTemplates.AsNoTracking().Where(x => x.StoreId == storeId).OrderBy(x => x.Name).ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> Create(Guid storeId, [FromBody] RoleTemplateCreateRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var permissions = req.PermissionsCsv
            .Split(",", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        if (permissions.Length == 0) return BadRequest(new { error = "permissions_required" });
        if (permissions.Any(p => p.Length > 120 || p.Contains(' ')))
            return BadRequest(new { error = "invalid_permission_format" });

        var row = new StoreRoleTemplate
        {
            StoreId = storeId,
            Name = req.Name.Trim(),
            PermissionsCsv = string.Join(",", permissions),
            IsSensitive = req.IsSensitive,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.StoreRoleTemplates.Add(row);
        await _db.SaveChangesAsync(ct);
        return Ok(row);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> Delete(Guid storeId, Guid id, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var row = await _db.StoreRoleTemplates.FirstOrDefaultAsync(x => x.Id == id && x.StoreId == storeId, ct);
        if (row == null) return NotFound();
        _db.StoreRoleTemplates.Remove(row);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/apply/{userId:guid}")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> Apply(Guid storeId, Guid id, Guid userId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var template = await _db.StoreRoleTemplates.FirstOrDefaultAsync(x => x.Id == id && x.StoreId == storeId, ct);
        if (template == null) return NotFound();

        var role = await _db.StoreUserRoles.FirstOrDefaultAsync(x => x.StoreId == storeId && x.UserId == userId, ct);
        if (role == null) return NotFound(new { error = "team_member_not_found" });
        role.Role = StoreRole.Custom;
        role.CustomRoleName = template.Name;

        var oldPerms = _db.StoreUserPermissions.Where(x => x.StoreId == storeId && x.UserId == userId);
        _db.StoreUserPermissions.RemoveRange(oldPerms);
        var perms = template.PermissionsCsv.Split(",", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var p in perms)
        {
            _db.StoreUserPermissions.Add(new StoreUserPermission
            {
                StoreId = storeId,
                UserId = userId,
                Permission = p,
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        if (template.IsSensitive)
        {
            _db.SensitiveActionApprovals.Add(new SensitiveActionApproval
            {
                ActionType = "store.role_template.apply",
                EntityType = "store_user_role",
                EntityId = role.Id.ToString(),
                RequestedByUserId = Tenancy?.UserId ?? Guid.Empty,
                Status = "pending",
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        _db.AuditLogs.Add(new AuditLog
        {
            StoreId = storeId,
            ActorUserId = Tenancy?.UserId,
            Action = "store.role_template.applied",
            EntityType = "store_user_role",
            EntityId = role.Id.ToString(),
            Details = $"template={template.Name};userId={userId}",
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync(ct);
        return Ok(new { applied = true, template = template.Name });
    }
}

public class RoleTemplateCreateRequest
{
    [Required, StringLength(80, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;
    [Required, StringLength(2000)]
    public string PermissionsCsv { get; set; } = string.Empty;
    public bool IsSensitive { get; set; }
}
