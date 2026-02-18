using System.ComponentModel.DataAnnotations;
using System.IO;
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
[Route("api/stores/{storeId:guid}/storefront")]
public class StorefrontController : ControllerBase
{
    private readonly AppDbContext _db;
    private TenancyContext? Tenancy => HttpContext.Items["Tenancy"] as TenancyContext;

    public StorefrontController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("themes")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> GetThemes(Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();

        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(s => s.Id == storeId, ct);
        if (store == null) return NotFound();

        var sub = await _db.MerchantSubscriptions.AsNoTracking()
            .Include(x => x.Plan)
            .Where(x => x.MerchantId == store.MerchantId && !x.IsCancelled)
            .OrderByDescending(x => x.StartedAt)
            .FirstOrDefaultAsync(ct);
        var planCode = sub?.Plan?.Code?.Trim().ToLowerInvariant() ?? string.Empty;

        var items = await _db.ThemeCatalogItems.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Name)
            .ToListAsync(ct);

        var data = items.Select(t =>
        {
            var allowedCodes = ParseCodes(t.AllowedPlanCodesCsv);
            var planAllowed = !t.IsPaid || allowedCodes.Count == 0 || allowedCodes.Contains(planCode);
            return new
            {
                t.Id,
                t.Name,
                t.Slug,
                t.Category,
                t.Description,
                t.PreviewUrl,
                t.IsPaid,
                t.Price,
                t.AllowedPlanCodesCsv,
                PlanAllowed = planAllowed
            };
        });
        return Ok(data);
    }

    [HttpPost("themes/{themeId:guid}/apply")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> ApplyTheme(Guid storeId, Guid themeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(s => s.Id == storeId, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });

        var theme = await _db.ThemeCatalogItems.AsNoTracking().FirstOrDefaultAsync(t => t.Id == themeId && t.IsActive, ct);
        if (theme == null) return NotFound(new { error = "theme_not_found" });

        if (theme.IsPaid)
        {
            var allowedCodes = ParseCodes(theme.AllowedPlanCodesCsv);
            if (allowedCodes.Count > 0)
            {
                var sub = await _db.MerchantSubscriptions.AsNoTracking()
                    .Include(x => x.Plan)
                    .Where(x => x.MerchantId == store.MerchantId && !x.IsCancelled)
                    .OrderByDescending(x => x.StartedAt)
                    .FirstOrDefaultAsync(ct);
                var planCode = sub?.Plan?.Code?.Trim().ToLowerInvariant() ?? string.Empty;
                if (!allowedCodes.Contains(planCode))
                    return BadRequest(new { error = "plan_not_eligible_for_theme" });
            }
        }

        var config = await _db.StoreThemeConfigs.FirstOrDefaultAsync(x => x.StoreId == storeId, ct);
        if (config == null)
        {
            config = new StoreThemeConfig { StoreId = storeId };
            _db.StoreThemeConfigs.Add(config);
        }
        config.ActiveThemeId = theme.Id;
        config.UpdatedAt = DateTimeOffset.UtcNow;

        _db.AuditLogs.Add(new AuditLog
        {
            StoreId = storeId,
            ActorUserId = Tenancy?.UserId,
            Action = "storefront.theme.applied",
            EntityType = "theme_catalog_item",
            EntityId = theme.Id.ToString(),
            Details = $"theme={theme.Slug}",
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync(ct);
        return Ok(new { applied = true, themeId = theme.Id, theme.Name, theme.Slug });
    }

    [HttpGet("settings")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> GetSettings(Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var settings = await _db.StoreThemeConfigs.AsNoTracking().FirstOrDefaultAsync(x => x.StoreId == storeId, ct);
        return Ok(settings ?? new StoreThemeConfig { StoreId = storeId });
    }

    [HttpPut("settings")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> UpsertSettings(Guid storeId, [FromBody] StoreThemeSettingsRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var storeExists = await _db.Stores.AsNoTracking().AnyAsync(s => s.Id == storeId, ct);
        if (!storeExists) return NotFound(new { error = "store_not_found" });

        var config = await _db.StoreThemeConfigs.FirstOrDefaultAsync(x => x.StoreId == storeId, ct);
        if (config == null)
        {
            config = new StoreThemeConfig { StoreId = storeId };
            _db.StoreThemeConfigs.Add(config);
        }

        config.LogoUrl = req.LogoUrl?.Trim();
        config.FaviconUrl = req.FaviconUrl?.Trim();
        config.HeaderJson = req.HeaderJson?.Trim();
        config.FooterJson = req.FooterJson?.Trim();
        config.BannerJson = req.BannerJson?.Trim();
        config.DesignTokensJson = req.DesignTokensJson?.Trim();
        config.ShowPricing = req.ShowPricing;
        config.LoginToViewPrice = req.LoginToViewPrice;
        config.CatalogMode = string.IsNullOrWhiteSpace(req.CatalogMode) ? "retail" : req.CatalogMode.Trim().ToLowerInvariant();
        config.CatalogVisibilityJson = req.CatalogVisibilityJson?.Trim();
        config.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);
        return Ok(config);
    }

    [HttpPost("media/upload")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> UploadMedia(Guid storeId, [FromForm] IFormFile file, [FromForm] string? kind, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        if (file == null || file.Length == 0) return BadRequest(new { error = "file_required" });
        if (file.Length > 10_000_000) return BadRequest(new { error = "file_too_large" });

        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"
        };
        if (!allowed.Contains(file.ContentType)) return BadRequest(new { error = "unsupported_content_type" });

        var webRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var uploadDir = Path.Combine(webRoot, "uploads", storeId.ToString("N"));
        Directory.CreateDirectory(uploadDir);

        var safeName = $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}{Path.GetExtension(file.FileName)}";
        var savePath = Path.Combine(uploadDir, safeName);
        await using (var stream = System.IO.File.Create(savePath))
        {
            await file.CopyToAsync(stream, ct);
        }

        var relativeUrl = $"/uploads/{storeId:N}/{safeName}";
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var cdnBase = Environment.GetEnvironmentVariable("ASSET_BASE_URL");
        var assetUrl = string.IsNullOrWhiteSpace(cdnBase) ? $"{baseUrl}{relativeUrl}" : $"{cdnBase.TrimEnd('/')}{relativeUrl}";

        var row = new StoreMediaAsset
        {
            StoreId = storeId,
            FileName = file.FileName,
            ContentType = file.ContentType,
            SizeBytes = file.Length,
            Url = assetUrl,
            Kind = string.IsNullOrWhiteSpace(kind) ? "generic" : kind.Trim().ToLowerInvariant(),
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.StoreMediaAssets.Add(row);
        await _db.SaveChangesAsync(ct);
        return Ok(row);
    }

    [HttpGet("media")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> ListMedia(Guid storeId, [FromQuery] string? kind, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var q = _db.StoreMediaAssets.AsNoTracking().Where(x => x.StoreId == storeId);
        if (!string.IsNullOrWhiteSpace(kind))
        {
            var normalized = kind.Trim().ToLowerInvariant();
            q = q.Where(x => x.Kind == normalized);
        }
        var rows = await q.OrderByDescending(x => x.CreatedAt).Take(200).ToListAsync(ct);
        return Ok(rows);
    }

    [HttpGet("homepage-layout")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> GetHomepageLayout(Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var layout = await _db.StoreHomepageLayouts.AsNoTracking().FirstOrDefaultAsync(x => x.StoreId == storeId, ct);
        return Ok(layout ?? new StoreHomepageLayout { StoreId = storeId, SectionsJson = "[]" });
    }

    [HttpPut("homepage-layout")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> UpsertHomepageLayout(Guid storeId, [FromBody] HomepageLayoutRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        if (!IsValidJsonArray(req.SectionsJson)) return BadRequest(new { error = "sections_must_be_json_array" });
        var layout = await _db.StoreHomepageLayouts.FirstOrDefaultAsync(x => x.StoreId == storeId, ct);
        if (layout == null)
        {
            layout = new StoreHomepageLayout { StoreId = storeId };
            _db.StoreHomepageLayouts.Add(layout);
        }
        layout.SectionsJson = req.SectionsJson.Trim();
        layout.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(layout);
    }

    [HttpGet("navigation")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> GetNavigation(Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var nav = await _db.StoreNavigationMenus.AsNoTracking()
            .Where(x => x.StoreId == storeId && x.IsPrimary)
            .OrderByDescending(x => x.UpdatedAt)
            .FirstOrDefaultAsync(ct);
        return Ok(nav ?? new StoreNavigationMenu { StoreId = storeId, Name = "Main", IsPrimary = true, ItemsJson = "[]" });
    }

    [HttpPut("navigation")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> UpsertNavigation(Guid storeId, [FromBody] NavigationUpdateRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        if (!IsValidJsonArray(req.ItemsJson)) return BadRequest(new { error = "items_must_be_json_array" });

        var nav = await _db.StoreNavigationMenus.FirstOrDefaultAsync(x => x.StoreId == storeId && x.IsPrimary, ct);
        if (nav == null)
        {
            nav = new StoreNavigationMenu { StoreId = storeId, IsPrimary = true, Name = "Main" };
            _db.StoreNavigationMenus.Add(nav);
        }
        nav.ItemsJson = req.ItemsJson.Trim();
        nav.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(nav);
    }

    [HttpGet("pages")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> GetPages(Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var pages = await _db.StoreStaticPages.AsNoTracking().Where(x => x.StoreId == storeId)
            .OrderBy(x => x.Title)
            .ToListAsync(ct);
        return Ok(pages);
    }

    [HttpPost("pages")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> CreatePage(Guid storeId, [FromBody] StaticPageRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var slug = req.Slug.Trim().ToLowerInvariant();
        var exists = await _db.StoreStaticPages.AsNoTracking().AnyAsync(x => x.StoreId == storeId && x.Slug == slug, ct);
        if (exists) return Conflict(new { error = "page_slug_exists" });

        var page = new StoreStaticPage
        {
            StoreId = storeId,
            Title = req.Title.Trim(),
            Slug = slug,
            Content = req.Content?.Trim() ?? string.Empty,
            SeoTitle = req.SeoTitle?.Trim(),
            SeoDescription = req.SeoDescription?.Trim(),
            IsPublished = req.IsPublished,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.StoreStaticPages.Add(page);
        await _db.SaveChangesAsync(ct);
        return Ok(page);
    }

    [HttpPut("pages/{pageId:guid}")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> UpdatePage(Guid storeId, Guid pageId, [FromBody] StaticPageRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var page = await _db.StoreStaticPages.FirstOrDefaultAsync(x => x.Id == pageId && x.StoreId == storeId, ct);
        if (page == null) return NotFound();

        var slug = req.Slug.Trim().ToLowerInvariant();
        var exists = await _db.StoreStaticPages.AsNoTracking()
            .AnyAsync(x => x.StoreId == storeId && x.Slug == slug && x.Id != pageId, ct);
        if (exists) return Conflict(new { error = "page_slug_exists" });

        page.Title = req.Title.Trim();
        page.Slug = slug;
        page.Content = req.Content?.Trim() ?? string.Empty;
        page.SeoTitle = req.SeoTitle?.Trim();
        page.SeoDescription = req.SeoDescription?.Trim();
        page.IsPublished = req.IsPublished;
        page.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(page);
    }

    [HttpDelete("pages/{pageId:guid}")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> DeletePage(Guid storeId, Guid pageId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var page = await _db.StoreStaticPages.FirstOrDefaultAsync(x => x.Id == pageId && x.StoreId == storeId, ct);
        if (page == null) return NotFound();
        _db.StoreStaticPages.Remove(page);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static HashSet<string> ParseCodes(string csv)
    {
        return csv.Split(",", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => x.Trim().ToLowerInvariant())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    private static bool IsValidJsonArray(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.ValueKind == JsonValueKind.Array;
        }
        catch
        {
            return false;
        }
    }
}

[ApiController]
[Route("api/platform/themes")]
[Authorize(Policy = Policies.PlatformOwner)]
public class PlatformThemesController : ControllerBase
{
    private readonly AppDbContext _db;

    public PlatformThemesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var rows = await _db.ThemeCatalogItems.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ThemeCatalogCreateRequest req, CancellationToken ct)
    {
        var slug = req.Slug.Trim().ToLowerInvariant();
        var exists = await _db.ThemeCatalogItems.AsNoTracking().AnyAsync(x => x.Slug == slug, ct);
        if (exists) return Conflict(new { error = "slug_exists" });
        var row = new ThemeCatalogItem
        {
            Name = req.Name.Trim(),
            Slug = slug,
            Category = req.Category?.Trim() ?? "General",
            Description = req.Description?.Trim() ?? string.Empty,
            PreviewUrl = req.PreviewUrl?.Trim() ?? string.Empty,
            IsPaid = req.IsPaid,
            Price = req.Price,
            AllowedPlanCodesCsv = req.AllowedPlanCodesCsv?.Trim().ToLowerInvariant() ?? string.Empty,
            IsActive = req.IsActive,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _db.ThemeCatalogItems.Add(row);
        await _db.SaveChangesAsync(ct);
        return Ok(row);
    }
}

public class StoreThemeSettingsRequest
{
    [StringLength(1000)]
    public string? LogoUrl { get; set; }
    [StringLength(1000)]
    public string? FaviconUrl { get; set; }
    [StringLength(4000)]
    public string? HeaderJson { get; set; }
    [StringLength(4000)]
    public string? FooterJson { get; set; }
    [StringLength(4000)]
    public string? BannerJson { get; set; }
    [StringLength(4000)]
    public string? DesignTokensJson { get; set; }
    public bool ShowPricing { get; set; } = true;
    public bool LoginToViewPrice { get; set; }
    [RegularExpression("^(retail|wholesale|hybrid)$", ErrorMessage = "Invalid catalog mode.")]
    public string CatalogMode { get; set; } = "retail";
    [StringLength(4000)]
    public string? CatalogVisibilityJson { get; set; }
}

public class HomepageLayoutRequest
{
    [Required, StringLength(4000)]
    public string SectionsJson { get; set; } = "[]";
}

public class NavigationUpdateRequest
{
    [Required, StringLength(4000)]
    public string ItemsJson { get; set; } = "[]";
}

public class StaticPageRequest
{
    [Required, StringLength(160, MinimumLength = 2)]
    public string Title { get; set; } = string.Empty;
    [Required, RegularExpression("^[a-z0-9\\-/]+$", ErrorMessage = "Slug allows a-z, 0-9, -, / only.")]
    public string Slug { get; set; } = string.Empty;
    [StringLength(10000)]
    public string? Content { get; set; }
    [StringLength(160)]
    public string? SeoTitle { get; set; }
    [StringLength(400)]
    public string? SeoDescription { get; set; }
    public bool IsPublished { get; set; }
}

public class ThemeCatalogCreateRequest
{
    [Required, StringLength(120, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;
    [Required, RegularExpression("^[a-z0-9-]+$", ErrorMessage = "Slug allows a-z, 0-9 and -.")]
    public string Slug { get; set; } = string.Empty;
    [StringLength(80)]
    public string? Category { get; set; }
    [StringLength(800)]
    public string? Description { get; set; }
    [StringLength(1000)]
    public string? PreviewUrl { get; set; }
    public bool IsPaid { get; set; }
    [Range(0, 999999)]
    public decimal Price { get; set; }
    [StringLength(500)]
    public string? AllowedPlanCodesCsv { get; set; }
    public bool IsActive { get; set; } = true;
}
