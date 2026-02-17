using System.ComponentModel.DataAnnotations;

namespace backend_dotnet.Models;

public class BillingPlan
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(120)] public string Name { get; set; } = string.Empty;
    [MaxLength(50)] public string Code { get; set; } = string.Empty;
    public decimal PricePerMonth { get; set; }
    public int TrialDays { get; set; } = 14;
    public int MaxStores { get; set; } = 1;
    public int MaxProducts { get; set; } = 1000;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class MerchantSubscription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MerchantId { get; set; }
    public Merchant Merchant { get; set; } = default!;

    public Guid PlanId { get; set; }
    public BillingPlan Plan { get; set; } = default!;

    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? TrialEndsAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public bool IsCancelled { get; set; } = false;
}
