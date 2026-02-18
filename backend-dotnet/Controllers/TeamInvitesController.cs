using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/team-invites")]
public class TeamInvitesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokenService;

    public TeamInvitesController(AppDbContext db, ITokenService tokenService)
    {
        _db = db;
        _tokenService = tokenService;
    }

    [HttpPost("accept")]
    public async Task<IActionResult> Accept([FromBody] AcceptInviteRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Token) || string.IsNullOrWhiteSpace(req.Password) || req.Password.Length < 8)
            return BadRequest(new { error = "invalid_input" });

        var tokenHash = _tokenService.HashToken(req.Token.Trim());
        var invite = await _db.TeamInviteTokens.FirstOrDefaultAsync(x => x.TokenHash == tokenHash, ct);
        if (invite == null || invite.AcceptedAt != null || invite.ExpiresAt < DateTimeOffset.UtcNow)
            return BadRequest(new { error = "invalid_or_expired_invite" });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == invite.Email, ct);
        if (user == null)
        {
            user = new User
            {
                Email = invite.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, workFactor: 12),
                IsLocked = false,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync(ct);
        }
        else
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, workFactor: 12);
            user.IsLocked = false;
            user.UpdatedAt = DateTimeOffset.UtcNow;
        }

        var existingRole = await _db.StoreUserRoles.FirstOrDefaultAsync(x => x.StoreId == invite.StoreId && x.UserId == user.Id, ct);
        if (existingRole == null)
        {
            _db.StoreUserRoles.Add(new StoreUserRole
            {
                StoreId = invite.StoreId,
                UserId = user.Id,
                Role = invite.Role,
                CustomRoleName = invite.CustomRoleName,
                CreatedAt = DateTimeOffset.UtcNow
            });
        }
        else
        {
            existingRole.Role = invite.Role;
            existingRole.CustomRoleName = invite.CustomRoleName;
        }

        invite.AcceptedAt = DateTimeOffset.UtcNow;
        _db.AuditLogs.Add(new AuditLog
        {
            StoreId = invite.StoreId,
            ActorUserId = user.Id,
            Action = "store.team.invite_accepted",
            EntityType = "team_invite",
            EntityId = invite.Id.ToString(),
            Details = $"email={invite.Email};role={invite.Role}",
            CreatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync(ct);

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var ua = HttpContext.Request.Headers.UserAgent.ToString();
        var (access, refresh, _, _) = await _tokenService.IssueAsync(user, scope: null, clientIp: ip, userAgent: ua, ct);
        return Ok(new { access_token = access, refresh_token = refresh, storeId = invite.StoreId });
    }
}
