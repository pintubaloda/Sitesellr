using System.ComponentModel.DataAnnotations;

namespace backend_dotnet.Models;

public class MerchantOnboardingProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MerchantId { get; set; }
    public Merchant Merchant { get; set; } = default!;
    public bool EmailVerified { get; set; }
    public bool MobileVerified { get; set; }
    public bool KycVerified { get; set; }
    public bool OpsApproved { get; set; }
    public bool RiskApproved { get; set; }
    [MaxLength(80)]
    public string PipelineStatus { get; set; } = "pending";
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class StoreRoleTemplate
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    [Required, MaxLength(80)]
    public string Name { get; set; } = string.Empty;
    [Required, MaxLength(2000)]
    public string PermissionsCsv { get; set; } = string.Empty;
    public bool IsSensitive { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class SensitiveActionApproval
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(120)]
    public string ActionType { get; set; } = string.Empty;
    [MaxLength(80)]
    public string? EntityType { get; set; }
    [MaxLength(80)]
    public string? EntityId { get; set; }
    [MaxLength(4000)]
    public string? PayloadJson { get; set; }
    public Guid RequestedByUserId { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    [MaxLength(30)]
    public string Status { get; set; } = "pending";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ApprovedAt { get; set; }
}

public class FranchiseUnit
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MerchantId { get; set; }
    public Merchant Merchant { get; set; } = default!;
    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class FranchiseStore
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FranchiseUnitId { get; set; }
    public FranchiseUnit FranchiseUnit { get; set; } = default!;
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
}

public class BackofficeAssignment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MerchantId { get; set; }
    public Merchant Merchant { get; set; } = default!;
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;
    public Guid? StoreScopeId { get; set; }
    public Store? StoreScope { get; set; }
    [MaxLength(80)]
    public string Scope { get; set; } = "merchant";
    [MaxLength(80)]
    public string Department { get; set; } = "support";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
