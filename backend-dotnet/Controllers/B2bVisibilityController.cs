using System.ComponentModel.DataAnnotations;
using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using backend_dotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/stores/{storeId:guid}/b2b")]
public class B2bVisibilityController : ControllerBase
{
    private readonly AppDbContext _db;
    private TenancyContext? Tenancy => HttpContext.Items["Tenancy"] as TenancyContext;

    public B2bVisibilityController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("groups")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> ListGroups(Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var rows = await _db.CustomerGroups.AsNoTracking().Where(x => x.StoreId == storeId).OrderBy(x => x.Name).ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost("groups")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> CreateGroup(Guid storeId, [FromBody] CreateGroupRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var row = new CustomerGroup
        {
            StoreId = storeId,
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.CustomerGroups.Add(row);
        await _db.SaveChangesAsync(ct);
        return Ok(row);
    }

    [HttpPost("groups/{groupId:guid}/members/{customerId:guid}")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> AddMember(Guid storeId, Guid groupId, Guid customerId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var exists = await _db.CustomerGroupMembers.AsNoTracking().AnyAsync(x => x.StoreId == storeId && x.CustomerGroupId == groupId && x.CustomerId == customerId, ct);
        if (exists) return Ok(new { added = false });
        _db.CustomerGroupMembers.Add(new CustomerGroupMember
        {
            StoreId = storeId,
            CustomerGroupId = groupId,
            CustomerId = customerId,
            CreatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync(ct);
        return Ok(new { added = true });
    }

    [HttpGet("rules")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> ListRules(Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var rows = await _db.VisibilityRules.AsNoTracking()
            .Where(x => x.StoreId == storeId && x.IsActive)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost("rules")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> CreateRule(Guid storeId, [FromBody] CreateRuleRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var row = new VisibilityRule
        {
            StoreId = storeId,
            CustomerGroupId = req.CustomerGroupId,
            TargetType = req.TargetType.Trim().ToLowerInvariant(),
            TargetKey = req.TargetKey.Trim().ToLowerInvariant(),
            Effect = req.Effect.Trim().ToLowerInvariant(),
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.VisibilityRules.Add(row);
        await _db.SaveChangesAsync(ct);
        return Ok(row);
    }

    [HttpDelete("rules/{ruleId:guid}")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> DeleteRule(Guid storeId, Guid ruleId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var row = await _db.VisibilityRules.FirstOrDefaultAsync(x => x.Id == ruleId && x.StoreId == storeId, ct);
        if (row == null) return NotFound();
        _db.VisibilityRules.Remove(row);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public class CreateGroupRequest
{
    [Required, StringLength(120, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;
    [StringLength(400)]
    public string? Description { get; set; }
}

public class CreateRuleRequest
{
    public Guid? CustomerGroupId { get; set; }
    [Required, RegularExpression("^(product|category|page|theme_block)$")]
    public string TargetType { get; set; } = "product";
    [Required, StringLength(120)]
    public string TargetKey { get; set; } = string.Empty;
    [Required, RegularExpression("^(allow|deny)$")]
    public string Effect { get; set; } = "deny";
}
