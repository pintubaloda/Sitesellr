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
[Route("api/stores/{storeId:guid}/team")]
public class StoreTeamController : ControllerBase
{
    private static readonly HashSet<string> AllowedRoles = new(StringComparer.OrdinalIgnoreCase) { "Owner", "Admin", "Staff", "Custom" };

    private readonly AppDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly IEmailService _emailService;

    public StoreTeamController(AppDbContext db, ITokenService tokenService, IEmailService emailService)
    {
        _db = db;
        _tokenService = tokenService;
        _emailService = emailService;
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
                Role = x.Role.ToString(),
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

        StoreRole parsedRole;
        try
        {
            parsedRole = ParseRole(req.Role);
        }
        catch (ArgumentException)
        {
            return BadRequest(new { error = "invalid_role" });
        }

        _db.StoreUserRoles.Add(new StoreUserRole
        {
            StoreId = storeId,
            UserId = user.Id,
            Role = parsedRole,
            CustomRoleName = req.CustomRoleName?.Trim(),
            CreatedAt = DateTimeOffset.UtcNow
        });

        _db.AuditLogs.Add(new AuditLog
        {
            StoreId = storeId,
            ActorUserId = Tenancy?.UserId,
            Action = "store.team.member_added",
            EntityType = "store_user_role",
            EntityId = user.Id.ToString(),
            Details = $"email={normalizedEmail};role={req.Role ?? "Staff"}",
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync(ct);
        return Ok(new { added = true });
    }

    [HttpPost("invite")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> Invite(Guid storeId, [FromBody] CreateInviteRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        if (string.IsNullOrWhiteSpace(req.Email)) return BadRequest(new { error = "email_required" });

        var token = Convert.ToHexString(Guid.NewGuid().ToByteArray()) + Convert.ToHexString(Guid.NewGuid().ToByteArray());
        var tokenHash = _tokenService.HashToken(token);
        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        StoreRole role;
        try
        {
            role = ParseRole(req.Role);
        }
        catch (ArgumentException)
        {
            return BadRequest(new { error = "invalid_role" });
        }

        _db.TeamInviteTokens.Add(new TeamInviteToken
        {
            StoreId = storeId,
            Email = normalizedEmail,
            TokenHash = tokenHash,
            Role = role,
            CustomRoleName = req.CustomRoleName?.Trim(),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(2),
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedByUserId = Tenancy?.UserId
        });

        _db.AuditLogs.Add(new AuditLog
        {
            StoreId = storeId,
            ActorUserId = Tenancy?.UserId,
            Action = "store.team.invite_created",
            EntityType = "team_invite",
            EntityId = normalizedEmail,
            Details = $"role={role}",
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync(ct);
        var inviteUrl = $"{Request.Scheme}://{Request.Host}/auth/accept-invite?token={token}";
        var sent = await _emailService.SendInviteAsync(normalizedEmail, inviteUrl, role.ToString(), ct);
        return Ok(new { token, inviteUrl, emailSent = sent, expiresAt = DateTimeOffset.UtcNow.AddDays(2) });
    }

    [HttpPut("{userId:guid}")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> Update(Guid storeId, Guid userId, [FromBody] UpdateTeamMemberRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();

        var row = await _db.StoreUserRoles.FirstOrDefaultAsync(x => x.StoreId == storeId && x.UserId == userId, ct);
        if (row == null) return NotFound();

        try
        {
            row.Role = ParseRole(req.Role);
        }
        catch (ArgumentException)
        {
            return BadRequest(new { error = "invalid_role" });
        }
        row.CustomRoleName = req.CustomRoleName?.Trim();
        _db.AuditLogs.Add(new AuditLog
        {
            StoreId = storeId,
            ActorUserId = Tenancy?.UserId,
            Action = "store.team.role_updated",
            EntityType = "store_user_role",
            EntityId = userId.ToString(),
            Details = $"role={row.Role}",
            CreatedAt = DateTimeOffset.UtcNow
        });
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
        _db.AuditLogs.Add(new AuditLog
        {
            StoreId = storeId,
            ActorUserId = Tenancy?.UserId,
            Action = "store.team.member_removed",
            EntityType = "store_user_role",
            EntityId = userId.ToString(),
            CreatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static StoreRole ParseRole(string? raw)
    {
        if (!string.IsNullOrWhiteSpace(raw) && !AllowedRoles.Contains(raw.Trim()))
        {
            throw new ArgumentException("invalid_role");
        }
        if (Enum.TryParse<StoreRole>(raw, true, out var parsed))
        {
            return parsed;
        }
        return StoreRole.Staff;
    }
}

public class AddTeamMemberRequest
{
    [Required, EmailAddress, StringLength(320)]
    public string Email { get; set; } = string.Empty;
    [RegularExpression("^(Owner|Admin|Staff|Custom)$", ErrorMessage = "Invalid role.")]
    public string? Role { get; set; }
    [StringLength(120)]
    public string? CustomRoleName { get; set; }
}

public class UpdateTeamMemberRequest
{
    [RegularExpression("^(Owner|Admin|Staff|Custom)$", ErrorMessage = "Invalid role.")]
    public string? Role { get; set; }
    [StringLength(120)]
    public string? CustomRoleName { get; set; }
}
