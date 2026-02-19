using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
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
    private readonly IEmailService _emailService;
    private TenancyContext? Tenancy => HttpContext.Items["Tenancy"] as TenancyContext;

    public StorefrontController(AppDbContext db, IEmailService emailService)
    {
        _db = db;
        _emailService = emailService;
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
            .OrderByDescending(x => x.IsFeatured)
            .ThenByDescending(x => x.FeaturedRank)
            .ThenBy(x => x.Name)
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
        config.QuoteAlertEmail = req.QuoteAlertEmail?.Trim().ToLowerInvariant();
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
        if (!TryValidateSections(req.SectionsJson, out var validationError))
            return BadRequest(new { error = validationError ?? "sections_invalid" });

        var entitlements = await ResolveSectionEntitlements(storeId, ct);
        if (ContainsBlockedPremiumSection(req.SectionsJson, entitlements.AllowedPremiumKeys, out var blockedKey))
            return BadRequest(new { error = "premium_section_not_entitled", key = blockedKey, upgradeRequired = true });

        var layout = await _db.StoreHomepageLayouts.FirstOrDefaultAsync(x => x.StoreId == storeId, ct);
        if (layout == null)
        {
            layout = new StoreHomepageLayout { StoreId = storeId };
            _db.StoreHomepageLayouts.Add(layout);
        }
        layout.SectionsJson = req.SectionsJson.Trim();
        layout.UpdatedAt = DateTimeOffset.UtcNow;

        var nextVersion = (await _db.StorefrontLayoutVersions.Where(x => x.StoreId == storeId).MaxAsync(x => (int?)x.VersionNumber, ct) ?? 0) + 1;
        _db.StorefrontLayoutVersions.Add(new StorefrontLayoutVersion
        {
            StoreId = storeId,
            SectionsJson = req.SectionsJson.Trim(),
            VersionType = "draft",
            VersionNumber = nextVersion,
            CreatedByUserId = Tenancy?.UserId,
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync(ct);
        return Ok(layout);
    }

    [HttpPost("homepage-layout/validate")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> ValidateHomepageLayout(Guid storeId, [FromBody] HomepageLayoutRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var isValid = TryValidateSections(req.SectionsJson, out var error);
        var entitlements = await ResolveSectionEntitlements(storeId, ct);
        var blocked = ContainsBlockedPremiumSection(req.SectionsJson, entitlements.AllowedPremiumKeys, out var blockedKey);
        return Ok(new { valid = isValid && !blocked, error = blocked ? "premium_section_not_entitled" : error, blockedKey });
    }

    [HttpGet("section-entitlements")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> GetSectionEntitlements(Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var entitlements = await ResolveSectionEntitlements(storeId, ct);
        return Ok(entitlements);
    }

    [HttpGet("homepage-layout/versions")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> ListLayoutVersions(Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var rows = await _db.StorefrontLayoutVersions.AsNoTracking()
            .Where(x => x.StoreId == storeId)
            .OrderByDescending(x => x.VersionNumber)
            .Take(50)
            .Select(x => new { x.Id, x.VersionNumber, x.VersionType, x.CreatedAt })
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost("homepage-layout/publish")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> PublishHomepageLayout(Guid storeId, [FromBody] PublishLayoutRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var version = await _db.StorefrontLayoutVersions.FirstOrDefaultAsync(x => x.Id == req.VersionId && x.StoreId == storeId, ct);
        if (version == null) return NotFound(new { error = "version_not_found" });

        var layout = await _db.StoreHomepageLayouts.FirstOrDefaultAsync(x => x.StoreId == storeId, ct);
        if (layout == null)
        {
            layout = new StoreHomepageLayout { StoreId = storeId };
            _db.StoreHomepageLayouts.Add(layout);
        }
        layout.SectionsJson = version.SectionsJson;
        layout.UpdatedAt = DateTimeOffset.UtcNow;

        var nextVersion = (await _db.StorefrontLayoutVersions.Where(x => x.StoreId == storeId).MaxAsync(x => (int?)x.VersionNumber, ct) ?? 0) + 1;
        _db.StorefrontLayoutVersions.Add(new StorefrontLayoutVersion
        {
            StoreId = storeId,
            SectionsJson = version.SectionsJson,
            VersionType = "published",
            VersionNumber = nextVersion,
            CreatedByUserId = Tenancy?.UserId,
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync(ct);
        return Ok(new { published = true, versionId = req.VersionId });
    }

    [HttpPost("homepage-layout/rollback")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> RollbackHomepageLayout(Guid storeId, [FromBody] PublishLayoutRequest req, CancellationToken ct)
    {
        return await PublishHomepageLayout(storeId, req, ct);
    }

    [HttpGet("homepage-layout/diff")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> DiffHomepageLayout(Guid storeId, [FromQuery] Guid fromVersionId, [FromQuery] Guid toVersionId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var versions = await _db.StorefrontLayoutVersions.AsNoTracking()
            .Where(x => x.StoreId == storeId && (x.Id == fromVersionId || x.Id == toVersionId))
            .ToListAsync(ct);
        var from = versions.FirstOrDefault(x => x.Id == fromVersionId);
        var to = versions.FirstOrDefault(x => x.Id == toVersionId);
        if (from == null || to == null) return NotFound(new { error = "version_not_found" });

        var fromMap = FlattenNodes(from.SectionsJson);
        var toMap = FlattenNodes(to.SectionsJson);
        var added = toMap.Keys.Except(fromMap.Keys).Select(id => new { id, title = toMap[id] }).ToList();
        var removed = fromMap.Keys.Except(toMap.Keys).Select(id => new { id, title = fromMap[id] }).ToList();
        var renamed = toMap.Keys.Intersect(fromMap.Keys)
            .Where(id => !string.Equals(toMap[id], fromMap[id], StringComparison.Ordinal))
            .Select(id => new { id, from = fromMap[id], to = toMap[id] })
            .ToList();
        return Ok(new
        {
            fromVersionId,
            toVersionId,
            added,
            removed,
            renamed
        });
    }

    [HttpGet("collaboration/sessions")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> ListSessions(Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var cutoff = DateTimeOffset.UtcNow.AddMinutes(-5);
        var rows = await _db.StorefrontEditSessions.AsNoTracking()
            .Where(x => x.StoreId == storeId && x.Status == "active" && x.LastSeenAt >= cutoff)
            .OrderByDescending(x => x.LastSeenAt)
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost("collaboration/sessions")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> UpsertSession(Guid storeId, [FromBody] EditSessionRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        if (Tenancy?.UserId == null) return Unauthorized();
        var userId = Tenancy.UserId.Value;
        var session = await _db.StorefrontEditSessions.FirstOrDefaultAsync(x => x.StoreId == storeId && x.UserId == userId && x.Status == "active", ct);
        if (session == null)
        {
            session = new StorefrontEditSession
            {
                StoreId = storeId,
                UserId = userId,
                EditorName = string.IsNullOrWhiteSpace(req.EditorName) ? $"User-{userId.ToString()[..8]}" : req.EditorName.Trim(),
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow
            };
            _db.StorefrontEditSessions.Add(session);
        }
        session.LastSeenAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(session);
    }

    [HttpDelete("collaboration/sessions/me")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> EndSession(Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        if (Tenancy?.UserId == null) return Unauthorized();
        var userId = Tenancy.UserId.Value;
        var rows = await _db.StorefrontEditSessions.Where(x => x.StoreId == storeId && x.UserId == userId && x.Status == "active").ToListAsync(ct);
        foreach (var row in rows)
        {
            row.Status = "ended";
            row.LastSeenAt = DateTimeOffset.UtcNow;
        }
        await _db.SaveChangesAsync(ct);
        return NoContent();
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

    [HttpGet("quote-inquiries")]
    [Authorize(Policy = Policies.OrdersRead)]
    public async Task<IActionResult> ListQuoteInquiries(Guid storeId, [FromQuery] string? status, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var q = _db.StoreQuoteInquiries.AsNoTracking()
            .Include(x => x.AssignedToUser)
            .Where(x => x.StoreId == storeId);
        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalized = status.Trim().ToLowerInvariant();
            q = q.Where(x => x.Status == normalized);
        }

        var rows = await q.OrderByDescending(x => x.CreatedAt).Take(200).ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPut("quote-inquiries/{id:guid}/status")]
    [Authorize(Policy = Policies.OrdersWrite)]
    public async Task<IActionResult> UpdateQuoteInquiryStatus(Guid storeId, Guid id, [FromBody] UpdateQuoteInquiryStatusRequest req, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var row = await _db.StoreQuoteInquiries.FirstOrDefaultAsync(x => x.StoreId == storeId && x.Id == id, ct);
        if (row == null) return NotFound(new { error = "quote_inquiry_not_found" });
        row.Status = req.Status.Trim().ToLowerInvariant();
        row.Priority = string.IsNullOrWhiteSpace(req.Priority) ? row.Priority : req.Priority.Trim().ToLowerInvariant();
        row.AssignedToUserId = req.AssignedToUserId;
        row.SlaDueAt = req.SlaDueAt;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        if (row.AssignedToUserId.HasValue)
        {
            var assigneeEmail = await _db.Users.AsNoTracking()
                .Where(x => x.Id == row.AssignedToUserId.Value)
                .Select(x => x.Email)
                .FirstOrDefaultAsync(ct);
            if (!string.IsNullOrWhiteSpace(assigneeEmail))
            {
                await _emailService.SendGenericAsync(
                    assigneeEmail,
                    $"Sitesellr quote assigned ({row.Status})",
                    $"Quote {row.Id} assigned to you.\nStatus: {row.Status}\nPriority: {row.Priority}\nSLA: {row.SlaDueAt}",
                    ct);
                row.LastNotifiedAt = DateTimeOffset.UtcNow;
                await _db.SaveChangesAsync(ct);
            }
        }

        return Ok(row);
    }

    [HttpPost("quote-inquiries/automation/run")]
    [Authorize(Policy = Policies.OrdersWrite)]
    public async Task<IActionResult> RunQuoteAutomation(Guid storeId, CancellationToken ct)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var now = DateTimeOffset.UtcNow;
        var rows = await _db.StoreQuoteInquiries
            .Include(x => x.AssignedToUser)
            .Where(x => x.StoreId == storeId && x.SlaDueAt != null && x.SlaDueAt <= now && x.Status != "resolved" && x.Status != "closed")
            .Take(100)
            .ToListAsync(ct);
        var sent = 0;
        foreach (var row in rows)
        {
            var to = row.AssignedToUser?.Email ?? (Environment.GetEnvironmentVariable("QUOTE_ALERT_EMAIL") ?? "");
            if (string.IsNullOrWhiteSpace(to)) continue;
            var ok = await _emailService.SendGenericAsync(
                to,
                $"SLA breached: quote {row.Id}",
                $"Quote {row.Id} breached SLA.\nStatus: {row.Status}\nPriority: {row.Priority}\nSLA Due: {row.SlaDueAt}",
                ct);
            if (ok)
            {
                row.LastNotifiedAt = now;
                sent++;
            }
        }
        await _db.SaveChangesAsync(ct);
        return Ok(new { processed = rows.Count, notificationsSent = sent });
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

    private static bool TryValidateSections(string json, out string? error)
    {
        error = null;
        if (!IsValidJsonArray(json))
        {
            error = "sections_must_be_json_array";
            return false;
        }

        using var doc = JsonDocument.Parse(json);
        foreach (var item in doc.RootElement.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object)
            {
                error = "section_item_must_be_object";
                return false;
            }
            if (!item.TryGetProperty("type", out var typeEl) || typeEl.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(typeEl.GetString()))
            {
                error = "section_type_required";
                return false;
            }
            if (item.TryGetProperty("children", out var childrenEl))
            {
                if (childrenEl.ValueKind != JsonValueKind.Array)
                {
                    error = "section_children_must_be_array";
                    return false;
                }
                foreach (var child in childrenEl.EnumerateArray())
                {
                    if (child.ValueKind != JsonValueKind.Object || !child.TryGetProperty("type", out var childType) || childType.ValueKind != JsonValueKind.String)
                    {
                        error = "child_type_required";
                        return false;
                    }
                }
            }
        }
        return true;
    }

    private async Task<SectionEntitlementsResponse> ResolveSectionEntitlements(Guid storeId, CancellationToken ct)
    {
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Id == storeId, ct);
        var planCode = string.Empty;
        if (store != null)
        {
            var sub = await _db.MerchantSubscriptions.AsNoTracking()
                .Include(x => x.Plan)
                .Where(x => x.MerchantId == store.MerchantId && !x.IsCancelled)
                .OrderByDescending(x => x.StartedAt)
                .FirstOrDefaultAsync(ct);
            planCode = sub?.Plan?.Code?.Trim().ToLowerInvariant() ?? string.Empty;
        }

        var premiumRules = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["announcement-bar-pro"] = new[] { "growth", "pro", "enterprise" },
            ["testimonial-carousel-pro"] = new[] { "growth", "pro", "enterprise" },
            ["video-story-pro"] = new[] { "pro", "enterprise" },
            ["wholesale-cta-pro"] = new[] { "pro", "enterprise" }
        };
        var allowedPremium = premiumRules
            .Where(x => x.Value.Contains(planCode, StringComparer.OrdinalIgnoreCase))
            .Select(x => x.Key)
            .OrderBy(x => x)
            .ToArray();
        return new SectionEntitlementsResponse
        {
            PlanCode = planCode,
            AllowedPremiumKeys = allowedPremium,
            PremiumRules = premiumRules
        };
    }

    private static bool ContainsBlockedPremiumSection(string sectionsJson, IEnumerable<string> allowedKeys, out string blockedKey)
    {
        blockedKey = string.Empty;
        var foundBlockedKey = string.Empty;
        var allowed = new HashSet<string>(allowedKeys, StringComparer.OrdinalIgnoreCase);
        var premiumKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "announcement-bar-pro",
            "testimonial-carousel-pro",
            "video-story-pro",
            "wholesale-cta-pro"
        };

        bool Visit(JsonElement node)
        {
            if (node.ValueKind != JsonValueKind.Object) return false;
            if (node.TryGetProperty("settings", out var settings) &&
                settings.ValueKind == JsonValueKind.Object &&
                settings.TryGetProperty("templateKey", out var keyEl) &&
                keyEl.ValueKind == JsonValueKind.String)
            {
                var key = keyEl.GetString() ?? string.Empty;
                if (premiumKeys.Contains(key) && !allowed.Contains(key))
                {
                    foundBlockedKey = key;
                    return true;
                }
            }
            if (node.TryGetProperty("children", out var children) && children.ValueKind == JsonValueKind.Array)
            {
                foreach (var child in children.EnumerateArray())
                {
                    if (Visit(child)) return true;
                }
            }
            return false;
        }

        try
        {
            using var doc = JsonDocument.Parse(sectionsJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return false;
            foreach (var item in doc.RootElement.EnumerateArray())
            {
                if (Visit(item))
                {
                    blockedKey = foundBlockedKey;
                    return true;
                }
            }
        }
        catch
        {
            return false;
        }

        return false;
    }

    private static Dictionary<string, string> FlattenNodes(string sectionsJson)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            var arr = JsonNode.Parse(sectionsJson)?.AsArray();
            if (arr == null) return result;
            foreach (var node in arr)
            {
                Traverse(node, result);
            }
        }
        catch
        {
            // ignore invalid json for diff output
        }
        return result;
    }

    private static void Traverse(JsonNode? node, IDictionary<string, string> map)
    {
        if (node is not JsonObject obj) return;
        var id = obj["id"]?.ToString();
        if (!string.IsNullOrWhiteSpace(id))
        {
            map[id] = obj["title"]?.ToString() ?? obj["type"]?.ToString() ?? "node";
        }
        if (obj["children"] is JsonArray children)
        {
            foreach (var child in children) Traverse(child, map);
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
        var rows = await _db.ThemeCatalogItems.AsNoTracking()
            .OrderByDescending(x => x.IsFeatured)
            .ThenByDescending(x => x.FeaturedRank)
            .ThenBy(x => x.Name)
            .ToListAsync(ct);
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
            IsFeatured = req.IsFeatured,
            FeaturedRank = req.FeaturedRank,
            TypographyPack = string.IsNullOrWhiteSpace(req.TypographyPack) ? "modern-sans" : req.TypographyPack.Trim().ToLowerInvariant(),
            LayoutVariant = string.IsNullOrWhiteSpace(req.LayoutVariant) ? "default" : req.LayoutVariant.Trim().ToLowerInvariant(),
            RuntimePackageJson = string.IsNullOrWhiteSpace(req.RuntimePackageJson) ? "{}" : req.RuntimePackageJson.Trim(),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.ThemeCatalogItems.Add(row);
        await _db.SaveChangesAsync(ct);
        return Ok(row);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ThemeCatalogUpdateRequest req, CancellationToken ct)
    {
        var row = await _db.ThemeCatalogItems.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (row == null) return NotFound(new { error = "theme_not_found" });

        var slug = req.Slug.Trim().ToLowerInvariant();
        var slugExists = await _db.ThemeCatalogItems.AsNoTracking().AnyAsync(x => x.Slug == slug && x.Id != id, ct);
        if (slugExists) return Conflict(new { error = "slug_exists" });

        row.Name = req.Name.Trim();
        row.Slug = slug;
        row.Category = req.Category?.Trim() ?? "General";
        row.Description = req.Description?.Trim() ?? string.Empty;
        row.PreviewUrl = req.PreviewUrl?.Trim() ?? string.Empty;
        row.IsPaid = req.IsPaid;
        row.Price = req.Price;
        row.AllowedPlanCodesCsv = req.AllowedPlanCodesCsv?.Trim().ToLowerInvariant() ?? string.Empty;
        row.IsActive = req.IsActive;
        row.IsFeatured = req.IsFeatured;
        row.FeaturedRank = req.FeaturedRank;
        row.TypographyPack = string.IsNullOrWhiteSpace(req.TypographyPack) ? "modern-sans" : req.TypographyPack.Trim().ToLowerInvariant();
        row.LayoutVariant = string.IsNullOrWhiteSpace(req.LayoutVariant) ? "default" : req.LayoutVariant.Trim().ToLowerInvariant();
        row.RuntimePackageJson = string.IsNullOrWhiteSpace(req.RuntimePackageJson) ? "{}" : req.RuntimePackageJson.Trim();
        row.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);
        return Ok(row);
    }

    [HttpPost("{id:guid}/publish")]
    public async Task<IActionResult> Publish(Guid id, CancellationToken ct)
    {
        var row = await _db.ThemeCatalogItems.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (row == null) return NotFound(new { error = "theme_not_found" });
        row.IsActive = true;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { updated = true, row.Id, row.IsActive });
    }

    [HttpPost("{id:guid}/unpublish")]
    public async Task<IActionResult> Unpublish(Guid id, CancellationToken ct)
    {
        var row = await _db.ThemeCatalogItems.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (row == null) return NotFound(new { error = "theme_not_found" });
        row.IsActive = false;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { updated = true, row.Id, row.IsActive });
    }

    [HttpPost("{id:guid}/feature")]
    public async Task<IActionResult> Feature(Guid id, [FromBody] ThemeFeatureRequest req, CancellationToken ct)
    {
        var row = await _db.ThemeCatalogItems.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (row == null) return NotFound(new { error = "theme_not_found" });
        row.IsFeatured = req.IsFeatured;
        row.FeaturedRank = req.FeaturedRank;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { updated = true, row.Id, row.IsFeatured, row.FeaturedRank });
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
    [StringLength(320)]
    public string? QuoteAlertEmail { get; set; }
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
    public bool IsFeatured { get; set; }
    [Range(0, 9999)]
    public int FeaturedRank { get; set; }
    [StringLength(60)]
    public string? TypographyPack { get; set; }
    [StringLength(60)]
    public string? LayoutVariant { get; set; }
    [StringLength(4000)]
    public string? RuntimePackageJson { get; set; }
}

public class ThemeCatalogUpdateRequest
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
    public bool IsFeatured { get; set; }
    [Range(0, 9999)]
    public int FeaturedRank { get; set; }
    [StringLength(60)]
    public string? TypographyPack { get; set; }
    [StringLength(60)]
    public string? LayoutVariant { get; set; }
    [StringLength(4000)]
    public string? RuntimePackageJson { get; set; }
}

public class ThemeFeatureRequest
{
    public bool IsFeatured { get; set; }
    [Range(0, 9999)]
    public int FeaturedRank { get; set; }
}

public class PublishLayoutRequest
{
    [Required]
    public Guid VersionId { get; set; }
}

public class EditSessionRequest
{
    [StringLength(120)]
    public string? EditorName { get; set; }
}

public class UpdateQuoteInquiryStatusRequest
{
    [Required, RegularExpression("^(new|in_progress|resolved|closed)$")]
    public string Status { get; set; } = "new";
    public Guid? AssignedToUserId { get; set; }
    [RegularExpression("^(low|normal|high|urgent)$")]
    public string? Priority { get; set; }
    public DateTimeOffset? SlaDueAt { get; set; }
}

public class SectionEntitlementsResponse
{
    public string PlanCode { get; set; } = string.Empty;
    public string[] AllowedPremiumKeys { get; set; } = Array.Empty<string>();
    public Dictionary<string, string[]> PremiumRules { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}
