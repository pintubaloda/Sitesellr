using System.Text.Json;
using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using backend_dotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/merchant-ops")]
[Authorize(Policy = Policies.PlatformStaffRead)]
public class MerchantOpsController : ControllerBase
{
    private readonly AppDbContext _db;

    public MerchantOpsController(AppDbContext db)
    {
        _db = db;
    }

    private TenancyContext? Tenancy => HttpContext.Items["Tenancy"] as TenancyContext;

    [HttpPost("{merchantId:guid}/lifecycle")]
    public async Task<IActionResult> ChangeLifecycle(Guid merchantId, [FromBody] MerchantLifecycleRequest req, CancellationToken ct)
    {
        var merchant = await _db.Merchants.FirstOrDefaultAsync(x => x.Id == merchantId, ct);
        if (merchant == null) return NotFound();

        var action = (req.Action ?? "").Trim().ToLowerInvariant();
        var sensitive = action is "suspend" or "expire";
        if (sensitive && req.RequireApproval)
        {
            _db.SensitiveActionApprovals.Add(new SensitiveActionApproval
            {
                ActionType = $"merchant.lifecycle.{action}",
                EntityType = "merchant",
                EntityId = merchantId.ToString(),
                RequestedByUserId = Tenancy?.UserId ?? Guid.Empty,
                PayloadJson = JsonSerializer.Serialize(req),
                Status = "pending",
                CreatedAt = DateTimeOffset.UtcNow
            });
            await _db.SaveChangesAsync(ct);
            return Ok(new { queuedForApproval = true });
        }

        var previous = merchant.Status;
        merchant.Status = action switch
        {
            "activate" => MerchantStatus.Active,
            "suspend" => MerchantStatus.Suspended,
            "expire" => MerchantStatus.Expired,
            "reactivate" => MerchantStatus.Active,
            "trial" => MerchantStatus.Trial,
            _ => merchant.Status
        };
        merchant.UpdatedAt = DateTimeOffset.UtcNow;

        _db.AuditLogs.Add(new AuditLog
        {
            MerchantId = merchant.Id,
            ActorUserId = Tenancy?.UserId,
            Action = "merchant.lifecycle.changed",
            EntityType = "merchant",
            EntityId = merchant.Id.ToString(),
            Details = $"{previous}->{merchant.Status};reason={req.Reason}",
            CreatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync(ct);
        return Ok(merchant);
    }

    [HttpGet("{merchantId:guid}/onboarding")]
    public async Task<IActionResult> GetOnboarding(Guid merchantId, CancellationToken ct)
    {
        var profile = await _db.MerchantOnboardingProfiles.AsNoTracking().FirstOrDefaultAsync(x => x.MerchantId == merchantId, ct);
        if (profile == null)
        {
            return Ok(new MerchantOnboardingProfile
            {
                MerchantId = merchantId,
                PipelineStatus = "pending"
            });
        }
        return Ok(profile);
    }

    [HttpPut("{merchantId:guid}/onboarding")]
    [Authorize(Policy = Policies.PlatformOwner)]
    public async Task<IActionResult> UpdateOnboarding(Guid merchantId, [FromBody] MerchantOnboardingUpdateRequest req, CancellationToken ct)
    {
        var merchant = await _db.Merchants.FirstOrDefaultAsync(x => x.Id == merchantId, ct);
        if (merchant == null) return NotFound();

        var profile = await _db.MerchantOnboardingProfiles.FirstOrDefaultAsync(x => x.MerchantId == merchantId, ct);
        if (profile == null)
        {
            profile = new MerchantOnboardingProfile { MerchantId = merchantId };
            _db.MerchantOnboardingProfiles.Add(profile);
        }

        profile.EmailVerified = req.EmailVerified;
        profile.MobileVerified = req.MobileVerified;
        profile.KycVerified = req.KycVerified;
        profile.OpsApproved = req.OpsApproved;
        profile.RiskApproved = req.RiskApproved;
        profile.PipelineStatus = req.PipelineStatus?.Trim().ToLowerInvariant() ?? "pending";
        profile.UpdatedAt = DateTimeOffset.UtcNow;

        _db.AuditLogs.Add(new AuditLog
        {
            MerchantId = merchantId,
            ActorUserId = Tenancy?.UserId,
            Action = "merchant.onboarding.updated",
            EntityType = "merchant_onboarding_profile",
            EntityId = merchantId.ToString(),
            Details = JsonSerializer.Serialize(req),
            CreatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync(ct);
        return Ok(profile);
    }

    [HttpGet("approvals")]
    public async Task<IActionResult> ListApprovals([FromQuery] string? status, CancellationToken ct)
    {
        var q = _db.SensitiveActionApprovals.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(x => x.Status == status);
        var items = await q.OrderByDescending(x => x.CreatedAt).Take(200).ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost("approvals/{id:guid}/approve")]
    [Authorize(Policy = Policies.PlatformOwner)]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        var item = await _db.SensitiveActionApprovals.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (item == null) return NotFound();
        item.Status = "approved";
        item.ApprovedByUserId = Tenancy?.UserId;
        item.ApprovedAt = DateTimeOffset.UtcNow;

        if (item.ActionType.StartsWith("merchant.lifecycle.", StringComparison.OrdinalIgnoreCase) &&
            Guid.TryParse(item.EntityId, out var merchantId))
        {
            var merchant = await _db.Merchants.FirstOrDefaultAsync(x => x.Id == merchantId, ct);
            if (merchant != null)
            {
                var action = item.ActionType.Replace("merchant.lifecycle.", "", StringComparison.OrdinalIgnoreCase);
                merchant.Status = action switch
                {
                    "activate" => MerchantStatus.Active,
                    "suspend" => MerchantStatus.Suspended,
                    "expire" => MerchantStatus.Expired,
                    "reactivate" => MerchantStatus.Active,
                    "trial" => MerchantStatus.Trial,
                    _ => merchant.Status
                };
                merchant.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }

        await _db.SaveChangesAsync(ct);
        return Ok(item);
    }

    [HttpGet("{merchantId:guid}/franchise")]
    public async Task<IActionResult> ListFranchise(Guid merchantId, CancellationToken ct)
    {
        var units = await _db.FranchiseUnits.AsNoTracking().Where(x => x.MerchantId == merchantId).ToListAsync(ct);
        return Ok(units);
    }

    [HttpPost("{merchantId:guid}/franchise")]
    [Authorize(Policy = Policies.PlatformOwner)]
    public async Task<IActionResult> AddFranchise(Guid merchantId, [FromBody] FranchiseCreateRequest req, CancellationToken ct)
    {
        var unit = new FranchiseUnit { MerchantId = merchantId, Name = req.Name.Trim(), CreatedAt = DateTimeOffset.UtcNow };
        _db.FranchiseUnits.Add(unit);
        await _db.SaveChangesAsync(ct);
        return Ok(unit);
    }

    [HttpGet("{merchantId:guid}/backoffice")]
    public async Task<IActionResult> ListBackoffice(Guid merchantId, CancellationToken ct)
    {
        var rows = await _db.BackofficeAssignments.AsNoTracking()
            .Include(x => x.User)
            .Where(x => x.MerchantId == merchantId)
            .Select(x => new { x.Id, x.UserId, x.User.Email, x.Scope, x.Department, x.StoreScopeId, x.CreatedAt })
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost("{merchantId:guid}/backoffice")]
    [Authorize(Policy = Policies.PlatformOwner)]
    public async Task<IActionResult> AddBackoffice(Guid merchantId, [FromBody] BackofficeCreateRequest req, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Email == req.Email.Trim().ToLowerInvariant(), ct);
        if (user == null) return NotFound(new { error = "user_not_found" });
        var row = new BackofficeAssignment
        {
            MerchantId = merchantId,
            UserId = user.Id,
            Scope = string.IsNullOrWhiteSpace(req.Scope) ? "merchant" : req.Scope.Trim(),
            Department = string.IsNullOrWhiteSpace(req.Department) ? "support" : req.Department.Trim(),
            StoreScopeId = req.StoreScopeId,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.BackofficeAssignments.Add(row);
        await _db.SaveChangesAsync(ct);
        return Ok(row);
    }
}

public record MerchantLifecycleRequest(string? Action, string? Reason, bool RequireApproval = false);
public record MerchantOnboardingUpdateRequest(bool EmailVerified, bool MobileVerified, bool KycVerified, bool OpsApproved, bool RiskApproved, string? PipelineStatus);
public record FranchiseCreateRequest(string Name);
public record BackofficeCreateRequest(string Email, string? Scope, string? Department, Guid? StoreScopeId);
