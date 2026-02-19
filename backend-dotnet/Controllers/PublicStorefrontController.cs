using backend_dotnet.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Nodes;
using System.ComponentModel.DataAnnotations;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/public/storefront")]
public class PublicStorefrontController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly backend_dotnet.Services.IEmailService _emailService;

    public PublicStorefrontController(AppDbContext db, backend_dotnet.Services.IEmailService emailService)
    {
        _db = db;
        _emailService = emailService;
    }

    [HttpGet("{subdomain}")]
    public async Task<IActionResult> GetBySubdomain(string subdomain, [FromQuery] Guid? customerGroupId, CancellationToken ct)
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
        var rules = await _db.VisibilityRules.AsNoTracking()
            .Where(x => x.StoreId == store.Id && x.IsActive && (x.CustomerGroupId == null || x.CustomerGroupId == customerGroupId))
            .ToListAsync(ct);
        var productRules = rules.Where(x => x.TargetType == "product").ToList();
        var pageRules = rules.Where(x => x.TargetType == "page").ToList();
        var blockRules = rules.Where(x => x.TargetType == "theme_block").ToList();

        var pages = await _db.StoreStaticPages.AsNoTracking()
            .Where(x => x.StoreId == store.Id && x.IsPublished)
            .Select(x => new { x.Title, x.Slug, x.SeoTitle, x.SeoDescription })
            .ToListAsync(ct);
        pages = ApplyVisibility(pages, x => x.Slug.ToLowerInvariant(), pageRules).ToList();

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
        products = ApplyVisibility(products, x => x.Id.ToString().ToLowerInvariant(), productRules).ToList();

        var filteredSectionsJson = FilterThemeBlocks(homepage?.SectionsJson ?? "[]", blockRules);

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
            homepage = new { SectionsJson = filteredSectionsJson },
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

    [HttpPost("{subdomain}/quote-inquiries")]
    public async Task<IActionResult> CreateQuoteInquiry(string subdomain, [FromBody] QuoteInquiryCreateRequest req, CancellationToken ct)
    {
        var normalizedSubdomain = subdomain.Trim().ToLowerInvariant();
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (store == null) return NotFound(new { error = "store_not_found" });

        if (req.ProductId.HasValue)
        {
            var productExists = await _db.Products.AsNoTracking().AnyAsync(x => x.StoreId == store.Id && x.Id == req.ProductId.Value, ct);
            if (!productExists) return BadRequest(new { error = "invalid_product_id" });
        }

        var row = new Models.StoreQuoteInquiry
        {
            StoreId = store.Id,
            ProductId = req.ProductId,
            Name = req.Name.Trim(),
            Email = req.Email.Trim().ToLowerInvariant(),
            Phone = req.Phone.Trim(),
            Message = req.Message?.Trim() ?? string.Empty,
            Status = "new",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.StoreQuoteInquiries.Add(row);
        await _db.SaveChangesAsync(ct);

        var alertEmail = Environment.GetEnvironmentVariable("QUOTE_ALERT_EMAIL");
        if (!string.IsNullOrWhiteSpace(alertEmail))
        {
            await _emailService.SendGenericAsync(
                alertEmail,
                $"New quote inquiry ({store.Subdomain})",
                $"Quote {row.Id}\nName: {row.Name}\nEmail: {row.Email}\nPhone: {row.Phone}\nMessage: {row.Message}",
                ct);
            row.LastNotifiedAt = DateTimeOffset.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
        return Ok(new { submitted = true, row.Id, row.Status });
    }

    private static IEnumerable<T> ApplyVisibility<T>(IEnumerable<T> source, Func<T, string> key, IReadOnlyCollection<Models.VisibilityRule> rules)
    {
        var allow = rules.Where(x => x.Effect == "allow").Select(x => x.TargetKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var deny = rules.Where(x => x.Effect == "deny").Select(x => x.TargetKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var hasAllow = allow.Count > 0;
        foreach (var item in source)
        {
            var k = key(item);
            if (deny.Contains(k)) continue;
            if (hasAllow && !allow.Contains(k)) continue;
            yield return item;
        }
    }

    private static string FilterThemeBlocks(string json, IReadOnlyCollection<Models.VisibilityRule> rules)
    {
        var allow = rules.Where(x => x.Effect == "allow").Select(x => x.TargetKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var deny = rules.Where(x => x.Effect == "deny").Select(x => x.TargetKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var hasAllow = allow.Count > 0;
        try
        {
            var arr = JsonNode.Parse(json)?.AsArray();
            if (arr == null) return "[]";
            var output = new JsonArray();
            foreach (var n in arr)
            {
                if (n is not JsonObject obj) continue;
                var blockId = obj["id"]?.ToString()?.ToLowerInvariant();
                if (!string.IsNullOrWhiteSpace(blockId))
                {
                    if (deny.Contains(blockId)) continue;
                    if (hasAllow && !allow.Contains(blockId)) continue;
                }
                output.Add(n);
            }
            return output.ToJsonString();
        }
        catch
        {
            return json;
        }
    }
}

public class QuoteInquiryCreateRequest
{
    public Guid? ProductId { get; set; }
    [Required, StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;
    [Required, EmailAddress, StringLength(320)]
    public string Email { get; set; } = string.Empty;
    [Required, StringLength(20, MinimumLength = 8)]
    public string Phone { get; set; } = string.Empty;
    [StringLength(1200)]
    public string? Message { get; set; }
}
