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
    public int MaxVariantsPerProduct { get; set; } = 100;
    public int MaxCategories { get; set; } = 100;
    public int MaxPaymentGateways { get; set; } = 1;
    [MaxLength(500)] public string AllowedGatewayTypesJson { get; set; } = "[]";
    public bool CodEnabled { get; set; } = true;
    public bool SmsEnabled { get; set; }
    public int SmsQuotaMonthly { get; set; }
    public bool EmailEnabled { get; set; } = true;
    public int EmailQuotaMonthly { get; set; } = 5000;
    public bool WhatsappEnabled { get; set; }
    [MaxLength(40)] public string WhatsappFeaturesTier { get; set; } = "none";
    public int MaxPluginsInstalled { get; set; } = 2;
    [MaxLength(500)] public string AllowedPluginTiersJson { get; set; } = "[]";
    public bool PaidPluginsAllowed { get; set; }
    [MaxLength(40)] public string AllowedThemeTier { get; set; } = "free";
    public int MaxThemeInstalls { get; set; } = 1;
    public bool PremiumThemeAccess { get; set; }
    [MaxLength(4000)] public string CapabilitiesJson { get; set; } = "{}";
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

public class StoreUsageCounter
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    [MaxLength(20)] public string PeriodKey { get; set; } = string.Empty; // yyyy-MM
    public int SmsSent { get; set; }
    public int EmailSent { get; set; }
    public int WhatsappMessagesSent { get; set; }
    public int PluginsInstalled { get; set; }
    public int ThemeInstalls { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
