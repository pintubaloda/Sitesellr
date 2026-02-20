using System.ComponentModel.DataAnnotations;

namespace backend_dotnet.Models;

public class ThemeCatalogItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;
    [Required, MaxLength(120)]
    public string Slug { get; set; } = string.Empty;
    [MaxLength(80)]
    public string Category { get; set; } = "General";
    [MaxLength(800)]
    public string Description { get; set; } = string.Empty;
    [MaxLength(1000)]
    public string PreviewUrl { get; set; } = string.Empty;
    public bool IsPaid { get; set; }
    public decimal Price { get; set; }
    [MaxLength(500)]
    public string AllowedPlanCodesCsv { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }
    public int FeaturedRank { get; set; }
    [MaxLength(60)]
    public string TypographyPack { get; set; } = "modern-sans";
    [MaxLength(60)]
    public string LayoutVariant { get; set; } = "default";
    [MaxLength(4000)]
    public string RuntimePackageJson { get; set; } = "{}";
    [MaxLength(2000)]
    public string TemplatesJson { get; set; } = "[\"homepage\",\"product_listing\",\"product_detail\",\"cart\",\"static_page\",\"checkout\"]";
    [MaxLength(4000)]
    public string SectionSchemasJson { get; set; } = "[]";
    [MaxLength(2000)]
    public string HookPointsJson { get; set; } = "[\"BeforePrice\",\"AfterPrice\",\"BeforeAddToCart\",\"AfterDescription\"]";
    [MaxLength(40)]
    public string ThemeVersion { get; set; } = "1.0.0";
    [MaxLength(4000)]
    public string PlpVariantsJson { get; set; } = "[]";
    [MaxLength(4000)]
    public string PdpVariantsJson { get; set; } = "[]";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class CampaignTemplateCatalogItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [Required, MaxLength(140)]
    public string Name { get; set; } = string.Empty;
    [Required, MaxLength(140)]
    public string Slug { get; set; } = string.Empty;
    [MaxLength(80)]
    public string Category { get; set; } = "Marketing";
    [MaxLength(1200)]
    public string Description { get; set; } = string.Empty;
    [MaxLength(4000)]
    public string SectionsJson { get; set; } = "[]";
    public bool IsPaid { get; set; }
    public decimal Price { get; set; }
    [MaxLength(500)]
    public string AllowedPlanCodesCsv { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }
    public int FeaturedRank { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class StoreCampaignTemplateSubscription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    public Guid TemplateId { get; set; }
    public CampaignTemplateCatalogItem Template { get; set; } = default!;
    [MaxLength(30)]
    public string Status { get; set; } = "active";
    [MaxLength(40)]
    public string BillingMode { get; set; } = "one_time";
    [MaxLength(40)]
    public string BillingStatus { get; set; } = "paid";
    public decimal ChargedAmount { get; set; }
    [MaxLength(8)]
    public string Currency { get; set; } = "INR";
    [MaxLength(80)]
    public string PlanCodeAtPurchase { get; set; } = string.Empty;
    [MaxLength(80)]
    public string PaymentReference { get; set; } = string.Empty;
    public DateTimeOffset PurchasedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class CampaignPaymentEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    public Guid? SubscriptionId { get; set; }
    public StoreCampaignTemplateSubscription? Subscription { get; set; }
    [MaxLength(40)]
    public string EventType { get; set; } = "payment_captured";
    [MaxLength(80)]
    public string Reference { get; set; } = string.Empty;
    [MaxLength(40)]
    public string Gateway { get; set; } = "manual";
    [MaxLength(40)]
    public string Status { get; set; } = "success";
    public decimal Amount { get; set; }
    [MaxLength(8)]
    public string Currency { get; set; } = "INR";
    [MaxLength(4000)]
    public string PayloadJson { get; set; } = "{}";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class StoreCustomerCredential
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = default!;
    [Required, MaxLength(320)]
    public string Email { get; set; } = string.Empty;
    [Required, MaxLength(400)]
    public string PasswordHash { get; set; } = string.Empty;
    public bool EmailVerified { get; set; }
    [MaxLength(128)]
    public string EmailVerificationCodeHash { get; set; } = string.Empty;
    public DateTimeOffset? EmailVerificationExpiresAt { get; set; }
    public bool MfaEnabled { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastLoginAt { get; set; }
}

public class StoreCustomerPasswordReset
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = default!;
    [Required, MaxLength(128)]
    public string TokenHash { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? UsedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class StoreCustomerMfaChallenge
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = default!;
    [Required, MaxLength(128)]
    public string CodeHash { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? VerifiedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class StoreCustomerSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = default!;
    [Required, MaxLength(128)]
    public string TokenHash { get; set; } = string.Empty;
    [MaxLength(60)]
    public string? UserAgent { get; set; }
    [MaxLength(64)]
    public string? ClientIp { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class StoreThemeConfig
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    public Guid? ActiveThemeId { get; set; }
    public ThemeCatalogItem? ActiveTheme { get; set; }
    [MaxLength(1000)]
    public string? LogoUrl { get; set; }
    [MaxLength(1000)]
    public string? FaviconUrl { get; set; }
    [MaxLength(4000)]
    public string? HeaderJson { get; set; }
    [MaxLength(4000)]
    public string? FooterJson { get; set; }
    [MaxLength(4000)]
    public string? BannerJson { get; set; }
    [MaxLength(4000)]
    public string? DesignTokensJson { get; set; }
    public bool ShowPricing { get; set; } = true;
    public bool LoginToViewPrice { get; set; }
    [MaxLength(20)]
    public string CatalogMode { get; set; } = "retail";
    [MaxLength(4000)]
    public string? CatalogVisibilityJson { get; set; }
    [MaxLength(320)]
    public string? QuoteAlertEmail { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class StoreMediaAsset
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    [Required, MaxLength(260)]
    public string FileName { get; set; } = string.Empty;
    [Required, MaxLength(120)]
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    [Required, MaxLength(1000)]
    public string Url { get; set; } = string.Empty;
    [MaxLength(80)]
    public string Kind { get; set; } = "generic";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class StoreDomain
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    [Required, MaxLength(255)]
    public string Hostname { get; set; } = string.Empty;
    [MaxLength(120)]
    public string VerificationToken { get; set; } = string.Empty;
    public bool IsVerified { get; set; }
    [MaxLength(40)]
    public string SslProvider { get; set; } = "letsencrypt";
    [MaxLength(30)]
    public string SslStatus { get; set; } = "pending";
    [MaxLength(500)]
    public string? LastError { get; set; }
    public bool DnsManagedByCloudflare { get; set; }
    [MaxLength(40)]
    public string DnsStatus { get; set; } = "pending";
    public bool SslPurchased { get; set; }
    [MaxLength(120)]
    public string? SslPurchaseReference { get; set; }
    public DateTimeOffset? SslPurchasedAt { get; set; }
    public DateTimeOffset? SslExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class StoreHomepageLayout
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    [MaxLength(4000)]
    public string SectionsJson { get; set; } = "[]";
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class StorefrontLayoutVersion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    [MaxLength(4000)]
    public string SectionsJson { get; set; } = "[]";
    [MaxLength(20)]
    public string VersionType { get; set; } = "draft";
    public int VersionNumber { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class StorefrontEditSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    public Guid UserId { get; set; }
    [MaxLength(120)]
    public string EditorName { get; set; } = string.Empty;
    [MaxLength(40)]
    public string Status { get; set; } = "active";
    public DateTimeOffset LastSeenAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class StoreNavigationMenu
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    [MaxLength(120)]
    public string Name { get; set; } = "Main";
    [MaxLength(4000)]
    public string ItemsJson { get; set; } = "[]";
    public bool IsPrimary { get; set; } = true;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class StoreStaticPage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    [Required, MaxLength(160)]
    public string Title { get; set; } = string.Empty;
    [Required, MaxLength(200)]
    public string Slug { get; set; } = string.Empty;
    [MaxLength(10000)]
    public string Content { get; set; } = string.Empty;
    [MaxLength(160)]
    public string? SeoTitle { get; set; }
    [MaxLength(400)]
    public string? SeoDescription { get; set; }
    public bool IsPublished { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class StoreQuoteInquiry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    [MaxLength(320)]
    public string Email { get; set; } = string.Empty;
    [MaxLength(20)]
    public string Phone { get; set; } = string.Empty;
    [MaxLength(1200)]
    public string Message { get; set; } = string.Empty;
    [MaxLength(40)]
    public string Status { get; set; } = "new";
    public Guid? AssignedToUserId { get; set; }
    public User? AssignedToUser { get; set; }
    [MaxLength(20)]
    public string Priority { get; set; } = "normal";
    public DateTimeOffset? SlaDueAt { get; set; }
    public DateTimeOffset? LastNotifiedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
