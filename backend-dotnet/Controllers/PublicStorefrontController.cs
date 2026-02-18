using backend_dotnet.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/public/storefront")]
public class PublicStorefrontController : ControllerBase
{
    private readonly AppDbContext _db;

    public PublicStorefrontController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("{subdomain}")]
    public async Task<IActionResult> GetBySubdomain(string subdomain, CancellationToken ct)
    {
        var normalized = subdomain.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalized, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });

        var theme = await _db.StoreThemeConfigs.AsNoTracking()
            .Include(x => x.ActiveTheme)
            .FirstOrDefaultAsync(x => x.StoreId == store.Id, ct);
        var homepage = await _db.StoreHomepageLayouts.AsNoTracking().FirstOrDefaultAsync(x => x.StoreId == store.Id, ct);
        var nav = await _db.StoreNavigationMenus.AsNoTracking()
            .Where(x => x.StoreId == store.Id && x.IsPrimary)
            .OrderByDescending(x => x.UpdatedAt)
            .FirstOrDefaultAsync(ct);
        var pages = await _db.StoreStaticPages.AsNoTracking()
            .Where(x => x.StoreId == store.Id && x.IsPublished)
            .Select(x => new { x.Title, x.Slug, x.SeoTitle, x.SeoDescription })
            .ToListAsync(ct);
        var products = await _db.Products.AsNoTracking()
            .Where(x => x.StoreId == store.Id)
            .OrderByDescending(x => x.CreatedAt)
            .Take(24)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.Description,
                Price = (theme == null || theme.ShowPricing) ? x.Price : (decimal?)null,
                x.Currency
            })
            .ToListAsync(ct);

        return Ok(new
        {
            store = new { store.Id, store.Name, store.Subdomain, store.Currency, store.Timezone },
            theme = theme == null ? null : new
            {
                theme.ActiveThemeId,
                ActiveTheme = theme.ActiveTheme == null ? null : new { theme.ActiveTheme.Name, theme.ActiveTheme.Slug, theme.ActiveTheme.Category },
                theme.LogoUrl,
                theme.FaviconUrl,
                theme.HeaderJson,
                theme.FooterJson,
                theme.BannerJson,
                theme.DesignTokensJson,
                theme.ShowPricing,
                theme.LoginToViewPrice,
                theme.CatalogMode,
                theme.CatalogVisibilityJson
            },
            homepage = new { SectionsJson = homepage?.SectionsJson ?? "[]" },
            navigation = new { ItemsJson = nav?.ItemsJson ?? "[]" },
            pages,
            products
        });
    }

    [HttpGet("{subdomain}/pages/{slug}")]
    public async Task<IActionResult> GetPage(string subdomain, string slug, CancellationToken ct)
    {
        var normalizedSubdomain = subdomain.Trim().ToLowerInvariant();
        var normalizedSlug = slug.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });

        var page = await _db.StoreStaticPages.AsNoTracking()
            .FirstOrDefaultAsync(x => x.StoreId == store.Id && x.Slug == normalizedSlug && x.IsPublished, ct);
        if (page == null) return NotFound(new { error = "page_not_found" });

        return Ok(page);
    }
}
