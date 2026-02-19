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
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
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
