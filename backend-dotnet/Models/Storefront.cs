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
