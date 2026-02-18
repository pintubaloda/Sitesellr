using System.ComponentModel.DataAnnotations;

namespace backend_dotnet.Models;

public class TeamInviteToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    [Required, MaxLength(320)]
    public string Email { get; set; } = string.Empty;
    [Required, MaxLength(128)]
    public string TokenHash { get; set; } = string.Empty;
    public StoreRole Role { get; set; } = StoreRole.Staff;
    [MaxLength(120)]
    public string? CustomRoleName { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? AcceptedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Guid? CreatedByUserId { get; set; }
}

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? MerchantId { get; set; }
    public Guid? StoreId { get; set; }
    public Guid? ActorUserId { get; set; }
    [Required, MaxLength(80)]
    public string Action { get; set; } = string.Empty;
    [MaxLength(80)]
    public string? EntityType { get; set; }
    [MaxLength(80)]
    public string? EntityId { get; set; }
    [MaxLength(2000)]
    public string? Details { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public record CreateInviteRequest(string Email, string? Role, string? CustomRoleName);
public record AcceptInviteRequest(string Token, string Password);
