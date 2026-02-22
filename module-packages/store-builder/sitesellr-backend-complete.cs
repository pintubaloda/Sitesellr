// ============================================================
// SITESELLR — BACKEND PART 2: REMAINING CONTROLLERS & SERVICES
// ============================================================

// ============================================================
// FILE: Api/Controllers/MediaController.cs
// ============================================================
namespace Sitesellr.Api.Api.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Hangfire;

[ApiController]
[Route("api/v1/media")]
[Authorize]
public class MediaController : ControllerBase
{
    private readonly IMediaService _media;
    private readonly IBackgroundJobClient _jobs;

    public MediaController(IMediaService media, IBackgroundJobClient jobs)
    {
        _media = media; _jobs = jobs;
    }

    /// <summary>Upload file → MIME check → S3 store → trigger scan + optimize jobs</summary>
    [HttpPost("upload")]
    [Authorize(Policy = Permissions.StoreUploadMedia)]
    [RequestSizeLimit(10_485_760)] // 10MB
    public async Task<IActionResult> Upload([FromForm] IFormFile file)
    {
        // 1. Validate MIME via magic bytes (not just Content-Type header)
        var mimeResult = MagicBytesValidator.Validate(file);
        if (!mimeResult.IsValid)
            return UnprocessableEntity(new { error = mimeResult.Error });

        // 2. SVG sanitisation if applicable
        if (file.ContentType == "image/svg+xml")
        {
            var sanitised = await SvgSanitiser.SanitiseAsync(file);
            if (!sanitised.IsClean)
                return UnprocessableEntity(new { error = "SVG contains unsafe elements" });
        }

        // 3. Upload to S3 and create asset record (scan status = pending)
        var asset = await _media.UploadAsync(file, GetUserId());

        // 4. Queue background jobs (non-blocking)
        _jobs.Enqueue<MediaScanJob>(j => j.ScanAsync(asset.Id));
        _jobs.Enqueue<ImageOptimizeJob>(j => j.OptimizeAsync(asset.Id));

        return Ok(new MediaUploadResponse(
            asset.Id, asset.CdnUrl, asset.MimeType, asset.SizeBytes, asset.ScanStatus));
    }

    [HttpGet]
    [Authorize(Policy = Permissions.StoreUploadMedia)]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        => Ok(await _media.ListAsync(page, pageSize));

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.StoreUploadMedia)]
    public async Task<IActionResult> UpdateAlt(Guid id, [FromBody] UpdateMediaRequest req)
    {
        await _media.UpdateAltTextAsync(id, req.AltText);
        return Ok(new { success = true });
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Permissions.StoreUploadMedia)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _media.DeleteAsync(id);
        if (!result.Success)
            return Conflict(new { error = result.Error });
        return NoContent();
    }

    [HttpGet("{id:guid}/transform")]
    [Authorize(Policy = Permissions.StoreUploadMedia)]
    public async Task<IActionResult> GetTransformUrl(
        Guid id,
        [FromQuery] int? width,
        [FromQuery] int? height,
        [FromQuery] string format = "webp")
    {
        var url = await _media.GetTransformUrlAsync(id, width, height, format);
        return Ok(new { url });
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst("sub")?.Value;
        return claim is not null ? Guid.Parse(claim) : Guid.Empty;
    }
}

// ============================================================
// FILE: Api/Controllers/NavigationController.cs
// ============================================================
namespace Sitesellr.Api.Api.Controllers;

[ApiController]
[Route("api/v1/navigation")]
[Authorize]
public class NavigationController : ControllerBase
{
    private readonly INavigationService _nav;

    public NavigationController(INavigationService nav) => _nav = nav;

    [HttpGet]
    [Authorize(Policy = Permissions.StoreManageNavigation)]
    public async Task<IActionResult> ListMenus()
        => Ok(await _nav.ListMenusAsync());

    [HttpGet("{slug}")]
    [Authorize(Policy = Permissions.StoreManageNavigation)]
    public async Task<IActionResult> GetMenu(string slug)
    {
        var menu = await _nav.GetMenuAsync(slug);
        return menu is null ? NotFound() : Ok(menu);
    }

    [HttpPut("{slug}")]
    [Authorize(Policy = Permissions.StoreManageNavigation)]
    public async Task<IActionResult> UpsertMenu(string slug, [FromBody] UpsertMenuRequest req)
    {
        // Validate link URLs against published pages and collections
        var validation = await _nav.ValidateItemsAsync(req.ItemsJson);
        if (!validation.IsValid)
            return UnprocessableEntity(new { errors = validation.Errors });

        await _nav.UpsertMenuAsync(slug, req.ItemsJson, GetUserId());
        return Ok(new { success = true });
    }

    [HttpDelete("{slug}")]
    [Authorize(Policy = Permissions.StoreManageNavigation)]
    public async Task<IActionResult> DeleteMenu(string slug)
    {
        var result = await _nav.DeleteMenuAsync(slug);
        if (!result) return Conflict(new { error = "System menus cannot be deleted" });
        return NoContent();
    }

    // Public storefront endpoint — CDN cached
    [HttpGet("public/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicMenu(string slug)
    {
        var menu = await _nav.GetMenuCachedAsync(slug);
        return menu is null ? NotFound() : Content(menu, "application/json");
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst("sub")?.Value;
        return claim is not null ? Guid.Parse(claim) : Guid.Empty;
    }
}

// ============================================================
// FILE: Api/Controllers/PagesController.cs
// ============================================================
namespace Sitesellr.Api.Api.Controllers;

[ApiController]
[Route("api/v1/pages")]
[Authorize]
public class PagesController : ControllerBase
{
    private readonly IStaticPageService _pages;

    public PagesController(IStaticPageService pages) => _pages = pages;

    [HttpGet]
    [Authorize(Policy = Permissions.StoreManagePages)]
    public async Task<IActionResult> List()
        => Ok(await _pages.ListAsync());

    [HttpPost]
    [Authorize(Policy = Permissions.StoreManagePages)]
    public async Task<IActionResult> Create([FromBody] CreatePageRequest req)
    {
        // Auto-generate slug from title if not provided
        req = req with { Slug = req.Slug ?? SlugHelper.Generate(req.Title) };

        var slugExists = await _pages.SlugExistsAsync(req.Slug);
        if (slugExists)
            return Conflict(new { error = $"Slug '{req.Slug}' is already in use" });

        var page = await _pages.CreateAsync(req, GetUserId());
        return CreatedAtAction(nameof(GetPage), new { id = page.Id }, page);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.StoreManagePages)]
    public async Task<IActionResult> GetPage(Guid id)
    {
        var page = await _pages.GetAsync(id);
        return page is null ? NotFound() : Ok(page);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.StoreManagePages)]
    public async Task<IActionResult> UpdatePage(Guid id, [FromBody] UpdatePageRequest req)
    {
        await _pages.UpdateAsync(id, req, GetUserId());
        return Ok(new { success = true });
    }

    [HttpPost("{id:guid}/publish")]
    [Authorize(Policy = Permissions.StoreManagePages)]
    public async Task<IActionResult> PublishPage(Guid id)
    {
        await _pages.PublishAsync(id, GetUserId());
        return Ok(new { success = true, publishedAt = DateTimeOffset.UtcNow });
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Permissions.StoreManagePages)]
    public async Task<IActionResult> DeletePage(Guid id)
    {
        var result = await _pages.DeleteAsync(id);
        if (!result) return Conflict(new { error = "System pages cannot be deleted" });
        return NoContent();
    }

    // Public storefront: get page by slug
    [HttpGet("public/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicPage(string slug, [FromQuery] string? password)
    {
        var page = await _pages.GetBySlugPublicAsync(slug, password);
        if (page is null) return NotFound();
        if (page.RequiresPassword) return StatusCode(401, new { error = "Password required" });
        return Ok(page);
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst("sub")?.Value;
        return claim is not null ? Guid.Parse(claim) : Guid.Empty;
    }
}

// ============================================================
// FILE: Api/Controllers/ShippingController.cs
// ============================================================
namespace Sitesellr.Api.Api.Controllers;

[ApiController]
[Route("api/v1/shipping")]
[Authorize]
public class ShippingController : ControllerBase
{
    private readonly IShippingService _shipping;

    public ShippingController(IShippingService shipping) => _shipping = shipping;

    [HttpGet("zones")]
    [Authorize(Policy = Permissions.StoreManageShipping)]
    public async Task<IActionResult> ListZones()
        => Ok(await _shipping.ListZonesAsync());

    [HttpPost("zones")]
    [Authorize(Policy = Permissions.StoreManageShipping)]
    public async Task<IActionResult> CreateZone([FromBody] CreateZoneRequest req)
    {
        var zone = await _shipping.CreateZoneAsync(req, GetUserId());
        return CreatedAtAction(nameof(GetZone), new { id = zone.Id }, zone);
    }

    [HttpGet("zones/{id:guid}")]
    [Authorize(Policy = Permissions.StoreManageShipping)]
    public async Task<IActionResult> GetZone(Guid id)
    {
        var zone = await _shipping.GetZoneAsync(id);
        return zone is null ? NotFound() : Ok(zone);
    }

    [HttpPut("zones/{id:guid}")]
    [Authorize(Policy = Permissions.StoreManageShipping)]
    public async Task<IActionResult> UpdateZone(Guid id, [FromBody] UpdateZoneRequest req)
    {
        await _shipping.UpdateZoneAsync(id, req);
        return Ok(new { success = true });
    }

    [HttpDelete("zones/{id:guid}")]
    [Authorize(Policy = Permissions.StoreManageShipping)]
    public async Task<IActionResult> DeleteZone(Guid id)
    {
        await _shipping.DeleteZoneAsync(id);
        return NoContent();
    }

    [HttpPost("zones/{zoneId:guid}/rates")]
    [Authorize(Policy = Permissions.StoreManageShipping)]
    public async Task<IActionResult> AddRate(Guid zoneId, [FromBody] CreateRateRequest req)
    {
        var rate = await _shipping.AddRateAsync(zoneId, req);
        return Ok(rate);
    }

    [HttpPut("zones/{zoneId:guid}/rates/{rateId:guid}")]
    [Authorize(Policy = Permissions.StoreManageShipping)]
    public async Task<IActionResult> UpdateRate(Guid zoneId, Guid rateId, [FromBody] UpdateRateRequest req)
    {
        await _shipping.UpdateRateAsync(zoneId, rateId, req);
        return Ok(new { success = true });
    }

    [HttpDelete("zones/{zoneId:guid}/rates/{rateId:guid}")]
    [Authorize(Policy = Permissions.StoreManageShipping)]
    public async Task<IActionResult> DeleteRate(Guid zoneId, Guid rateId)
    {
        await _shipping.DeleteRateAsync(zoneId, rateId);
        return NoContent();
    }

    // Public storefront: calculate shipping for cart
    [HttpPost("calculate")]
    [AllowAnonymous]
    public async Task<IActionResult> Calculate([FromBody] CalculateShippingRequest req)
    {
        var rates = await _shipping.CalculateAsync(req);
        return Ok(rates);
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst("sub")?.Value;
        return claim is not null ? Guid.Parse(claim) : Guid.Empty;
    }
}

// ============================================================
// FILE: Api/Controllers/StoreSettingsController.cs
// ============================================================
namespace Sitesellr.Api.Api.Controllers;

[ApiController]
[Route("api/v1/settings")]
[Authorize]
public class StoreSettingsController : ControllerBase
{
    private readonly IStoreSettingsService _settings;

    public StoreSettingsController(IStoreSettingsService settings) => _settings = settings;

    [HttpGet]
    [Authorize(Policy = Permissions.StoreViewSettings)]
    public async Task<IActionResult> Get()
        => Ok(await _settings.GetAsync());

    [HttpPut]
    [Authorize(Policy = Permissions.StoreEditSettings)]
    public async Task<IActionResult> Update([FromBody] UpdateStoreSettingsRequest req)
    {
        // Validate GSTIN format
        if (!string.IsNullOrEmpty(req.GstNumber) && !GstinValidator.IsValid(req.GstNumber))
            return UnprocessableEntity(new { error = "Invalid GSTIN format" });

        await _settings.UpdateAsync(req, GetUserId());
        return Ok(new { success = true });
    }

    [HttpGet("branding")]
    [Authorize(Policy = Permissions.StoreViewSettings)]
    public async Task<IActionResult> GetBranding()
        => Ok(await _settings.GetBrandingAsync());

    [HttpPut("branding")]
    [Authorize(Policy = Permissions.StoreEditSettings)]
    public async Task<IActionResult> UpdateBranding([FromBody] UpdateBrandingRequest req)
    {
        await _settings.UpdateBrandingAsync(req, GetUserId());
        return Ok(new { success = true });
    }

    // Public storefront: minimal config for hydration
    [HttpGet("public")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicConfig()
        => Ok(await _settings.GetPublicConfigAsync());

    private Guid GetUserId()
    {
        var claim = User.FindFirst("sub")?.Value;
        return claim is not null ? Guid.Parse(claim) : Guid.Empty;
    }
}

// ============================================================
// FILE: Api/Controllers/PlatformTenantsController.cs
// ============================================================
namespace Sitesellr.Api.Api.Controllers;

[ApiController]
[Route("api/v1/platform/tenants")]
[Authorize(Policy = Permissions.PlatformManageTenants)]
public class PlatformTenantsController : ControllerBase
{
    private readonly IPlatformTenantService _tenants;
    private readonly IAuditLogService _audit;

    public PlatformTenantsController(IPlatformTenantService tenants, IAuditLogService audit)
    {
        _tenants = tenants; _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? plan,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
        => Ok(await _tenants.ListAsync(search, status, plan, page, pageSize));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var store = await _tenants.GetAsync(id);
        return store is null ? NotFound() : Ok(store);
    }

    [HttpPost("{id:guid}/suspend")]
    public async Task<IActionResult> Suspend(Guid id, [FromBody] SuspendStoreRequest req)
    {
        // Require step-up auth for destructive platform actions
        if (!HasRecentAuth())
            return StatusCode(428, new { error = "Step-up authentication required" });

        var store = await _tenants.SuspendAsync(id, req);
        await _audit.LogAsync("store.suspend", "Store", id, severity: "critical",
            oldValue: new { status = "active" }, newValue: new { status = "suspended", req.Reason });
        return Ok(store);
    }

    [HttpPost("{id:guid}/reactivate")]
    public async Task<IActionResult> Reactivate(Guid id)
    {
        var store = await _tenants.ReactivateAsync(id);
        await _audit.LogAsync("store.reactivate", "Store", id, severity: "high");
        return Ok(store);
    }

    [HttpPost("{id:guid}/impersonate")]
    public async Task<IActionResult> Impersonate(Guid id)
    {
        // Require step-up auth — impersonation is highest-risk action
        if (!HasRecentAuth())
            return StatusCode(428, new { error = "Step-up authentication required for impersonation" });

        var token = await _tenants.ImpersonateAsync(id, GetActorId());
        await _audit.LogAsync("platform.impersonate", "Store", id, severity: "critical");
        return Ok(new { impersonationToken = token, expiresInMinutes = 30 });
    }

    [HttpPut("{id:guid}/plan")]
    public async Task<IActionResult> OverridePlan(Guid id, [FromBody] OverridePlanRequest req)
    {
        var store = await _tenants.OverridePlanAsync(id, req.Plan);
        await _audit.LogAsync("store.plan_override", "Store", id, severity: "high",
            newValue: new { req.Plan });
        return Ok(store);
    }

    [HttpPost("{id:guid}/theme-override")]
    public async Task<IActionResult> OverrideTheme(Guid id, [FromBody] OverrideThemeRequest req)
    {
        if (!HasRecentAuth())
            return StatusCode(428, new { error = "Step-up authentication required" });

        await _tenants.OverrideThemeAsync(id, req.ThemeId);
        await _audit.LogAsync("platform.theme_override", "Store", id, severity: "critical",
            newValue: new { req.ThemeId });
        return Ok(new { success = true });
    }

    [HttpPost("{id:guid}/force-publish")]
    public async Task<IActionResult> ForcePublish(Guid id)
    {
        if (!HasRecentAuth())
            return StatusCode(428, new { error = "Step-up authentication required" });

        await _tenants.ForcePublishAsync(id);
        await _audit.LogAsync("platform.force_publish", "Store", id, severity: "critical");
        return Ok(new { success = true });
    }

    private bool HasRecentAuth()
    {
        var authTime = User.FindFirst("auth_time")?.Value;
        if (authTime is null) return false;
        return (DateTimeOffset.UtcNow - DateTimeOffset.FromUnixTimeSeconds(long.Parse(authTime))).TotalMinutes <= 10;
    }

    private Guid GetActorId()
    {
        var claim = User.FindFirst("sub")?.Value;
        return claim is not null ? Guid.Parse(claim) : Guid.Empty;
    }
}

// ============================================================
// FILE: Api/Controllers/AuditLogController.cs
// ============================================================
namespace Sitesellr.Api.Api.Controllers;

using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/v1/audit")]
[Authorize]
public class AuditLogController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContextService _tenant;

    public AuditLogController(AppDbContext db, ITenantContextService tenant)
    {
        _db = db; _tenant = tenant;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? action,
        [FromQuery] string? severity,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        // Store owners only see their own store's logs
        var isPlatform = _tenant.IsPlatformOwner;
        if (!isPlatform && !User.HasClaim("perm", Permissions.StoreViewAuditLog))
            return Forbid();

        var query = _db.AuditLogs.AsQueryable();

        // Scope to store if not platform owner
        if (!isPlatform)
            query = query.Where(l => l.StoreId == _tenant.StoreId);

        if (!string.IsNullOrEmpty(action))
            query = query.Where(l => l.Action.Contains(action));
        if (!string.IsNullOrEmpty(severity))
            query = query.Where(l => l.Severity == severity);
        if (from.HasValue)
            query = query.Where(l => l.OccurredAt >= from.Value);
        if (to.HasValue)
            query = query.Where(l => l.OccurredAt <= to.Value);

        var total = await query.CountAsync();
        var logs = await query
            .OrderByDescending(l => l.OccurredAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { total, page, pageSize, data = logs });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var log = await _db.AuditLogs.FindAsync(id);
        if (log is null) return NotFound();

        // Scoping: store owners can only see their store's logs
        if (!_tenant.IsPlatformOwner && log.StoreId != _tenant.StoreId)
            return Forbid();

        return Ok(log);
    }

    // Audit logs are NEVER updated or deleted — no PUT/DELETE endpoints
}

// ============================================================
// FILE: Api/Controllers/PlatformSettingsController.cs
// ============================================================
namespace Sitesellr.Api.Api.Controllers;

[ApiController]
[Route("api/v1/platform/settings")]
[Authorize(Policy = Permissions.PlatformManageTenants)]
public class PlatformSettingsController : ControllerBase
{
    private readonly IPlatformSettingsService _settings;

    public PlatformSettingsController(IPlatformSettingsService settings) => _settings = settings;

    [HttpGet]
    public async Task<IActionResult> Get()
        => Ok(await _settings.GetAsync());

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdatePlatformSettingsRequest req)
    {
        await _settings.UpdateAsync(req);
        return Ok(new { success = true });
    }

    [HttpPost("announcement")]
    public async Task<IActionResult> SetAnnouncement([FromBody] AnnouncementRequest req)
    {
        await _settings.SetAnnouncementAsync(req.Text, req.IsActive);
        return Ok(new { success = true });
    }

    [HttpGet("health")]
    [AllowAnonymous]
    public async Task<IActionResult> Health()
        => Ok(await _settings.GetHealthStatusAsync());
}

// ============================================================
// FILE: Api/Controllers/WebhookController.cs
// ============================================================
namespace Sitesellr.Api.Api.Controllers;

[ApiController]
[Route("api/v1/webhooks")]
public class WebhookController : ControllerBase
{
    private readonly IAppMarketplaceService _apps;

    public WebhookController(IAppMarketplaceService apps) => _apps = apps;

    /// <summary>Receives incoming webhooks from installed apps (Razorpay, Shiprocket, etc.)</summary>
    [HttpPost("{appSlug}/{storeId:guid}")]
    [AllowAnonymous] // Auth via HMAC signature verification
    public async Task<IActionResult> Receive(string appSlug, Guid storeId)
    {
        // Read raw body for HMAC verification
        Request.EnableBuffering();
        using var reader = new System.IO.StreamReader(Request.Body, leaveOpen: true);
        var rawBody = await reader.ReadToEndAsync();
        Request.Body.Position = 0;

        // Verify HMAC signature from app-specific header
        var signature = Request.Headers["X-Razorpay-Signature"].FirstOrDefault()
            ?? Request.Headers["X-Shiprocket-Signature"].FirstOrDefault()
            ?? Request.Headers["X-Webhook-Signature"].FirstOrDefault();

        var isValid = await _apps.VerifyWebhookSignatureAsync(appSlug, storeId, rawBody, signature);
        if (!isValid)
        {
            // Log suspicious webhook — don't reveal why it failed
            return Unauthorized();
        }

        await _apps.ProcessWebhookAsync(appSlug, storeId, rawBody);
        return Ok();
    }
}

// ============================================================
// FILE: Api/Controllers/HealthController.cs
// ============================================================
namespace Sitesellr.Api.Api.Controllers;

using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

[ApiController]
[Route("health")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConnectionMultiplexer _redis;

    public HealthController(AppDbContext db, IConnectionMultiplexer redis)
    {
        _db = db; _redis = redis;
    }

    [HttpGet("live")]
    [AllowAnonymous]
    public IActionResult Live() => Ok(new { status = "alive", ts = DateTimeOffset.UtcNow });

    [HttpGet("ready")]
    [AllowAnonymous]
    public async Task<IActionResult> Ready()
    {
        var checks = new Dictionary<string, object>();
        bool allOk = true;

        // DB check
        try {
            await _db.Database.ExecuteSqlRawAsync("SELECT 1");
            checks["db"] = "ok";
        }
        catch (Exception ex) {
            checks["db"] = new { status = "fail", error = ex.Message };
            allOk = false;
        }

        // Redis check
        try {
            var db = _redis.GetDatabase();
            await db.PingAsync();
            checks["redis"] = "ok";
        }
        catch (Exception ex) {
            checks["redis"] = new { status = "fail", error = ex.Message };
            allOk = false;
        }

        // S3 check (placeholder)
        checks["s3"] = "ok";

        return allOk
            ? Ok(new { status = "ready", checks, ts = DateTimeOffset.UtcNow })
            : StatusCode(503, new { status = "degraded", checks, ts = DateTimeOffset.UtcNow });
    }
}

// ============================================================
// FILE: Infrastructure/Services/NavigationService.cs
// ============================================================
namespace Sitesellr.Api.Infrastructure.Services;

using Microsoft.EntityFrameworkCore;

public interface INavigationService
{
    Task<List<StoreNavigationMenu>> ListMenusAsync();
    Task<StoreNavigationMenu?> GetMenuAsync(string slug);
    Task UpsertMenuAsync(string slug, string itemsJson, Guid userId);
    Task<bool> DeleteMenuAsync(string slug);
    Task<string?> GetMenuCachedAsync(string slug);
    Task<ValidationResult> ValidateItemsAsync(string itemsJson);
}

public class NavigationService : INavigationService
{
    private readonly AppDbContext _db;
    private readonly ITenantContextService _tenant;
    private readonly IRedisCacheService _cache;
    private readonly IAuditLogService _audit;
    private static readonly HashSet<string> SystemMenuSlugs = ["main-menu", "footer-col-1", "footer-col-2"];

    public NavigationService(AppDbContext db, ITenantContextService tenant,
        IRedisCacheService cache, IAuditLogService audit)
    {
        _db = db; _tenant = tenant; _cache = cache; _audit = audit;
    }

    public async Task<List<StoreNavigationMenu>> ListMenusAsync()
        => await _db.StoreNavigationMenus.OrderBy(m => m.MenuSlug).ToListAsync();

    public async Task<StoreNavigationMenu?> GetMenuAsync(string slug)
        => await _db.StoreNavigationMenus.FirstOrDefaultAsync(m => m.MenuSlug == slug);

    public async Task UpsertMenuAsync(string slug, string itemsJson, Guid userId)
    {
        var menu = await _db.StoreNavigationMenus.FirstOrDefaultAsync(m => m.MenuSlug == slug);
        if (menu is null)
        {
            menu = new StoreNavigationMenu {
                StoreId = _tenant.StoreId,
                MenuSlug = slug,
                ItemsJson = itemsJson,
                UpdatedByUserId = userId
            };
            _db.StoreNavigationMenus.Add(menu);
        }
        else
        {
            menu.ItemsJson = itemsJson;
            menu.UpdatedByUserId = userId;
            menu.UpdatedAt = DateTimeOffset.UtcNow;
        }
        await _db.SaveChangesAsync();
        await _cache.DeleteAsync($"storefront:{_tenant.StoreId}:nav:{slug}");
        await _audit.LogAsync("navigation.save", "StoreNavigationMenu", menu.Id);
    }

    public async Task<bool> DeleteMenuAsync(string slug)
    {
        if (SystemMenuSlugs.Contains(slug)) return false;
        var menu = await _db.StoreNavigationMenus.FirstOrDefaultAsync(m => m.MenuSlug == slug);
        if (menu is null) return false;
        _db.StoreNavigationMenus.Remove(menu);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<string?> GetMenuCachedAsync(string slug)
    {
        var cacheKey = $"storefront:{_tenant.StoreId}:nav:{slug}";
        var cached = await _cache.GetAsync(cacheKey);
        if (cached is not null) return cached;

        var menu = await _db.StoreNavigationMenus
            .Where(m => m.MenuSlug == slug)
            .Select(m => m.ItemsJson)
            .FirstOrDefaultAsync();

        if (menu is not null)
            await _cache.SetAsync(cacheKey, menu, TimeSpan.FromMinutes(30));

        return menu;
    }

    public Task<ValidationResult> ValidateItemsAsync(string itemsJson)
    {
        try
        {
            var doc = System.Text.Json.JsonDocument.Parse(itemsJson);
            // TODO: Validate each item's URL exists in published pages/collections
            return Task.FromResult(new ValidationResult { IsValid = true });
        }
        catch (Exception ex)
        {
            return Task.FromResult(new ValidationResult {
                IsValid = false,
                Errors = [new ValidationError { Field = "itemsJson", Message = ex.Message }]
            });
        }
    }
}

// ============================================================
// FILE: Infrastructure/Services/StaticPageService.cs
// ============================================================
namespace Sitesellr.Api.Infrastructure.Services;

using Microsoft.EntityFrameworkCore;
using BC = BCrypt.Net.BCrypt;

public interface IStaticPageService
{
    Task<List<PageListItem>> ListAsync();
    Task<StoreStaticPage?> GetAsync(Guid id);
    Task<StoreStaticPage> CreateAsync(CreatePageRequest req, Guid userId);
    Task UpdateAsync(Guid id, UpdatePageRequest req, Guid userId);
    Task PublishAsync(Guid id, Guid userId);
    Task<bool> DeleteAsync(Guid id);
    Task<bool> SlugExistsAsync(string slug);
    Task<PublicPageResult?> GetBySlugPublicAsync(string slug, string? password);
}

public class StaticPageService : IStaticPageService
{
    private readonly AppDbContext _db;
    private readonly ITenantContextService _tenant;
    private readonly IRedisCacheService _cache;
    private readonly IAuditLogService _audit;

    public StaticPageService(AppDbContext db, ITenantContextService tenant,
        IRedisCacheService cache, IAuditLogService audit)
    {
        _db = db; _tenant = tenant; _cache = cache; _audit = audit;
    }

    public async Task<List<PageListItem>> ListAsync()
        => await _db.StoreStaticPages
            .OrderBy(p => p.Title)
            .Select(p => new PageListItem(p.Id, p.Title, p.Slug, p.Status, p.IsSystemPage, p.UpdatedAt))
            .ToListAsync();

    public async Task<StoreStaticPage?> GetAsync(Guid id)
        => await _db.StoreStaticPages.FindAsync(id);

    public async Task<StoreStaticPage> CreateAsync(CreatePageRequest req, Guid userId)
    {
        var page = new StoreStaticPage {
            StoreId = _tenant.StoreId,
            Title = req.Title,
            Slug = req.Slug!,
            BodyJson = req.BodyJson ?? "[]",
            Status = "draft",
            SeoMetaJson = req.SeoMetaJson ?? "{}",
        };
        if (!string.IsNullOrEmpty(req.Password))
        {
            page.Status = "password_protected";
            page.PasswordHash = BC.HashPassword(req.Password);
        }
        _db.StoreStaticPages.Add(page);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("page.create", "StoreStaticPage", page.Id, newValue: new { page.Title, page.Slug });
        return page;
    }

    public async Task UpdateAsync(Guid id, UpdatePageRequest req, Guid userId)
    {
        var page = await _db.StoreStaticPages.FindAsync(id)
            ?? throw new KeyNotFoundException("Page not found");
        page.Title = req.Title ?? page.Title;
        page.BodyJson = req.BodyJson ?? page.BodyJson;
        page.SeoMetaJson = req.SeoMetaJson ?? page.SeoMetaJson;
        if (req.Slug is not null && req.Slug != page.Slug)
        {
            if (await SlugExistsAsync(req.Slug))
                throw new InvalidOperationException($"Slug '{req.Slug}' already in use");
            page.Slug = req.Slug;
        }
        page.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        await _cache.DeleteAsync($"storefront:{_tenant.StoreId}:page:{page.Slug}");
    }

    public async Task PublishAsync(Guid id, Guid userId)
    {
        var page = await _db.StoreStaticPages.FindAsync(id)
            ?? throw new KeyNotFoundException("Page not found");
        page.Status = "published";
        page.PublishedAt = DateTimeOffset.UtcNow;
        page.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        await _cache.DeleteAsync($"storefront:{_tenant.StoreId}:page:{page.Slug}");
        await _audit.LogAsync("page.publish", "StoreStaticPage", page.Id, newValue: new { page.Slug });
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var page = await _db.StoreStaticPages.FindAsync(id);
        if (page is null) return false;
        if (page.IsSystemPage) return false;
        _db.StoreStaticPages.Remove(page);
        await _db.SaveChangesAsync();
        await _cache.DeleteAsync($"storefront:{_tenant.StoreId}:page:{page.Slug}");
        return true;
    }

    public async Task<bool> SlugExistsAsync(string slug)
        => await _db.StoreStaticPages.AnyAsync(p => p.Slug == slug);

    public async Task<PublicPageResult?> GetBySlugPublicAsync(string slug, string? password)
    {
        var cacheKey = $"storefront:{_tenant.StoreId}:page:{slug}";

        var page = await _db.StoreStaticPages
            .FirstOrDefaultAsync(p => p.Slug == slug && p.Status != "draft" && p.Status != "hidden");
        if (page is null) return null;

        if (page.Status == "password_protected")
        {
            if (string.IsNullOrEmpty(password) || !BC.Verify(password, page.PasswordHash))
                return new PublicPageResult { RequiresPassword = true };
        }

        var result = new PublicPageResult {
            Id = page.Id,
            Title = page.Title,
            BodyJson = page.BodyJson,
            SeoMetaJson = page.SeoMetaJson,
            PublishedAt = page.PublishedAt,
        };
        await _cache.SetAsync(cacheKey, System.Text.Json.JsonSerializer.Serialize(result), TimeSpan.FromMinutes(30));
        return result;
    }
}

// ============================================================
// FILE: Infrastructure/Services/MediaService.cs
// ============================================================
namespace Sitesellr.Api.Infrastructure.Services;

using Amazon.S3;
using Amazon.S3.Transfer;
using Microsoft.EntityFrameworkCore;

public interface IMediaService
{
    Task<StoreMediaAsset> UploadAsync(IFormFile file, Guid userId);
    Task<PagedResult<MediaListItem>> ListAsync(int page, int pageSize);
    Task UpdateAltTextAsync(Guid id, string? altText);
    Task<DeleteResult> DeleteAsync(Guid id);
    Task<string?> GetTransformUrlAsync(Guid id, int? width, int? height, string format);
}

public class MediaService : IMediaService
{
    private readonly AppDbContext _db;
    private readonly ITenantContextService _tenant;
    private readonly IAmazonS3 _s3;
    private readonly IConfiguration _config;

    public MediaService(AppDbContext db, ITenantContextService tenant,
        IAmazonS3 s3, IConfiguration config)
    {
        _db = db; _tenant = tenant; _s3 = s3; _config = config;
    }

    public async Task<StoreMediaAsset> UploadAsync(IFormFile file, Guid userId)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var assetId = Guid.NewGuid();
        var storageKey = $"stores/{_tenant.StoreId}/media/{assetId}{ext}";
        var bucket = _config["S3:StoreBucket"]!;
        var cdnBase = _config["S3:CdnBaseUrl"]!;

        using var stream = file.OpenReadStream();
        var transfer = new TransferUtility(_s3);
        await transfer.UploadAsync(new TransferUtilityUploadRequest {
            BucketName = bucket,
            Key = storageKey,
            InputStream = stream,
            ContentType = file.ContentType,
            // No public-read ACL — serve through CDN only
        });

        var asset = new StoreMediaAsset {
            Id = assetId,
            StoreId = _tenant.StoreId,
            OriginalFilename = Path.GetFileName(file.FileName),
            StorageKey = storageKey,
            CdnUrl = $"{cdnBase}/{storageKey}",
            MimeType = file.ContentType,
            SizeBytes = file.Length,
            ScanStatus = "pending",
            UploadedByUserId = userId,
        };
        _db.StoreMediaAssets.Add(asset);
        await _db.SaveChangesAsync();
        return asset;
    }

    public async Task<PagedResult<MediaListItem>> ListAsync(int page, int pageSize)
    {
        var total = await _db.StoreMediaAssets.CountAsync();
        var items = await _db.StoreMediaAssets
            .Where(a => a.ScanStatus == "clean")
            .OrderByDescending(a => a.UploadedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new MediaListItem(
                a.Id, a.OriginalFilename, a.CdnUrl, a.MimeType,
                a.SizeBytes, a.ScanStatus, a.AltText, a.UploadedAt))
            .ToListAsync();
        return new PagedResult<MediaListItem> { Total = total, Data = items };
    }

    public async Task UpdateAltTextAsync(Guid id, string? altText)
    {
        var asset = await _db.StoreMediaAssets.FindAsync(id)
            ?? throw new KeyNotFoundException("Asset not found");
        asset.AltText = altText;
        await _db.SaveChangesAsync();
    }

    public async Task<DeleteResult> DeleteAsync(Guid id)
    {
        var asset = await _db.StoreMediaAssets.FindAsync(id);
        if (asset is null) return new DeleteResult { Success = false, Error = "Asset not found" };

        // TODO: Check if asset is referenced by any layout section or page
        // var isUsed = await CheckIsUsedAsync(id);
        // if (isUsed) return new DeleteResult { Success = false, Error = "Asset is in use" };

        await _s3.DeleteObjectAsync(_config["S3:StoreBucket"]!, asset.StorageKey);
        _db.StoreMediaAssets.Remove(asset);
        await _db.SaveChangesAsync();
        return new DeleteResult { Success = true };
    }

    public async Task<string?> GetTransformUrlAsync(Guid id, int? width, int? height, string format)
    {
        var asset = await _db.StoreMediaAssets.FindAsync(id);
        if (asset is null) return null;
        // Build CDN transform URL (Cloudflare Images / imgix / AWS Lambda@Edge pattern)
        var cdnBase = _config["S3:CdnBaseUrl"]!;
        var query = $"?w={width}&h={height}&fmt={format}&q=85";
        return $"{cdnBase}/transform/{asset.StorageKey}{query}";
    }
}

// ============================================================
// FILE: Infrastructure/Services/ShippingService.cs
// ============================================================
namespace Sitesellr.Api.Infrastructure.Services;

using Microsoft.EntityFrameworkCore;

public interface IShippingService
{
    Task<List<ShippingZone>> ListZonesAsync();
    Task<ShippingZone?> GetZoneAsync(Guid id);
    Task<ShippingZone> CreateZoneAsync(CreateZoneRequest req, Guid userId);
    Task UpdateZoneAsync(Guid id, UpdateZoneRequest req);
    Task DeleteZoneAsync(Guid id);
    Task<ShippingRate> AddRateAsync(Guid zoneId, CreateRateRequest req);
    Task UpdateRateAsync(Guid zoneId, Guid rateId, UpdateRateRequest req);
    Task DeleteRateAsync(Guid zoneId, Guid rateId);
    Task<List<ShippingRateResult>> CalculateAsync(CalculateShippingRequest req);
}

public class ShippingService : IShippingService
{
    private readonly AppDbContext _db;
    private readonly ITenantContextService _tenant;

    public ShippingService(AppDbContext db, ITenantContextService tenant)
    {
        _db = db; _tenant = tenant;
    }

    public async Task<List<ShippingZone>> ListZonesAsync()
        => await _db.ShippingZones.Include(z => z.Rates).OrderBy(z => z.SortOrder).ToListAsync();

    public async Task<ShippingZone?> GetZoneAsync(Guid id)
        => await _db.ShippingZones.Include(z => z.Rates).FirstOrDefaultAsync(z => z.Id == id);

    public async Task<ShippingZone> CreateZoneAsync(CreateZoneRequest req, Guid userId)
    {
        var maxOrder = await _db.ShippingZones.MaxAsync(z => (int?)z.SortOrder) ?? 0;
        var zone = new ShippingZone {
            StoreId = _tenant.StoreId,
            Name = req.Name,
            CoverageJson = req.CoverageJson ?? "[]",
            SortOrder = maxOrder + 1,
        };
        _db.ShippingZones.Add(zone);
        await _db.SaveChangesAsync();
        return zone;
    }

    public async Task UpdateZoneAsync(Guid id, UpdateZoneRequest req)
    {
        var zone = await _db.ShippingZones.FindAsync(id) ?? throw new KeyNotFoundException();
        zone.Name = req.Name ?? zone.Name;
        zone.CoverageJson = req.CoverageJson ?? zone.CoverageJson;
        zone.IsActive = req.IsActive ?? zone.IsActive;
        await _db.SaveChangesAsync();
    }

    public async Task DeleteZoneAsync(Guid id)
    {
        var zone = await _db.ShippingZones.Include(z => z.Rates).FirstOrDefaultAsync(z => z.Id == id)
            ?? throw new KeyNotFoundException();
        _db.ShippingRates.RemoveRange(zone.Rates);
        _db.ShippingZones.Remove(zone);
        await _db.SaveChangesAsync();
    }

    public async Task<ShippingRate> AddRateAsync(Guid zoneId, CreateRateRequest req)
    {
        var zone = await _db.ShippingZones.FindAsync(zoneId) ?? throw new KeyNotFoundException();
        var rate = new ShippingRate {
            ZoneId = zoneId,
            StoreId = _tenant.StoreId,
            Name = req.Name,
            RateType = req.RateType,
            Price = req.Price,
            FreeAboveAmount = req.FreeAboveAmount,
            CodAvailable = req.CodAvailable,
        };
        _db.ShippingRates.Add(rate);
        await _db.SaveChangesAsync();
        return rate;
    }

    public async Task UpdateRateAsync(Guid zoneId, Guid rateId, UpdateRateRequest req)
    {
        var rate = await _db.ShippingRates
            .FirstOrDefaultAsync(r => r.Id == rateId && r.ZoneId == zoneId)
            ?? throw new KeyNotFoundException();
        rate.Name = req.Name ?? rate.Name;
        rate.Price = req.Price ?? rate.Price;
        rate.CodAvailable = req.CodAvailable ?? rate.CodAvailable;
        rate.IsActive = req.IsActive ?? rate.IsActive;
        await _db.SaveChangesAsync();
    }

    public async Task DeleteRateAsync(Guid zoneId, Guid rateId)
    {
        var rate = await _db.ShippingRates
            .FirstOrDefaultAsync(r => r.Id == rateId && r.ZoneId == zoneId)
            ?? throw new KeyNotFoundException();
        _db.ShippingRates.Remove(rate);
        await _db.SaveChangesAsync();
    }

    public async Task<List<ShippingRateResult>> CalculateAsync(CalculateShippingRequest req)
    {
        // Find matching zones for destination pincode / state
        var zones = await _db.ShippingZones
            .Include(z => z.Rates.Where(r => r.IsActive))
            .Where(z => z.IsActive)
            .ToListAsync();

        var results = new List<ShippingRateResult>();
        foreach (var zone in zones)
        {
            if (!ZoneCoverageChecker.Covers(zone.CoverageJson, req.DestPincode, req.DestState))
                continue;
            foreach (var rate in zone.Rates)
            {
                decimal price = rate.RateType switch {
                    "free_above" when req.CartValue >= (rate.FreeAboveAmount ?? decimal.MaxValue) => 0,
                    "flat" => rate.Price,
                    _ => rate.Price
                };
                results.Add(new ShippingRateResult {
                    RateId = rate.Id,
                    ZoneName = zone.Name,
                    RateName = rate.Name,
                    Price = price,
                    CodAvailable = rate.CodAvailable,
                });
            }
        }
        return results.OrderBy(r => r.Price).ToList();
    }
}

// ============================================================
// FILE: Infrastructure/Services/AppMarketplaceService.cs
// ============================================================
namespace Sitesellr.Api.Infrastructure.Services;

using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

public interface IAppMarketplaceService
{
    Task<List<AppListItem>> ListAsync(string? category);
    Task<AppDetailResponse?> GetDetailAsync(Guid id);
    Task<AppInstallation> InstallAsync(Guid appId, InstallAppRequest req);
    Task UpdateSettingsAsync(Guid appId, UpdateAppSettingsRequest req);
    Task UninstallAsync(Guid appId);
    Task<List<PlatformAppListItem>> PlatformListAsync();
    Task<MarketplaceApp> PlatformCreateAsync(PlatformAppUpdateRequest req);
    Task PlatformUpdateAsync(Guid id, PlatformAppUpdateRequest req);
    Task<bool> VerifyWebhookSignatureAsync(string appSlug, Guid storeId, string body, string? signature);
    Task ProcessWebhookAsync(string appSlug, Guid storeId, string body);
}

public class AppMarketplaceService : IAppMarketplaceService
{
    private readonly AppDbContext _db;
    private readonly ITenantContextService _tenant;
    private readonly ICredentialVaultService _vault;
    private readonly IAuditLogService _audit;
    private readonly IRedisCacheService _cache;

    public AppMarketplaceService(AppDbContext db, ITenantContextService tenant,
        ICredentialVaultService vault, IAuditLogService audit, IRedisCacheService cache)
    {
        _db = db; _tenant = tenant; _vault = vault; _audit = audit; _cache = cache;
    }

    public async Task<List<AppListItem>> ListAsync(string? category)
    {
        var installedIds = await _db.AppInstallations
            .Where(a => a.Status == "active")
            .Select(a => a.AppId)
            .ToListAsync();

        var query = _db.MarketplaceApps.Where(a => a.Status == "active");
        if (!string.IsNullOrEmpty(category))
            query = query.Where(a => a.Category == category);

        return await query
            .OrderByDescending(a => a.IsFeatured)
            .ThenByDescending(a => a.Rating)
            .Select(a => new AppListItem(
                a.Id, a.Slug, a.Name, a.Category, a.Emoji, a.Color,
                a.IsFeatured, a.Rating, a.ReviewCount, "Free",
                installedIds.Contains(a.Id), a.Status))
            .ToListAsync();
    }

    public async Task<AppDetailResponse?> GetDetailAsync(Guid id)
    {
        var app = await _db.MarketplaceApps.FindAsync(id);
        if (app is null) return null;

        var installation = await _db.AppInstallations
            .FirstOrDefaultAsync(i => i.AppId == id && i.Status == "active");

        return new AppDetailResponse(
            app.Id, app.Slug, app.Name, app.Category, app.Emoji, app.Color,
            app.IsFeatured, app.Description, app.Rating, app.ReviewCount,
            app.PricingPlansJson, app.FeaturesJson, app.TagsJson,
            app.CredentialFieldsJson, app.HasWebhook, app.HasTestMode,
            installation is not null, installation?.PlanId, installation?.IsTestMode);
    }

    public async Task<AppInstallation> InstallAsync(Guid appId, InstallAppRequest req)
    {
        var app = await _db.MarketplaceApps.FindAsync(appId)
            ?? throw new KeyNotFoundException("App not found");

        // Check if already installed
        var existing = await _db.AppInstallations
            .FirstOrDefaultAsync(i => i.AppId == appId && i.Status == "active");
        if (existing is not null)
            throw new InvalidOperationException("App already installed");

        // Encrypt credentials using KMS / AES-GCM
        var encryptedCreds = _vault.Encrypt(
            System.Text.Json.JsonSerializer.Serialize(req.Credentials));

        var webhookSecret = GenerateWebhookSecret();

        var installation = new AppInstallation {
            StoreId = _tenant.StoreId,
            AppId = appId,
            PlanId = req.PlanId,
            IsTestMode = req.IsTestMode,
            EncryptedCredentialsJson = encryptedCreds,
            WebhookSecret = webhookSecret,
            InstalledByUserId = Guid.Empty, // resolved from HttpContext in production
        };
        _db.AppInstallations.Add(installation);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("app.install", "AppInstallation", installation.Id,
            newValue: new { app.Name, req.PlanId, req.IsTestMode });
        return installation;
    }

    public async Task UpdateSettingsAsync(Guid appId, UpdateAppSettingsRequest req)
    {
        var installation = await _db.AppInstallations
            .FirstOrDefaultAsync(i => i.AppId == appId && i.Status == "active")
            ?? throw new KeyNotFoundException("App not installed");

        var oldTestMode = installation.IsTestMode;
        if (req.Credentials is not null)
            installation.EncryptedCredentialsJson = _vault.Encrypt(
                System.Text.Json.JsonSerializer.Serialize(req.Credentials));
        if (req.IsTestMode.HasValue)
            installation.IsTestMode = req.IsTestMode.Value;
        if (req.IsActive.HasValue)
            installation.Status = req.IsActive.Value ? "active" : "inactive";

        await _db.SaveChangesAsync();
        await _audit.LogAsync("app.settings_update", "AppInstallation", installation.Id,
            severity: "high",
            oldValue: new { testMode = oldTestMode },
            newValue: new { testMode = installation.IsTestMode });
    }

    public async Task UninstallAsync(Guid appId)
    {
        var installation = await _db.AppInstallations
            .FirstOrDefaultAsync(i => i.AppId == appId && i.Status == "active")
            ?? throw new KeyNotFoundException("App not installed");

        installation.Status = "cancelled";
        installation.CancelledAt = DateTimeOffset.UtcNow;
        // Keep record for billing history — soft delete only
        await _db.SaveChangesAsync();
        await _audit.LogAsync("app.uninstall", "AppInstallation", installation.Id, severity: "high");
    }

    public async Task<List<PlatformAppListItem>> PlatformListAsync()
        => await _db.MarketplaceApps
            .Select(a => new PlatformAppListItem(
                a.Id, a.Slug, a.Name, a.Category, a.Emoji,
                a.Status, a.IsFeatured, a.Rating, a.ReviewCount,
                a.CommissionPercent, a.UpdatedAt))
            .ToListAsync();

    public async Task<MarketplaceApp> PlatformCreateAsync(PlatformAppUpdateRequest req)
    {
        var app = new MarketplaceApp {
            Name = req.Name ?? string.Empty,
            Description = req.Description ?? string.Empty,
            IsFeatured = req.IsFeatured ?? false,
            Status = req.Status ?? "inactive",
            PricingPlansJson = req.PricingPlansJson ?? "[]",
            CommissionPercent = req.CommissionPercent ?? 20,
        };
        _db.MarketplaceApps.Add(app);
        await _db.SaveChangesAsync();
        return app;
    }

    public async Task PlatformUpdateAsync(Guid id, PlatformAppUpdateRequest req)
    {
        var app = await _db.MarketplaceApps.FindAsync(id) ?? throw new KeyNotFoundException();
        if (req.Name is not null) app.Name = req.Name;
        if (req.Description is not null) app.Description = req.Description;
        if (req.IsFeatured.HasValue) app.IsFeatured = req.IsFeatured.Value;
        if (req.Status is not null) app.Status = req.Status;
        if (req.PricingPlansJson is not null) app.PricingPlansJson = req.PricingPlansJson;
        if (req.CommissionPercent.HasValue) app.CommissionPercent = req.CommissionPercent.Value;
        app.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        await _cache.DeleteAsync("platform:apps:list");
    }

    public async Task<bool> VerifyWebhookSignatureAsync(string appSlug, Guid storeId,
        string body, string? signature)
    {
        if (signature is null) return false;
        var installation = await _db.AppInstallations
            .Include(i => i.App)
            .FirstOrDefaultAsync(i => i.StoreId == storeId &&
                                      i.App.Slug == appSlug &&
                                      i.Status == "active");
        if (installation is null) return false;

        // HMAC-SHA256 verification
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(installation.WebhookSecret));
        var expected = Convert.ToHexString(
            hmac.ComputeHash(Encoding.UTF8.GetBytes(body))).ToLowerInvariant();
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signature.Replace("sha256=", "")));
    }

    public async Task ProcessWebhookAsync(string appSlug, Guid storeId, string body)
    {
        // Dispatch to app-specific handler
        // e.g. Razorpay payment.captured → update order status
        // e.g. Shiprocket shipment.delivered → mark order delivered
        await Task.CompletedTask;
    }

    private static string GenerateWebhookSecret()
    {
        var bytes = new byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}

// ============================================================
// FILE: Infrastructure/Services/ThemeService.cs
// ============================================================
namespace Sitesellr.Api.Infrastructure.Services;

using Microsoft.EntityFrameworkCore;

public interface IThemeService
{
    Task<List<ThemeListItem>> GetAvailableThemesAsync();
    Task<List<ThemeListItem>> GetAllThemesAsync();
    Task ApplyThemeAsync(Guid themeId, string? checkoutSlug);
    Task<ThemeSettingsResponse> GetSettingsAsync();
    Task SaveSettingsAsync(string designTokensJson);
    Task<PlatformTheme> CreateThemeAsync(PlatformThemeRequest req);
    Task UpdateThemeAsync(Guid id, PlatformThemeRequest req);
    Task<bool> DeleteThemeAsync(Guid id);
}

public class ThemeService : IThemeService
{
    private readonly AppDbContext _db;
    private readonly ITenantContextService _tenant;
    private readonly IAuditLogService _audit;
    private readonly IRedisCacheService _cache;

    public ThemeService(AppDbContext db, ITenantContextService tenant,
        IAuditLogService audit, IRedisCacheService cache)
    {
        _db = db; _tenant = tenant; _audit = audit; _cache = cache;
    }

    public async Task<List<ThemeListItem>> GetAvailableThemesAsync()
    {
        // Get store's current plan to filter themes by tier
        var store = await _db.Stores.FindAsync(_tenant.StoreId);
        var planTier = store?.Plan ?? "starter";
        var allowedTiers = planTier switch {
            "enterprise" => new[] { "starter", "growth", "pro", "enterprise" },
            "pro" => new[] { "starter", "growth", "pro" },
            "growth" => new[] { "starter", "growth" },
            _ => new[] { "starter" }
        };

        return await _db.PlatformThemes
            .Where(t => t.Status == "active" && allowedTiers.Contains(t.RequiredPlanTier))
            .Select(t => new ThemeListItem(
                t.Id, t.Slug, t.Name, t.Description, t.ThumbnailUrl,
                0m, // price parsed from PricingJson in real impl
                t.IsFeatured, t.Status, t.RequiredPlanTier, t.Version))
            .ToListAsync();
    }

    public async Task<List<ThemeListItem>> GetAllThemesAsync()
        => await _db.PlatformThemes
            .Select(t => new ThemeListItem(
                t.Id, t.Slug, t.Name, t.Description, t.ThumbnailUrl,
                0m, t.IsFeatured, t.Status, t.RequiredPlanTier, t.Version))
            .ToListAsync();

    public async Task ApplyThemeAsync(Guid themeId, string? checkoutSlug)
    {
        var theme = await _db.PlatformThemes.FindAsync(themeId)
            ?? throw new KeyNotFoundException("Theme not found");

        var config = await _db.StoreThemeConfigs.FirstOrDefaultAsync();
        var oldThemeId = config?.ActiveThemeId;

        if (config is null)
        {
            config = new StoreThemeConfig {
                StoreId = _tenant.StoreId,
                ActiveThemeId = themeId,
                CheckoutTemplateSlug = checkoutSlug ?? "default",
                AppliedAt = DateTimeOffset.UtcNow,
            };
            _db.StoreThemeConfigs.Add(config);
        }
        else
        {
            config.ActiveThemeId = themeId;
            config.CheckoutTemplateSlug = checkoutSlug ?? config.CheckoutTemplateSlug;
            config.AppliedAt = DateTimeOffset.UtcNow;
            config.UpdatedAt = DateTimeOffset.UtcNow;
        }
        await _db.SaveChangesAsync();

        // Invalidate all storefront caches
        await _cache.DeleteAsync($"storefront:{_tenant.StoreId}:config");
        await _cache.DeleteAsync($"storefront:{_tenant.StoreId}:layout");

        await _audit.LogAsync("theme.apply", "StoreThemeConfig", config.Id,
            severity: "high",
            oldValue: oldThemeId.HasValue ? new { themeId = oldThemeId } : null,
            newValue: new { themeId, theme.Slug });
    }

    public async Task<ThemeSettingsResponse> GetSettingsAsync()
    {
        var config = await _db.StoreThemeConfigs.FirstOrDefaultAsync();
        return new ThemeSettingsResponse(
            config?.DesignTokensJson ?? "{}",
            config?.ActiveThemeId ?? Guid.Empty,
            config?.CheckoutTemplateSlug ?? "default");
    }

    public async Task SaveSettingsAsync(string designTokensJson)
    {
        var config = await _db.StoreThemeConfigs.FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("No theme configured");
        config.DesignTokensJson = designTokensJson;
        config.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        await _cache.DeleteAsync($"storefront:{_tenant.StoreId}:config");
    }

    public async Task<PlatformTheme> CreateThemeAsync(PlatformThemeRequest req)
    {
        var theme = new PlatformTheme {
            Slug = req.Slug,
            Name = req.Name,
            Description = req.Description,
            RequiredPlanTier = req.RequiredPlanTier,
            PricingJson = req.PricingJson,
            SectionSchemaJson = req.SectionSchemaJson,
            IsFeatured = req.IsFeatured,
            Status = "draft",
        };
        _db.PlatformThemes.Add(theme);
        await _db.SaveChangesAsync();
        await _cache.DeleteAsync("platform:themes:list");
        return theme;
    }

    public async Task UpdateThemeAsync(Guid id, PlatformThemeRequest req)
    {
        var theme = await _db.PlatformThemes.FindAsync(id) ?? throw new KeyNotFoundException();
        theme.Name = req.Name;
        theme.Description = req.Description;
        theme.RequiredPlanTier = req.RequiredPlanTier;
        theme.PricingJson = req.PricingJson;
        theme.SectionSchemaJson = req.SectionSchemaJson;
        theme.IsFeatured = req.IsFeatured;
        theme.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        await _cache.DeleteAsync("platform:themes:list");
    }

    public async Task<bool> DeleteThemeAsync(Guid id)
    {
        var inUse = await _db.StoreThemeConfigs.AnyAsync(c => c.ActiveThemeId == id);
        if (inUse) return false;
        var theme = await _db.PlatformThemes.FindAsync(id);
        if (theme is null) return false;
        _db.PlatformThemes.Remove(theme);
        await _db.SaveChangesAsync();
        return true;
    }
}

// ============================================================
// FILE: Infrastructure/Jobs/TrialExpiryNotifyJob.cs
// ============================================================
namespace Sitesellr.Api.Infrastructure.Jobs;

using Microsoft.EntityFrameworkCore;

public class TrialExpiryNotifyJob
{
    private readonly AppDbContext _db;
    private readonly IEmailService _email;

    public TrialExpiryNotifyJob(AppDbContext db, IEmailService email)
    {
        _db = db; _email = email;
    }

    // Scheduled daily at 9 AM IST via Hangfire RecurringJob
    public async Task RunAsync()
    {
        var threeDays = DateTimeOffset.UtcNow.AddDays(3);
        var oneDay = DateTimeOffset.UtcNow.AddDays(1);

        // Notify stores whose trial expires in 3 days
        var expiringSoon3 = await _db.Stores
            .Where(s => s.Status == "trial" &&
                        s.TrialEndsAt.Date == threeDays.Date)
            .ToListAsync();

        foreach (var store in expiringSoon3)
            await _email.SendTrialExpiryWarningAsync(store.OwnerEmail, store.Name, daysLeft: 3);

        // Notify stores whose trial expires in 1 day
        var expiringSoon1 = await _db.Stores
            .Where(s => s.Status == "trial" &&
                        s.TrialEndsAt.Date == oneDay.Date)
            .ToListAsync();

        foreach (var store in expiringSoon1)
            await _email.SendTrialExpiryWarningAsync(store.OwnerEmail, store.Name, daysLeft: 1);

        // Expire stores whose trial ended
        await _db.Stores
            .Where(s => s.Status == "trial" && s.TrialEndsAt < DateTimeOffset.UtcNow)
            .ExecuteUpdateAsync(x =>
                x.SetProperty(s => s.Status, "inactive"));
    }
}

// ============================================================
// FILE: Infrastructure/Jobs/StorageUsageReportJob.cs
// ============================================================
namespace Sitesellr.Api.Infrastructure.Jobs;

using Microsoft.EntityFrameworkCore;

public class StorageUsageReportJob
{
    private readonly AppDbContext _db;

    public StorageUsageReportJob(AppDbContext db) => _db = db;

    // Scheduled daily via Hangfire RecurringJob
    public async Task RunAsync()
    {
        var usageByStore = await _db.StoreMediaAssets
            .Where(a => a.ScanStatus == "clean")
            .GroupBy(a => a.StoreId)
            .Select(g => new {
                StoreId = g.Key,
                TotalBytes = g.Sum(a => a.SizeBytes),
                AssetCount = g.Count()
            })
            .ToListAsync();

        // TODO: Store results in StoreUsageMetrics table
        // TODO: Alert stores approaching their plan storage limit
        // TODO: Suspend uploads for stores that exceed their quota
    }
}

// ============================================================
// FILE: Infrastructure/Jobs/HangfireJobRegistration.cs (startup)
// ============================================================
namespace Sitesellr.Api.Infrastructure.Jobs;

using Hangfire;

public static class HangfireJobRegistration
{
    public static void RegisterRecurringJobs()
    {
        // Trial expiry checks — daily at 9 AM IST (UTC+5:30 = 3:30 AM UTC)
        RecurringJob.AddOrUpdate<TrialExpiryNotifyJob>(
            "trial-expiry-notify",
            j => j.RunAsync(),
            "30 3 * * *"); // 3:30 AM UTC = 9 AM IST

        // Storage usage report — daily at midnight IST
        RecurringJob.AddOrUpdate<StorageUsageReportJob>(
            "storage-usage-report",
            j => j.RunAsync(),
            "30 18 * * *"); // 6:30 PM UTC = midnight IST
    }
}

// ============================================================
// FILE: Application/DTOs/SharedDTOs.cs
// ============================================================
namespace Sitesellr.Api.Application.DTOs;

public class ValidationResult
{
    public bool IsValid { get; set; }
    public List<ValidationError> Errors { get; set; } = [];
}

public class ValidationError
{
    public string Field { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class ValidationException : Exception
{
    public List<ValidationError> Errors { get; }
    public ValidationException(List<ValidationError> errors) : base("Validation failed")
    {
        Errors = errors;
    }
}

public class PagedResult<T>
{
    public int Total { get; set; }
    public List<T> Data { get; set; } = [];
}

public class DeleteResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
}

public record PageListItem(Guid Id, string Title, string Slug, string Status,
    bool IsSystemPage, DateTimeOffset UpdatedAt);

public record PublicPageResult
{
    public bool RequiresPassword { get; set; }
    public Guid Id { get; set; }
    public string? Title { get; set; }
    public string? BodyJson { get; set; }
    public string? SeoMetaJson { get; set; }
    public DateTimeOffset? PublishedAt { get; set; }
}

public record CreatePageRequest(string Title, string? Slug, string? BodyJson,
    string? SeoMetaJson, string? Password);

public record UpdatePageRequest(string? Title, string? Slug, string? BodyJson, string? SeoMetaJson);

public record UpsertMenuRequest(string ItemsJson);

public record CreateZoneRequest(string Name, string? CoverageJson);
public record UpdateZoneRequest(string? Name, string? CoverageJson, bool? IsActive);
public record CreateRateRequest(string Name, string RateType, decimal Price,
    decimal? FreeAboveAmount, bool CodAvailable);
public record UpdateRateRequest(string? Name, decimal? Price, bool? CodAvailable, bool? IsActive);

public record CalculateShippingRequest(string DestPincode, string DestState, decimal CartValue,
    decimal WeightKg);

public record ShippingRateResult
{
    public Guid RateId { get; set; }
    public string ZoneName { get; set; } = string.Empty;
    public string RateName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public bool CodAvailable { get; set; }
}

public record SuspendStoreRequest(string Reason, string? InternalNote, DateTimeOffset? ScheduledAt);
public record OverridePlanRequest(string Plan);
public record OverrideThemeRequest(Guid ThemeId);

public record UpdateStoreSettingsRequest(string? ContactEmail, string? Phone,
    string? WhatsAppNumber, bool? WhatsAppWidgetEnabled,
    string? GstNumber, string? PanNumber,
    string? AddressJson, string? SocialLinksJson,
    string? Language, string? Timezone, string? SeoMetaJson);

public record UpdateBrandingRequest(string? DesignTokensJson, string? FontHeading, string? FontBody);

public record UpdatePlatformSettingsRequest(bool? MaintenanceMode, bool? NewSignupsEnabled,
    string? SmtpHost, int? SmtpPort, string? SupportEmail, int? DefaultTrialDays);

public record AnnouncementRequest(string Text, bool IsActive);

public record PlatformAppListItem(Guid Id, string Slug, string Name, string Category,
    string Emoji, string Status, bool IsFeatured, decimal Rating,
    int ReviewCount, decimal CommissionPercent, DateTimeOffset UpdatedAt);

// ============================================================
// FILE: Infrastructure/Helpers/SlugHelper.cs
// ============================================================
namespace Sitesellr.Api.Infrastructure.Helpers;

using System.Text.RegularExpressions;

public static partial class SlugHelper
{
    [GeneratedRegex(@"[^a-z0-9\-]")]
    private static partial Regex NonSlugChars();

    [GeneratedRegex(@"-{2,}")]
    private static partial Regex MultipleDashes();

    public static string Generate(string title)
    {
        var slug = title.ToLowerInvariant().Trim();
        slug = slug.Replace(" ", "-");
        slug = NonSlugChars().Replace(slug, "");
        slug = MultipleDashes().Replace(slug, "-");
        return slug.Trim('-');
    }
}

// ============================================================
// FILE: Infrastructure/Helpers/GstinValidator.cs
// ============================================================
namespace Sitesellr.Api.Infrastructure.Helpers;

using System.Text.RegularExpressions;

public static partial class GstinValidator
{
    // Format: 2-digit state code + 10-char PAN + 1 entity number + Z + 1 check digit
    [GeneratedRegex(@"^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")]
    private static partial Regex GstinPattern();

    public static bool IsValid(string gstin) =>
        !string.IsNullOrEmpty(gstin) && GstinPattern().IsMatch(gstin.ToUpper());
}

// ============================================================
// FILE: Infrastructure/Helpers/MagicBytesValidator.cs
// ============================================================
namespace Sitesellr.Api.Infrastructure.Helpers;

public static class MagicBytesValidator
{
    private static readonly Dictionary<string, byte[]> Signatures = new()
    {
        ["image/jpeg"] = [0xFF, 0xD8, 0xFF],
        ["image/png"]  = [0x89, 0x50, 0x4E, 0x47],
        ["image/gif"]  = [0x47, 0x49, 0x46, 0x38],
        ["image/webp"] = [0x52, 0x49, 0x46, 0x46],
        ["application/pdf"] = [0x25, 0x50, 0x44, 0x46],
    };

    public record ValidationResult(bool IsValid, string? Error = null);

    public static ValidationResult Validate(IFormFile file)
    {
        if (!Signatures.TryGetValue(file.ContentType, out var expected))
            return new ValidationResult(true); // SVG, ICO, CSV validated differently

        using var stream = file.OpenReadStream();
        var buffer = new byte[expected.Length];
        _ = stream.Read(buffer, 0, buffer.Length);

        bool match = buffer.Take(expected.Length).SequenceEqual(expected);
        return match
            ? new ValidationResult(true)
            : new ValidationResult(false, $"File content does not match declared MIME type {file.ContentType}");
    }
}

// ============================================================
// FILE: Infrastructure/Helpers/SvgSanitiser.cs
// ============================================================
namespace Sitesellr.Api.Infrastructure.Helpers;

using System.Text.RegularExpressions;

public static partial class SvgSanitiser
{
    [GeneratedRegex(@"<script[\s\S]*?</script>", RegexOptions.IgnoreCase)]
    private static partial Regex ScriptTags();

    [GeneratedRegex(@"\bon\w+\s*=", RegexOptions.IgnoreCase)]
    private static partial Regex EventHandlers();

    [GeneratedRegex(@"href\s*=\s*[""']?javascript:", RegexOptions.IgnoreCase)]
    private static partial Regex JavascriptHref();

    public record SanitiseResult(bool IsClean, string? SanitisedContent = null);

    public static async Task<SanitiseResult> SanitiseAsync(IFormFile file)
    {
        using var reader = new System.IO.StreamReader(file.OpenReadStream());
        var content = await reader.ReadToEndAsync();

        if (ScriptTags().IsMatch(content) ||
            EventHandlers().IsMatch(content) ||
            JavascriptHref().IsMatch(content))
        {
            return new SanitiseResult(false);
        }

        // Remove external references
        content = Regex.Replace(content, @"url\([""']?https?://[^)]+[""']?\)", "url()", RegexOptions.IgnoreCase);

        return new SanitiseResult(true, content);
    }
}

// ============================================================
// FILE: Infrastructure/Helpers/ZoneCoverageChecker.cs
// ============================================================
namespace Sitesellr.Api.Infrastructure.Helpers;

using System.Text.Json;

public static class ZoneCoverageChecker
{
    public static bool Covers(string coverageJson, string destPincode, string destState)
    {
        try
        {
            var coverage = JsonSerializer.Deserialize<CoverageConfig>(coverageJson)
                ?? new CoverageConfig();

            if (coverage.AllIndia) return true;

            if (coverage.States?.Any(s =>
                string.Equals(s, destState, StringComparison.OrdinalIgnoreCase)) == true)
                return true;

            if (coverage.Pincodes?.Contains(destPincode) == true) return true;

            if (coverage.PincodeRanges?.Any(r =>
                int.TryParse(destPincode, out var pin) &&
                int.TryParse(r.From, out var from) &&
                int.TryParse(r.To, out var to) &&
                pin >= from && pin <= to) == true)
                return true;

            return false;
        }
        catch
        {
            return true; // Fail open — allow shipping if coverage config is invalid
        }
    }

    public class CoverageConfig
    {
        public bool AllIndia { get; set; }
        public List<string>? States { get; set; }
        public List<string>? Pincodes { get; set; }
        public List<PincodeRange>? PincodeRanges { get; set; }
    }

    public class PincodeRange
    {
        public string From { get; set; } = string.Empty;
        public string To { get; set; } = string.Empty;
    }
}

// ============================================================
// FILE: appsettings.template.json
// NOTE: Never commit real values. Use environment variables or secrets manager.
// ============================================================
/*
{
  "ConnectionStrings": {
    "Postgres": "Host=localhost;Port=5432;Database=sitesellr;Username=sitesellr;Password=CHANGE_ME"
  },
  "Redis": {
    "ConnectionString": "localhost:6379"
  },
  "S3": {
    "Region": "ap-south-1",
    "StoreBucket": "sitesellr-store-media",
    "PlatformBucket": "sitesellr-platform",
    "CdnBaseUrl": "https://cdn.sitesellr.com"
  },
  "Vault": {
    "AesKeyBase64": "CHANGE_ME_GENERATE_WITH: openssl rand -base64 32"
  },
  "Cors": {
    "AllowedOrigins": [
      "https://app.sitesellr.com",
      "https://admin.sitesellr.com"
    ]
  },
  "Smtp": {
    "Host": "smtp.sendgrid.net",
    "Port": 587,
    "Username": "apikey",
    "Password": "CHANGE_ME"
  },
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft": "Warning",
        "System": "Warning"
      }
    }
  },
  "Hangfire": {
    "DashboardPath": "/hangfire"
  }
}
*/

// ============================================================
// FILE: EF Core Migration Commands (run in terminal)
// ============================================================
/*
# Initial setup
dotnet ef migrations add InitialCreate --project Sitesellr.Api
dotnet ef migrations add CreatePlatformThemes --project Sitesellr.Api
dotnet ef migrations add CreateStoreThemeConfig --project Sitesellr.Api
dotnet ef migrations add CreateStoreHomepageLayout --project Sitesellr.Api
dotnet ef migrations add CreateStorefrontLayoutVersion --project Sitesellr.Api
dotnet ef migrations add CreateStoreNavigationMenu --project Sitesellr.Api
dotnet ef migrations add CreateStoreStaticPage --project Sitesellr.Api
dotnet ef migrations add CreateStoreMediaAsset --project Sitesellr.Api
dotnet ef migrations add CreateMarketplaceApps --project Sitesellr.Api
dotnet ef migrations add CreateAppInstallations --project Sitesellr.Api
dotnet ef migrations add CreateShippingZonesAndRates --project Sitesellr.Api
dotnet ef migrations add CreateStoreSettings --project Sitesellr.Api
dotnet ef migrations add CreateAuditLog --project Sitesellr.Api
dotnet ef migrations add SeedThemesAndApps --project Sitesellr.Api

# Apply migrations
dotnet ef database update --project Sitesellr.Api

# Generate SQL script for production
dotnet ef migrations script --idempotent --output migrations.sql --project Sitesellr.Api
*/

// ============================================================
// FILE: Sitesellr.Api.csproj (NuGet packages)
// ============================================================
/*
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <!-- EF Core + PostgreSQL -->
    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.*" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="8.0.*" />
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.*" />
    <!-- Hangfire -->
    <PackageReference Include="Hangfire.Core" Version="1.8.*" />
    <PackageReference Include="Hangfire.AspNetCore" Version="1.8.*" />
    <PackageReference Include="Hangfire.PostgreSql" Version="1.20.*" />
    <!-- Redis -->
    <PackageReference Include="StackExchange.Redis" Version="2.7.*" />
    <!-- AWS S3 -->
    <PackageReference Include="AWSSDK.S3" Version="3.7.*" />
    <!-- Auth -->
    <PackageReference Include="BCrypt.Net-Next" Version="4.0.*" />
    <!-- Logging -->
    <PackageReference Include="Serilog.AspNetCore" Version="8.0.*" />
    <PackageReference Include="Serilog.Sinks.Console" Version="5.0.*" />
    <!-- Validation -->
    <PackageReference Include="FluentValidation.AspNetCore" Version="11.3.*" />
    <!-- Swagger -->
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.*" />
  </ItemGroup>
</Project>
*/
// ============================================================
// SITESELLR — BACKEND PART 3: REMAINING SERVICE INTERFACES & STUBS
// These complete all referenced interfaces in the controllers
// ============================================================

// ============================================================
// FILE: Infrastructure/Services/EmailService.cs
// ============================================================
namespace Sitesellr.Api.Infrastructure.Services;

public interface IEmailService
{
    Task SendTrialExpiryWarningAsync(string toEmail, string storeName, int daysLeft);
    Task SendStoreWelcomeAsync(string toEmail, string storeName, string loginUrl);
    Task SendSuspensionNoticeAsync(string toEmail, string storeName, string reason);
    Task SendReactivationNoticeAsync(string toEmail, string storeName);
    Task SendPasswordResetAsync(string toEmail, string resetUrl);
    Task SendAppInstallConfirmationAsync(string toEmail, string storeName, string appName);
    Task SendInvoiceAsync(string toEmail, string storeName, byte[] invoicePdf);
}

/// <summary>
/// Concrete implementation using SendGrid.
/// Register in Program.cs: builder.Services.AddScoped<IEmailService, SendGridEmailService>();
/// Requires NuGet: SendGrid
/// </summary>
public class SendGridEmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<SendGridEmailService> _logger;

    public SendGridEmailService(IConfiguration config, ILogger<SendGridEmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendTrialExpiryWarningAsync(string toEmail, string storeName, int daysLeft)
    {
        var subject = daysLeft == 1
            ? $"⚠️ Your trial ends tomorrow — {storeName}"
            : $"Your Sitesellr trial ends in {daysLeft} days — {storeName}";

        var html = $"""
            <h2>Your trial is ending soon</h2>
            <p>Hi {storeName},</p>
            <p>Your free trial expires in <strong>{daysLeft} day{(daysLeft > 1 ? "s" : "")}</strong>.</p>
            <p>Upgrade now to keep your store live and access all features.</p>
            <a href="https://app.sitesellr.com/billing" 
               style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">
               Upgrade Plan →
            </a>
            <p style="margin-top:24px;color:#64748b;font-size:12px">
              Sitesellr · support@sitesellr.com
            </p>
        """;

        await SendAsync(toEmail, subject, html);
    }

    public async Task SendStoreWelcomeAsync(string toEmail, string storeName, string loginUrl)
    {
        var subject = $"Welcome to Sitesellr, {storeName}! 🎉";
        var html = $"""
            <h2>Welcome aboard, {storeName}!</h2>
            <p>Your store is ready. Here's what to do first:</p>
            <ol>
              <li>Apply a theme from the Theme Marketplace</li>
              <li>Add your products</li>
              <li>Install a payment gateway (Razorpay or PayU)</li>
              <li>Configure shipping zones</li>
              <li>Go live!</li>
            </ol>
            <a href="{loginUrl}"
               style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">
               Open Dashboard →
            </a>
        """;
        await SendAsync(toEmail, subject, html);
    }

    public async Task SendSuspensionNoticeAsync(string toEmail, string storeName, string reason)
    {
        var subject = $"⛔ Your store has been suspended — {storeName}";
        var html = $"""
            <h2>Store Suspended</h2>
            <p>Your store <strong>{storeName}</strong> has been suspended.</p>
            <p>Reason: {reason}</p>
            <p>To appeal or resolve this, please contact us at support@sitesellr.com.</p>
        """;
        await SendAsync(toEmail, subject, html);
    }

    public async Task SendReactivationNoticeAsync(string toEmail, string storeName)
    {
        var subject = $"✅ Your store is active again — {storeName}";
        var html = $"""
            <h2>Store Reactivated</h2>
            <p>Good news! Your store <strong>{storeName}</strong> has been reactivated.</p>
            <p>Your storefront is now live and accessible to customers.</p>
            <a href="https://app.sitesellr.com"
               style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">
               Go to Dashboard →
            </a>
        """;
        await SendAsync(toEmail, subject, html);
    }

    public async Task SendPasswordResetAsync(string toEmail, string resetUrl)
    {
        var subject = "Reset your Sitesellr password";
        var html = $"""
            <h2>Password Reset</h2>
            <p>Click the button below to reset your password. This link expires in 1 hour.</p>
            <a href="{resetUrl}"
               style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">
               Reset Password →
            </a>
            <p style="margin-top:16px;color:#64748b;font-size:12px">
              If you didn't request this, ignore this email — your password won't change.
            </p>
        """;
        await SendAsync(toEmail, subject, html);
    }

    public async Task SendAppInstallConfirmationAsync(string toEmail, string storeName, string appName)
    {
        var subject = $"✅ {appName} installed — {storeName}";
        var html = $"""
            <h2>{appName} is now installed</h2>
            <p>Your store <strong>{storeName}</strong> has successfully installed <strong>{appName}</strong>.</p>
            <p>Configure credentials and go live from your App Settings.</p>
            <a href="https://app.sitesellr.com/apps"
               style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">
               Open App Settings →
            </a>
        """;
        await SendAsync(toEmail, subject, html);
    }

    public async Task SendInvoiceAsync(string toEmail, string storeName, byte[] invoicePdf)
    {
        var subject = $"Invoice from Sitesellr — {storeName}";
        var html = $"""
            <h2>Your invoice</h2>
            <p>Please find your invoice for <strong>{storeName}</strong> attached.</p>
        """;
        // TODO: Attach PDF via SendGrid Attachments API
        await SendAsync(toEmail, subject, html);
    }

    private async Task SendAsync(string toEmail, string subject, string html)
    {
        // Production: use SendGrid SDK
        // var client = new SendGridClient(_config["SendGrid:ApiKey"]);
        // var msg = MailHelper.CreateSingleEmail(
        //     from: new EmailAddress("noreply@sitesellr.com", "Sitesellr"),
        //     to: new EmailAddress(toEmail),
        //     subject: subject,
        //     plainTextContent: null,
        //     htmlContent: html);
        // var response = await client.SendEmailAsync(msg);

        _logger.LogInformation("Email sent to {Email}: {Subject}", toEmail, subject);
        await Task.CompletedTask;
    }
}

// ============================================================
// FILE: Infrastructure/Services/PlatformTenantService.cs
// ============================================================
namespace Sitesellr.Api.Infrastructure.Services;

using Microsoft.EntityFrameworkCore;

public interface IPlatformTenantService
{
    Task<PagedResult<TenantListItem>> ListAsync(string? search, string? status, string? plan, int page, int pageSize);
    Task<TenantDetailItem?> GetAsync(Guid id);
    Task<Store> SuspendAsync(Guid id, SuspendStoreRequest req);
    Task<Store> ReactivateAsync(Guid id);
    Task<string> ImpersonateAsync(Guid id, Guid actorId);
    Task<Store> OverridePlanAsync(Guid id, string plan);
    Task OverrideThemeAsync(Guid id, Guid themeId);
    Task ForcePublishAsync(Guid id);
}

public class PlatformTenantService : IPlatformTenantService
{
    private readonly AppDbContext _db;
    private readonly IEmailService _email;
    private readonly ILogger<PlatformTenantService> _logger;

    public PlatformTenantService(AppDbContext db, IEmailService email,
        ILogger<PlatformTenantService> logger)
    {
        _db = db; _email = email; _logger = logger;
    }

    public async Task<PagedResult<TenantListItem>> ListAsync(
        string? search, string? status, string? plan, int page, int pageSize)
    {
        // Platform owner queries ignore global query filters — use IgnoreQueryFilters()
        var query = _db.Stores.IgnoreQueryFilters().AsQueryable();

        if (!string.IsNullOrEmpty(search))
            query = query.Where(s =>
                s.Name.Contains(search) ||
                s.OwnerEmail.Contains(search) ||
                s.Slug.Contains(search));

        if (!string.IsNullOrEmpty(status))
            query = query.Where(s => s.Status == status);

        if (!string.IsNullOrEmpty(plan))
            query = query.Where(s => s.Plan == plan);

        var total = await query.CountAsync();
        var stores = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new TenantListItem(
                s.Id, s.Name, s.Slug, s.OwnerEmail,
                s.Plan, s.Status, s.CreatedAt))
            .ToListAsync();

        return new PagedResult<TenantListItem> { Total = total, Data = stores };
    }

    public async Task<TenantDetailItem?> GetAsync(Guid id)
    {
        var store = await _db.Stores
            .IgnoreQueryFilters()
            .Include(s => s.ThemeConfig)
            .Include(s => s.AppInstallations)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (store is null) return null;

        var appCount = store.AppInstallations.Count(a => a.Status == "active");
        var themeName = store.ThemeConfig?.ActiveThemeId.ToString() ?? "None";

        return new TenantDetailItem(
            store.Id, store.Name, store.Slug, store.OwnerEmail,
            store.Plan, store.Status, store.TrialEndsAt,
            store.CreatedAt, appCount, themeName);
    }

    public async Task<Store> SuspendAsync(Guid id, SuspendStoreRequest req)
    {
        var store = await _db.Stores.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new KeyNotFoundException("Store not found");

        store.Status = "suspended";
        store.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();

        // Notify store owner
        try
        {
            await _email.SendSuspensionNoticeAsync(store.OwnerEmail, store.Name, req.Reason);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send suspension email to {Email}", store.OwnerEmail);
        }

        return store;
    }

    public async Task<Store> ReactivateAsync(Guid id)
    {
        var store = await _db.Stores.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new KeyNotFoundException("Store not found");

        store.Status = "active";
        store.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();

        try
        {
            await _email.SendReactivationNoticeAsync(store.OwnerEmail, store.Name);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send reactivation email to {Email}", store.OwnerEmail);
        }

        return store;
    }

    public async Task<string> ImpersonateAsync(Guid storeId, Guid actorId)
    {
        var store = await _db.Stores.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.Id == storeId)
            ?? throw new KeyNotFoundException("Store not found");

        if (store.Status == "suspended")
            throw new InvalidOperationException("Cannot impersonate a suspended store");

        // Generate short-lived impersonation token
        // In production: issue a JWT with:
        //   sub = actorId (platform owner)
        //   impersonating_store = storeId
        //   store_id = storeId
        //   role = store_owner (impersonated role)
        //   impersonator_id = actorId
        //   exp = now + 30 minutes
        var tokenData = new {
            ActorId = actorId,
            StoreId = storeId,
            StoreName = store.Name,
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(30),
            IsImpersonation = true,
        };

        // TODO: sign with JWT key
        var token = Convert.ToBase64String(
            System.Text.Encoding.UTF8.GetBytes(
                System.Text.Json.JsonSerializer.Serialize(tokenData)));

        _logger.LogWarning(
            "Platform admin {ActorId} started impersonating store {StoreId} ({StoreName})",
            actorId, storeId, store.Name);

        return token;
    }

    public async Task<Store> OverridePlanAsync(Guid id, string plan)
    {
        var validPlans = new[] { "starter", "growth", "pro", "enterprise" };
        if (!validPlans.Contains(plan))
            throw new ArgumentException($"Invalid plan: {plan}");

        var store = await _db.Stores.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new KeyNotFoundException("Store not found");

        store.Plan = plan;
        store.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        return store;
    }

    public async Task OverrideThemeAsync(Guid id, Guid themeId)
    {
        var theme = await _db.PlatformThemes.FindAsync(themeId)
            ?? throw new KeyNotFoundException("Theme not found");

        // Temporarily bypass tenant filter to set theme for any store
        var config = await _db.StoreThemeConfigs
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.StoreId == id);

        if (config is null)
        {
            config = new StoreThemeConfig {
                StoreId = id,
                ActiveThemeId = themeId,
                CheckoutTemplateSlug = "default",
                AppliedAt = DateTimeOffset.UtcNow,
            };
            _db.StoreThemeConfigs.Add(config);
        }
        else
        {
            config.ActiveThemeId = themeId;
            config.AppliedAt = DateTimeOffset.UtcNow;
            config.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _db.SaveChangesAsync();
        _logger.LogWarning("Platform admin force-applied theme {ThemeId} to store {StoreId}", themeId, id);
    }

    public async Task ForcePublishAsync(Guid id)
    {
        var layout = await _db.StoreHomepageLayouts
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(l => l.StoreId == id);

        if (layout is null)
        {
            _logger.LogWarning("ForcePublish: No layout found for store {StoreId}", id);
            return;
        }

        // Clear existing live version
        await _db.StorefrontLayoutVersions
            .IgnoreQueryFilters()
            .Where(v => v.StoreId == id && v.IsCurrentLive)
            .ExecuteUpdateAsync(x => x.SetProperty(v => v.IsCurrentLive, false));

        var lastVersion = await _db.StorefrontLayoutVersions
            .IgnoreQueryFilters()
            .Where(v => v.StoreId == id)
            .MaxAsync(v => (int?)v.VersionNumber) ?? 0;

        var config = await _db.StoreThemeConfigs
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.StoreId == id);

        var version = new StorefrontLayoutVersion {
            StoreId = id,
            VersionNumber = lastVersion + 1,
            SectionsJson = layout.DraftSectionsJson,
            ThemeId = config?.ActiveThemeId ?? Guid.Empty,
            PublishedByUserId = Guid.Empty, // system actor
            IsCurrentLive = true,
            PublishedAt = DateTimeOffset.UtcNow,
        };

        _db.StorefrontLayoutVersions.Add(version);
        layout.LiveVersionId = version.Id;
        await _db.SaveChangesAsync();

        _logger.LogWarning("Platform admin force-published layout for store {StoreId}", id);
    }
}

// DTO records for tenant management
public record TenantListItem(Guid Id, string Name, string Slug, string OwnerEmail,
    string Plan, string Status, DateTimeOffset CreatedAt);

public record TenantDetailItem(Guid Id, string Name, string Slug, string OwnerEmail,
    string Plan, string Status, DateTimeOffset TrialEndsAt, DateTimeOffset CreatedAt,
    int InstalledApps, string ActiveTheme);

// ============================================================
// FILE: Infrastructure/Services/StoreSettingsService.cs
// ============================================================
namespace Sitesellr.Api.Infrastructure.Services;

using Microsoft.EntityFrameworkCore;

public interface IStoreSettingsService
{
    Task<StoreSettingsEntity?> GetAsync();
    Task UpdateAsync(UpdateStoreSettingsRequest req, Guid userId);
    Task<BrandingResponse> GetBrandingAsync();
    Task UpdateBrandingAsync(UpdateBrandingRequest req, Guid userId);
    Task<PublicStoreConfig> GetPublicConfigAsync();
}

public class StoreSettingsService : IStoreSettingsService
{
    private readonly AppDbContext _db;
    private readonly ITenantContextService _tenant;
    private readonly IAuditLogService _audit;
    private readonly IRedisCacheService _cache;

    public StoreSettingsService(AppDbContext db, ITenantContextService tenant,
        IAuditLogService audit, IRedisCacheService cache)
    {
        _db = db; _tenant = tenant; _audit = audit; _cache = cache;
    }

    public async Task<StoreSettingsEntity?> GetAsync()
        => await _db.StoreSettings.FirstOrDefaultAsync();

    public async Task UpdateAsync(UpdateStoreSettingsRequest req, Guid userId)
    {
        var settings = await _db.StoreSettings.FirstOrDefaultAsync();
        if (settings is null)
        {
            settings = new StoreSettingsEntity { StoreId = _tenant.StoreId };
            _db.StoreSettings.Add(settings);
        }

        if (req.ContactEmail is not null) settings.ContactEmail = req.ContactEmail;
        if (req.Phone is not null) settings.Phone = req.Phone;
        if (req.WhatsAppNumber is not null) settings.WhatsAppNumber = req.WhatsAppNumber;
        if (req.WhatsAppWidgetEnabled.HasValue) settings.WhatsAppWidgetEnabled = req.WhatsAppWidgetEnabled.Value;
        if (req.GstNumber is not null) settings.GstNumber = req.GstNumber;
        if (req.PanNumber is not null) settings.PanNumber = req.PanNumber;
        if (req.AddressJson is not null) settings.AddressJson = req.AddressJson;
        if (req.SocialLinksJson is not null) settings.SocialLinksJson = req.SocialLinksJson;
        if (req.Language is not null) settings.Language = req.Language;
        if (req.Timezone is not null) settings.Timezone = req.Timezone;
        if (req.SeoMetaJson is not null) settings.SeoMetaJson = req.SeoMetaJson;
        settings.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();
        await _cache.DeleteAsync($"storefront:{_tenant.StoreId}:config");
        await _audit.LogAsync("settings.update", "StoreSettingsEntity", settings.Id);
    }

    public async Task<BrandingResponse> GetBrandingAsync()
    {
        var config = await _db.StoreThemeConfigs.FirstOrDefaultAsync();
        return new BrandingResponse(config?.DesignTokensJson ?? "{}");
    }

    public async Task UpdateBrandingAsync(UpdateBrandingRequest req, Guid userId)
    {
        var config = await _db.StoreThemeConfigs.FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("Apply a theme before configuring branding");

        if (req.DesignTokensJson is not null)
        {
            // Merge new tokens into existing rather than replace entirely
            var existing = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(
                config.DesignTokensJson) ?? new();
            var incoming = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(
                req.DesignTokensJson) ?? new();
            foreach (var (k, v) in incoming)
                existing[k] = v;
            config.DesignTokensJson = System.Text.Json.JsonSerializer.Serialize(existing);
        }

        config.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        await _cache.DeleteAsync($"storefront:{_tenant.StoreId}:config");
    }

    public async Task<PublicStoreConfig> GetPublicConfigAsync()
    {
        var cacheKey = $"storefront:{_tenant.StoreId}:config";
        var cached = await _cache.GetAsync(cacheKey);
        if (cached is not null)
            return System.Text.Json.JsonSerializer.Deserialize<PublicStoreConfig>(cached)!;

        var settings = await _db.StoreSettings.FirstOrDefaultAsync();
        var themeConfig = await _db.StoreThemeConfigs.FirstOrDefaultAsync();
        var store = await _db.Stores.FindAsync(_tenant.StoreId);

        var config = new PublicStoreConfig(
            StoreName: store?.Name ?? string.Empty,
            Language: settings?.Language ?? "en",
            WhatsAppWidget: settings?.WhatsAppWidgetEnabled ?? false,
            WhatsAppNumber: settings?.WhatsAppNumber,
            DesignTokens: themeConfig?.DesignTokensJson ?? "{}",
            ActiveThemeId: themeConfig?.ActiveThemeId);

        await _cache.SetAsync(cacheKey,
            System.Text.Json.JsonSerializer.Serialize(config),
            TimeSpan.FromMinutes(15));

        return config;
    }
}

public record BrandingResponse(string DesignTokensJson);

public record PublicStoreConfig(
    string StoreName,
    string Language,
    bool WhatsAppWidget,
    string? WhatsAppNumber,
    string DesignTokens,
    Guid? ActiveThemeId);

// ============================================================
// FILE: Infrastructure/Services/PlatformSettingsService.cs
// ============================================================
namespace Sitesellr.Api.Infrastructure.Services;

public interface IPlatformSettingsService
{
    Task<PlatformSettingsDto> GetAsync();
    Task UpdateAsync(UpdatePlatformSettingsRequest req);
    Task SetAnnouncementAsync(string text, bool isActive);
    Task<PlatformHealthDto> GetHealthStatusAsync();
}

// In production: store these in a dedicated PlatformSettings table or Redis
public class PlatformSettingsService : IPlatformSettingsService
{
    private readonly IRedisCacheService _cache;
    private readonly AppDbContext _db;
    private readonly IConnectionMultiplexer _redis;

    public PlatformSettingsService(IRedisCacheService cache, AppDbContext db,
        StackExchange.Redis.IConnectionMultiplexer redis)
    {
        _cache = cache; _db = db; _redis = redis;
    }

    public async Task<PlatformSettingsDto> GetAsync()
    {
        // Load from Redis KV store (platform settings are global, not per-tenant)
        var json = await _cache.GetAsync("platform:settings");
        if (json is not null)
            return System.Text.Json.JsonSerializer.Deserialize<PlatformSettingsDto>(json)!;

        // Default settings
        return new PlatformSettingsDto {
            MaintenanceMode = false,
            NewSignupsEnabled = true,
            ForceSSL = true,
            DefaultTrialDays = 14,
            AnnouncementText = string.Empty,
            AnnouncementActive = false,
        };
    }

    public async Task UpdateAsync(UpdatePlatformSettingsRequest req)
    {
        var current = await GetAsync();
        var updated = current with {
            MaintenanceMode = req.MaintenanceMode ?? current.MaintenanceMode,
            NewSignupsEnabled = req.NewSignupsEnabled ?? current.NewSignupsEnabled,
            DefaultTrialDays = req.DefaultTrialDays ?? current.DefaultTrialDays,
        };
        await _cache.SetAsync("platform:settings",
            System.Text.Json.JsonSerializer.Serialize(updated),
            TimeSpan.FromDays(365));
    }

    public async Task SetAnnouncementAsync(string text, bool isActive)
    {
        var current = await GetAsync();
        var updated = current with { AnnouncementText = text, AnnouncementActive = isActive };
        await _cache.SetAsync("platform:settings",
            System.Text.Json.JsonSerializer.Serialize(updated),
            TimeSpan.FromDays(365));

        // Broadcast to all connected admin clients via SignalR (if implemented)
        // await _hubContext.Clients.All.SendAsync("AnnouncementUpdated", new { text, isActive });
    }

    public async Task<PlatformHealthDto> GetHealthStatusAsync()
    {
        var dbOk = false;
        var redisOk = false;

        try
        {
            await _db.Database.ExecuteSqlRawAsync("SELECT 1");
            dbOk = true;
        }
        catch { }

        try
        {
            await _redis.GetDatabase().PingAsync();
            redisOk = true;
        }
        catch { }

        return new PlatformHealthDto(
            Status: dbOk && redisOk ? "healthy" : "degraded",
            Database: dbOk ? "ok" : "error",
            Redis: redisOk ? "ok" : "error",
            CheckedAt: DateTimeOffset.UtcNow);
    }
}

public record PlatformSettingsDto
{
    public bool MaintenanceMode { get; init; }
    public bool NewSignupsEnabled { get; init; }
    public bool ForceSSL { get; init; }
    public int DefaultTrialDays { get; init; }
    public string AnnouncementText { get; init; } = string.Empty;
    public bool AnnouncementActive { get; init; }
}

public record PlatformHealthDto(string Status, string Database, string Redis, DateTimeOffset CheckedAt);

// ============================================================
// FILE: Api/Filters/HangfireAuthorizationFilter.cs
// ============================================================
namespace Sitesellr.Api.Api.Filters;

using Hangfire.Dashboard;

public class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        // Only platform owners can access Hangfire dashboard
        return httpContext.User.Identity?.IsAuthenticated == true
            && httpContext.User.HasClaim("role", "platform_owner");
    }
}

// ============================================================
// FILE: Infrastructure/Services/PaymentGatewayService.cs
// (Referenced in Program.cs DI registration)
// ============================================================
namespace Sitesellr.Api.Infrastructure.Services;

/// <summary>
/// Orchestrates payment gateway credential retrieval for checkout.
/// Called by the storefront checkout API (in the orders/commerce domain).
/// </summary>
public interface IPaymentGatewayService
{
    Task<GatewayCredentials?> GetActiveCredentialsAsync(string gatewaySlug);
    Task<bool> IsGatewayAvailableAsync(string gatewaySlug);
}

public class PaymentGatewayService : IPaymentGatewayService
{
    private readonly AppDbContext _db;
    private readonly ICredentialVaultService _vault;

    public PaymentGatewayService(AppDbContext db, ICredentialVaultService vault)
    {
        _db = db; _vault = vault;
    }

    public async Task<GatewayCredentials?> GetActiveCredentialsAsync(string gatewaySlug)
    {
        var installation = await System.Linq.AsyncEnumerable.FirstOrDefaultAsync(
            _db.AppInstallations
                .Where(i => i.Status == "active" && !i.IsTestMode)
                .Join(_db.MarketplaceApps.Where(a => a.Slug == gatewaySlug),
                      i => i.AppId, a => a.Id, (i, a) => i));

        if (installation is null) return null;

        // Decrypt credentials from vault
        var decrypted = _vault.Decrypt(installation.EncryptedCredentialsJson);
        var creds = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(decrypted);

        return new GatewayCredentials(
            GatewaySlug: gatewaySlug,
            IsTestMode: installation.IsTestMode,
            Credentials: creds ?? [],
            WebhookSecret: installation.WebhookSecret);
    }

    public async Task<bool> IsGatewayAvailableAsync(string gatewaySlug)
    {
        return await System.Linq.AsyncEnumerable.AnyAsync(
            _db.AppInstallations
                .Where(i => i.Status == "active")
                .Join(_db.MarketplaceApps.Where(a => a.Slug == gatewaySlug),
                      i => i.AppId, a => a.Id, (i, a) => i));
    }
}

public record GatewayCredentials(
    string GatewaySlug,
    bool IsTestMode,
    Dictionary<string, string> Credentials,
    string WebhookSecret);

// ============================================================
// FILE: Program.cs (Complete Registration — replaces stub above)
// ============================================================

/*
using Sitesellr.Api.Infrastructure.Data;
using Sitesellr.Api.Infrastructure.Services;
using Sitesellr.Api.Infrastructure.Cache;
using Sitesellr.Api.Infrastructure.Jobs;
using Sitesellr.Api.Api.Middleware;
using Sitesellr.Api.Api.Policies;
using Microsoft.EntityFrameworkCore;
using Hangfire;
using Hangfire.PostgreSql;
using StackExchange.Redis;
using Serilog;
using FluentValidation;
using Amazon.S3;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.WithProperty("Application", "Sitesellr")
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

// ─── DATABASE ─────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseNpgsql(builder.Configuration.GetConnectionString("Postgres"),
        npg => npg.MigrationsAssembly("Sitesellr.Api")));

// ─── REDIS ────────────────────────────────────────────────
builder.Services.AddSingleton<IConnectionMultiplexer>(
    ConnectionMultiplexer.Connect(builder.Configuration["Redis:ConnectionString"]!));
builder.Services.AddScoped<IRedisCacheService, RedisCacheService>();

// ─── AWS S3 ───────────────────────────────────────────────
builder.Services.AddAWSService<IAmazonS3>();

// ─── HANGFIRE ─────────────────────────────────────────────
builder.Services.AddHangfire(cfg => cfg
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(builder.Configuration.GetConnectionString("Postgres")));
builder.Services.AddHangfireServer(opts => opts.WorkerCount = 4);

// ─── AUTH ──────────────────────────────────────────────────
builder.Services.AddAuthentication("Cookie")
    .AddCookie("Cookie", opts => {
        opts.Cookie.HttpOnly = true;
        opts.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        opts.Cookie.SameSite = SameSiteMode.Strict;
        opts.ExpireTimeSpan = TimeSpan.FromHours(8);
        opts.SlidingExpiration = true;
    });

// ─── AUTHORIZATION ─────────────────────────────────────────
builder.Services.AddAuthorization(opts => PermissionPolicies.Register(opts));

// ─── CORS ──────────────────────────────────────────────────
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()!;
builder.Services.AddCors(opts => opts.AddDefaultPolicy(policy =>
    policy.WithOrigins(allowedOrigins).AllowCredentials().AllowAnyMethod().AllowAnyHeader()));

// ─── RATE LIMITING ─────────────────────────────────────────
builder.Services.AddRateLimiter(opts =>
    opts.AddPolicy("api", ctx =>
        System.Threading.RateLimiting.RateLimitPartition.GetSlidingWindowLimiter(
            ctx.Connection.RemoteIpAddress?.ToString() ?? "anon",
            _ => new System.Threading.RateLimiting.SlidingWindowRateLimiterOptions {
                PermitLimit = 100, Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 4, QueueLimit = 0
            })));

// ─── ALL SERVICES ──────────────────────────────────────────
builder.Services.AddScoped<ITenantContextService, TenantContextService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IThemeService, ThemeService>();
builder.Services.AddScoped<ILayoutService, LayoutService>();
builder.Services.AddScoped<INavigationService, NavigationService>();
builder.Services.AddScoped<IStaticPageService, StaticPageService>();
builder.Services.AddScoped<IMediaService, MediaService>();
builder.Services.AddScoped<IPaymentGatewayService, PaymentGatewayService>();
builder.Services.AddScoped<IShippingService, ShippingService>();
builder.Services.AddScoped<IAppMarketplaceService, AppMarketplaceService>();
builder.Services.AddScoped<ICredentialVaultService, CredentialVaultService>();
builder.Services.AddScoped<IStoreSettingsService, StoreSettingsService>();
builder.Services.AddScoped<IPlatformTenantService, PlatformTenantService>();
builder.Services.AddScoped<IPlatformSettingsService, PlatformSettingsService>();
builder.Services.AddScoped<IEmailService, SendGridEmailService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();

// ─── BACKGROUND JOBS ───────────────────────────────────────
builder.Services.AddScoped<MediaScanJob>();
builder.Services.AddScoped<ImageOptimizeJob>();
builder.Services.AddScoped<StorefrontCacheInvalidateJob>();
builder.Services.AddScoped<TrialExpiryNotifyJob>();
builder.Services.AddScoped<StorageUsageReportJob>();

builder.Services.AddHttpContextAccessor();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c => {
    c.SwaggerDoc("v1", new() {
        Title = "Sitesellr API", Version = "v1",
        Description = "Multi-tenant e-commerce platform API"
    });
});

var app = builder.Build();

// ─── MIDDLEWARE PIPELINE ───────────────────────────────────
// ORDER MATTERS — do not reorder these
app.UseMiddleware<RequestIdMiddleware>();
app.UseSerilogRequestLogging();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<CsrfProtectionMiddleware>();
app.UseRateLimiter();
app.UseCors();
app.UseAuthentication();
app.UseMiddleware<TenantContextMiddleware>();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Sitesellr API v1"));
}

app.MapControllers().RequireRateLimiting("api");
app.MapHangfireDashboard("/hangfire", new DashboardOptions {
    Authorization = [new HangfireAuthorizationFilter()]
});

// ─── MIGRATIONS ON STARTUP ────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

// ─── REGISTER RECURRING JOBS ──────────────────────────────
HangfireJobRegistration.RegisterRecurringJobs();

await app.RunAsync();
*/
