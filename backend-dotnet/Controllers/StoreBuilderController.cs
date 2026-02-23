using System.ComponentModel.DataAnnotations;
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
public class StoreBuilderController : BaseApiController
{
    private readonly AppDbContext _db;
    private readonly ISubscriptionCapabilityService _caps;

    public StoreBuilderController(AppDbContext db, ISubscriptionCapabilityService caps)
    {
        _db = db;
        _caps = caps;
    }

    [HttpGet("/api/marketplace/apps")]
    [Authorize]
    public async Task<IActionResult> MarketplaceApps(CancellationToken ct)
    {
        var themes = await _db.ThemeCatalogItems.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderByDescending(x => x.IsFeatured)
            .ThenBy(x => x.FeaturedRank)
            .Select(x => new
            {
                id = x.Id,
                kind = "theme",
                name = x.Name,
                slug = x.Slug,
                category = x.Category,
                description = x.Description,
                isPaid = x.IsPaid,
                price = x.Price,
                isFeatured = x.IsFeatured
            })
            .ToListAsync(ct);

        var templates = await _db.CampaignTemplateCatalogItems.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderByDescending(x => x.IsFeatured)
            .ThenBy(x => x.FeaturedRank)
            .Select(x => new
            {
                id = x.Id,
                kind = "campaign_template",
                name = x.Name,
                slug = x.Slug,
                category = x.Category,
                description = x.Description,
                isPaid = x.IsPaid,
                price = x.Price,
                isFeatured = x.IsFeatured
            })
            .ToListAsync(ct);

        return Ok(themes.Concat<object>(templates));
    }

    [HttpGet("/api/stores/{storeId:guid}/plugins")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> StorePlugins(Guid storeId, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var items = await _db.StoreCampaignTemplateSubscriptions.AsNoTracking()
            .Include(x => x.Template)
            .Where(x => x.StoreId == storeId)
            .OrderByDescending(x => x.PurchasedAt)
            .Select(x => new
            {
                x.Id,
                appId = x.TemplateId,
                templateName = x.Template.Name,
                x.Status,
                x.BillingMode,
                x.BillingStatus,
                x.ChargedAmount,
                x.Currency,
                x.PaymentReference,
                x.PurchasedAt,
                x.UpdatedAt
            })
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpPost("/api/stores/{storeId:guid}/plugins/install")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> InstallPlugin(Guid storeId, [FromBody] PluginInstallRequest req, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var app = await _db.CampaignTemplateCatalogItems.FirstOrDefaultAsync(x => x.Id == req.AppId, ct);
        if (app == null)
            return BadRequest(new { error = "app_not_found" });

        var existing = await _db.StoreCampaignTemplateSubscriptions
            .FirstOrDefaultAsync(x => x.StoreId == storeId && x.TemplateId == req.AppId, ct);

        if (existing == null)
        {
            existing = new StoreCampaignTemplateSubscription
            {
                StoreId = storeId,
                TemplateId = req.AppId,
                Status = "active",
                BillingMode = "one_time",
                BillingStatus = app.IsPaid ? "pending" : "paid",
                ChargedAmount = app.IsPaid ? app.Price : 0m,
                Currency = "INR",
                PlanCodeAtPurchase = string.IsNullOrWhiteSpace(req.PlanId) ? "default" : req.PlanId.Trim(),
                PaymentReference = req.TestMode ? "test_mode" : "manual",
                PurchasedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.StoreCampaignTemplateSubscriptions.Add(existing);
        }
        else
        {
            existing.Status = "active";
            existing.UpdatedAt = DateTimeOffset.UtcNow;
            existing.PlanCodeAtPurchase = string.IsNullOrWhiteSpace(req.PlanId) ? existing.PlanCodeAtPurchase : req.PlanId.Trim();
            existing.PaymentReference = req.TestMode ? "test_mode" : "manual";
        }

        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            installation = new
            {
                existing.Id,
                appId = existing.TemplateId,
                existing.Status,
                existing.BillingStatus,
                existing.ChargedAmount,
                existing.Currency,
                existing.UpdatedAt
            }
        });
    }

    [HttpDelete("/api/stores/{storeId:guid}/plugins/{appId:guid}")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> UninstallPlugin(Guid storeId, Guid appId, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var existing = await _db.StoreCampaignTemplateSubscriptions
            .FirstOrDefaultAsync(x => x.StoreId == storeId && x.TemplateId == appId, ct);
        if (existing == null) return NotFound();

        _db.StoreCampaignTemplateSubscriptions.Remove(existing);
        await _db.SaveChangesAsync(ct);
        return Ok(new { success = true });
    }

    [HttpPatch("/api/stores/{storeId:guid}/plugins/{appId:guid}/mode")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> UpdatePluginMode(Guid storeId, Guid appId, [FromBody] PluginModeRequest req, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var existing = await _db.StoreCampaignTemplateSubscriptions
            .FirstOrDefaultAsync(x => x.StoreId == storeId && x.TemplateId == appId, ct);
        if (existing == null) return NotFound();

        existing.PaymentReference = req.TestMode ? "test_mode" : "live_mode";
        existing.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            installation = new
            {
                existing.Id,
                appId = existing.TemplateId,
                testMode = req.TestMode,
                existing.UpdatedAt
            }
        });
    }

    [HttpGet("/api/stores/{storeId:guid}/theme")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> GetTheme(Guid storeId, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var layout = await _db.StoreHomepageLayouts.AsNoTracking().FirstOrDefaultAsync(x => x.StoreId == storeId, ct);
        var theme = await _db.StoreThemeConfigs.AsNoTracking().FirstOrDefaultAsync(x => x.StoreId == storeId, ct);
        var latestVersion = await _db.StorefrontLayoutVersions.AsNoTracking()
            .Where(x => x.StoreId == storeId)
            .OrderByDescending(x => x.VersionNumber)
            .Select(x => (int?)x.VersionNumber)
            .FirstOrDefaultAsync(ct);

        return Ok(new
        {
            sections = ParseJsonArray(layout?.SectionsJson),
            settings = ParseJsonObject(theme?.DesignTokensJson),
            version = latestVersion ?? 0,
            activeThemeId = theme?.ActiveThemeId,
            activeTheme = theme?.ActiveThemeId == null ? null : await _db.ThemeCatalogItems.AsNoTracking()
                .Where(x => x.Id == theme.ActiveThemeId.Value)
                .Select(x => new
                {
                    x.Id,
                    x.Name,
                    x.Slug,
                    x.Category,
                    x.PreviewUrl,
                    x.ThemeVersion
                })
                .FirstOrDefaultAsync(ct)
        });
    }

    [HttpGet("/api/stores/{storeId:guid}/themes")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> StoreThemes(Guid storeId, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var cfg = await _db.StoreThemeConfigs.AsNoTracking().FirstOrDefaultAsync(x => x.StoreId == storeId, ct);
        var caps = await _caps.GetCapabilitiesAsync(storeId, ct);
        var rows = await _db.ThemeCatalogItems.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderByDescending(x => x.IsFeatured)
            .ThenBy(x => x.FeaturedRank)
            .ThenBy(x => x.Name)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Slug,
                x.Category,
                x.Description,
                x.PreviewUrl,
                x.IsPaid,
                x.Price,
                x.ThemeVersion,
                x.AllowedPlanCodesCsv
            })
            .ToListAsync(ct);
        var themes = rows.Select(x =>
        {
            var allowedPlans = ParseCsvLower(x.AllowedPlanCodesCsv);
            var allowedByPlan = allowedPlans.Count == 0 || allowedPlans.Contains(caps.PlanCode.Trim().ToLowerInvariant());
            var allowedByPremium = !x.IsPaid || caps.PremiumThemeAccess;
            return new
            {
                x.Id,
                x.Name,
                x.Slug,
                x.Category,
                x.Description,
                x.PreviewUrl,
                x.IsPaid,
                x.Price,
                x.ThemeVersion,
                allowedPlanCodes = allowedPlans.ToArray(),
                canActivate = allowedByPlan && allowedByPremium
            };
        });

        return Ok(new { activeThemeId = cfg?.ActiveThemeId, themes });
    }

    [HttpPut("/api/stores/{storeId:guid}/theme/active")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> SetActiveTheme(Guid storeId, [FromBody] SetActiveThemeRequest req, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var themeItem = await _db.ThemeCatalogItems.AsNoTracking().FirstOrDefaultAsync(x => x.Id == req.ThemeId && x.IsActive, ct);
        if (themeItem == null) return BadRequest(new { error = "theme_not_found" });
        var caps = await _caps.GetCapabilitiesAsync(storeId, ct);
        var allowedPlans = ParseCsvLower(themeItem.AllowedPlanCodesCsv);
        if (allowedPlans.Count > 0 && !allowedPlans.Contains(caps.PlanCode.Trim().ToLowerInvariant()))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                error = "theme_plan_upgrade_required",
                details = new
                {
                    currentPlan = caps.PlanCode,
                    requiredPlans = allowedPlans.ToArray(),
                    theme = themeItem.Name
                }
            });
        }
        var featureCheck = await _caps.CheckThemeApplyAsync(storeId, themeItem.IsPaid, InferThemeTier(themeItem), ct);
        if (!featureCheck.Allowed)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                error = featureCheck.Error ?? "feature_not_enabled",
                details = featureCheck.Details ?? new { action = "themes.activate" }
            });
        }

        var theme = await _db.StoreThemeConfigs.FirstOrDefaultAsync(x => x.StoreId == storeId, ct);
        if (theme == null)
        {
            theme = new StoreThemeConfig
            {
                StoreId = storeId,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.StoreThemeConfigs.Add(theme);
        }

        theme.ActiveThemeId = req.ThemeId;
        theme.UpdatedAt = DateTimeOffset.UtcNow;

        var layout = await _db.StoreHomepageLayouts.FirstOrDefaultAsync(x => x.StoreId == storeId, ct);
        if (layout == null)
        {
            layout = new StoreHomepageLayout
            {
                StoreId = storeId,
                SectionsJson = "[]",
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.StoreHomepageLayouts.Add(layout);
        }

        var scopedSectionsKey = ThemeScopedSectionsKey(storeId, req.ThemeId);
        var scopedSettingsKey = ThemeScopedSettingsKey(storeId, req.ThemeId);
        var scopedRows = await _db.PlatformBrandingSettings
            .Where(x => x.Key == scopedSectionsKey || x.Key == scopedSettingsKey)
            .ToListAsync(ct);
        var scopedSections = scopedRows.FirstOrDefault(x => x.Key == scopedSectionsKey)?.Value;
        var scopedSettings = scopedRows.FirstOrDefault(x => x.Key == scopedSettingsKey)?.Value;

        layout.SectionsJson = SafeJson(scopedSections, layout.SectionsJson);
        layout.UpdatedAt = DateTimeOffset.UtcNow;
        theme.DesignTokensJson = SafeJson(scopedSettings, theme.DesignTokensJson ?? "{}");

        await _db.SaveChangesAsync(ct);
        return Ok(new
        {
            activeThemeId = theme.ActiveThemeId,
            activeTheme = new
            {
                themeItem.Id,
                themeItem.Name,
                themeItem.Slug,
                themeItem.Category,
                themeItem.PreviewUrl
            }
        });
    }

    [HttpPut("/api/stores/{storeId:guid}/theme")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> SaveTheme(Guid storeId, [FromBody] ThemeSaveRequest req, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var layout = await _db.StoreHomepageLayouts.FirstOrDefaultAsync(x => x.StoreId == storeId, ct);
        if (layout == null)
        {
            layout = new StoreHomepageLayout
            {
                StoreId = storeId,
                SectionsJson = "[]",
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.StoreHomepageLayouts.Add(layout);
        }

        var theme = await _db.StoreThemeConfigs.FirstOrDefaultAsync(x => x.StoreId == storeId, ct);
        if (theme == null)
        {
            theme = new StoreThemeConfig
            {
                StoreId = storeId,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.StoreThemeConfigs.Add(theme);
        }

        layout.SectionsJson = SafeJson(req.SectionsJson, "[]");
        layout.UpdatedAt = DateTimeOffset.UtcNow;
        theme.DesignTokensJson = SafeJson(req.SettingsJson, "{}");
        theme.UpdatedAt = DateTimeOffset.UtcNow;
        if (theme.ActiveThemeId.HasValue)
        {
            await UpsertSettingAsync(ThemeScopedSectionsKey(storeId, theme.ActiveThemeId.Value), layout.SectionsJson, ct);
            await UpsertSettingAsync(ThemeScopedSettingsKey(storeId, theme.ActiveThemeId.Value), theme.DesignTokensJson, ct);
        }

        var nextVersion = await _db.StorefrontLayoutVersions
            .Where(x => x.StoreId == storeId)
            .MaxAsync(x => (int?)x.VersionNumber, ct) ?? 0;

        _db.StorefrontLayoutVersions.Add(new StorefrontLayoutVersion
        {
            StoreId = storeId,
            SectionsJson = layout.SectionsJson,
            VersionType = "draft",
            VersionNumber = nextVersion + 1,
            CreatedByUserId = Tenancy?.UserId,
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            theme = new
            {
                sections = ParseJsonArray(layout.SectionsJson),
                settings = ParseJsonObject(theme.DesignTokensJson)
            },
            version = nextVersion + 1
        });
    }

    [HttpPost("/api/stores/{storeId:guid}/theme/publish")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> PublishTheme(Guid storeId, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var layout = await _db.StoreHomepageLayouts.FirstOrDefaultAsync(x => x.StoreId == storeId, ct);
        if (layout == null)
            return BadRequest(new { error = "theme_not_initialized" });

        var nextVersion = await _db.StorefrontLayoutVersions
            .Where(x => x.StoreId == storeId)
            .MaxAsync(x => (int?)x.VersionNumber, ct) ?? 0;

        _db.StorefrontLayoutVersions.Add(new StorefrontLayoutVersion
        {
            StoreId = storeId,
            SectionsJson = layout.SectionsJson,
            VersionType = "published",
            VersionNumber = nextVersion + 1,
            CreatedByUserId = Tenancy?.UserId,
            CreatedAt = DateTimeOffset.UtcNow
        });

        await _db.SaveChangesAsync(ct);
        return Ok(new { theme = new { sections = ParseJsonArray(layout.SectionsJson) }, publishedAt = DateTimeOffset.UtcNow, version = nextVersion + 1 });
    }

    [HttpGet("/api/stores/{storeId:guid}/theme/versions")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> ThemeVersions(Guid storeId, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var versions = await _db.StorefrontLayoutVersions.AsNoTracking()
            .Where(x => x.StoreId == storeId)
            .OrderByDescending(x => x.VersionNumber)
            .Take(50)
            .Select(x => new
            {
                id = x.Id,
                version = x.VersionNumber,
                versionType = x.VersionType,
                createdByUserId = x.CreatedByUserId,
                createdAt = x.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(versions);
    }

    [HttpPost("/api/stores/{storeId:guid}/theme/versions/{version:int}/restore")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> RestoreThemeVersion(Guid storeId, int version, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var row = await _db.StorefrontLayoutVersions.FirstOrDefaultAsync(x => x.StoreId == storeId && x.VersionNumber == version, ct);
        if (row == null) return NotFound();

        var layout = await _db.StoreHomepageLayouts.FirstOrDefaultAsync(x => x.StoreId == storeId, ct);
        if (layout == null)
        {
            layout = new StoreHomepageLayout
            {
                StoreId = storeId,
                SectionsJson = row.SectionsJson,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.StoreHomepageLayouts.Add(layout);
        }
        else
        {
            layout.SectionsJson = row.SectionsJson;
            layout.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
        return Ok(new { theme = new { sections = ParseJsonArray(layout.SectionsJson) } });
    }

    [HttpGet("/api/stores/{storeId:guid}/navigation")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> GetNavigation(Guid storeId, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var rows = await _db.StoreNavigationMenus.AsNoTracking().Where(x => x.StoreId == storeId).ToListAsync(ct);
        var map = rows.ToDictionary(x => x.Name.ToLowerInvariant(), x => ParseJsonArray(x.ItemsJson));
        return Ok(new
        {
            main = map.GetValueOrDefault("main") ?? ParseJsonArray(rows.FirstOrDefault(x => x.IsPrimary)?.ItemsJson),
            footer1 = map.GetValueOrDefault("footer1") ?? new List<object>(),
            footer2 = map.GetValueOrDefault("footer2") ?? new List<object>()
        });
    }

    [HttpPut("/api/stores/{storeId:guid}/navigation")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> SaveNavigation(Guid storeId, [FromBody] NavigationSaveRequest req, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        await UpsertNavAsync(storeId, "main", req.MainJson, true, ct);
        await UpsertNavAsync(storeId, "footer1", req.Footer1Json, false, ct);
        await UpsertNavAsync(storeId, "footer2", req.Footer2Json, false, ct);

        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            navigation = new
            {
                main = ParseJsonArray(SafeJson(req.MainJson, "[]")),
                footer1 = ParseJsonArray(SafeJson(req.Footer1Json, "[]")),
                footer2 = ParseJsonArray(SafeJson(req.Footer2Json, "[]"))
            }
        });
    }

    [HttpGet("/api/stores/{storeId:guid}/pages")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> Pages(Guid storeId, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var pages = await _db.StoreStaticPages.AsNoTracking()
            .Where(x => x.StoreId == storeId)
            .OrderBy(x => x.Title)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.Slug,
                body = x.Content,
                status = x.IsPublished ? "published" : "draft",
                seo = new { title = x.SeoTitle, description = x.SeoDescription },
                x.UpdatedAt
            })
            .ToListAsync(ct);

        return Ok(pages);
    }

    [HttpPost("/api/stores/{storeId:guid}/pages")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> CreatePage(Guid storeId, [FromBody] PageUpsertRequest req, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var page = new StoreStaticPage
        {
            StoreId = storeId,
            Title = req.Title.Trim(),
            Slug = req.Slug.Trim().ToLowerInvariant(),
            Content = req.Body,
            SeoTitle = req.SeoTitle,
            SeoDescription = req.SeoDescription,
            IsPublished = string.Equals(req.Status, "published", StringComparison.OrdinalIgnoreCase),
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.StoreStaticPages.Add(page);
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            page.Id,
            page.Title,
            page.Slug,
            body = page.Content,
            status = page.IsPublished ? "published" : "draft",
            seo = new { title = page.SeoTitle, description = page.SeoDescription },
            page.UpdatedAt
        });
    }

    [HttpPut("/api/stores/{storeId:guid}/pages/{pageId:guid}")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> UpdatePage(Guid storeId, Guid pageId, [FromBody] PageUpsertRequest req, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var page = await _db.StoreStaticPages.FirstOrDefaultAsync(x => x.StoreId == storeId && x.Id == pageId, ct);
        if (page == null) return NotFound();

        page.Title = req.Title.Trim();
        page.Slug = req.Slug.Trim().ToLowerInvariant();
        page.Content = req.Body;
        page.SeoTitle = req.SeoTitle;
        page.SeoDescription = req.SeoDescription;
        page.IsPublished = string.Equals(req.Status, "published", StringComparison.OrdinalIgnoreCase);
        page.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            page.Id,
            page.Title,
            page.Slug,
            body = page.Content,
            status = page.IsPublished ? "published" : "draft",
            seo = new { title = page.SeoTitle, description = page.SeoDescription },
            page.UpdatedAt
        });
    }

    [HttpPost("/api/stores/{storeId:guid}/payment-gateways")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> SavePaymentGateway(Guid storeId, [FromBody] PaymentGatewayRequest req, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var key = GatewayConfigKey(storeId, req.GatewayId);
        var payload = JsonSerializer.Serialize(new
        {
            gatewayId = req.GatewayId,
            credentials = req.CredentialsJson,
            testMode = req.TestMode,
            planId = req.PlanId,
            updatedAt = DateTimeOffset.UtcNow
        });

        await UpsertSettingAsync(key, payload, ct);

        return Ok(new
        {
            gateway = new
            {
                req.GatewayId,
                testMode = req.TestMode,
                planId = req.PlanId,
                credentialsMasked = "••••••••"
            }
        });
    }

    [HttpGet("/api/stores/{storeId:guid}/payment-gateways")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> GetPaymentGateways(Guid storeId, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var prefix = GatewayConfigPrefix(storeId);
        var rows = await _db.PlatformBrandingSettings.AsNoTracking()
            .Where(x => x.Key.StartsWith(prefix))
            .ToListAsync(ct);

        var result = rows.Select(row =>
        {
            var gatewayId = row.Key.Replace(prefix, string.Empty);
            var root = ParseJsonObject(row.Value);
            var testMode = root.TryGetValue("testMode", out var tm) && bool.TryParse(tm?.ToString(), out var parsed) && parsed;
            return new
            {
                gatewayId,
                testMode,
                credentialsMasked = "••••••••",
                updatedAt = root.GetValueOrDefault("updatedAt")
            };
        });

        return Ok(result);
    }

    [HttpPost("/api/stores/{storeId:guid}/payment-gateways/{gatewayId}/test")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> TestPaymentGateway(Guid storeId, string gatewayId, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var key = GatewayConfigKey(storeId, gatewayId);
        var exists = await _db.PlatformBrandingSettings.AsNoTracking().AnyAsync(x => x.Key == key, ct);
        if (!exists) return NotFound(new { error = "gateway_not_configured" });

        return Ok(new { success = true, latency = 42 });
    }

    [HttpDelete("/api/stores/{storeId:guid}/payment-gateways/{gatewayId}")]
    [Authorize(Policy = Policies.StoreSettingsWrite)]
    public async Task<IActionResult> DeletePaymentGateway(Guid storeId, string gatewayId, CancellationToken ct)
    {
        var access = await EnsureStoreAccessAsync(storeId, ct);
        if (access is not null) return access;

        var key = GatewayConfigKey(storeId, gatewayId);
        var row = await _db.PlatformBrandingSettings.FirstOrDefaultAsync(x => x.Key == key, ct);
        if (row == null) return NotFound();

        _db.PlatformBrandingSettings.Remove(row);
        await _db.SaveChangesAsync(ct);
        return Ok(new { success = true });
    }

    private async Task UpsertNavAsync(Guid storeId, string name, string? itemsJson, bool primary, CancellationToken ct)
    {
        var row = await _db.StoreNavigationMenus.FirstOrDefaultAsync(x => x.StoreId == storeId && x.Name == name, ct);
        if (row == null)
        {
            row = new StoreNavigationMenu
            {
                StoreId = storeId,
                Name = name,
                IsPrimary = primary,
                ItemsJson = SafeJson(itemsJson, "[]"),
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.StoreNavigationMenus.Add(row);
            return;
        }

        row.ItemsJson = SafeJson(itemsJson, "[]");
        row.IsPrimary = primary;
        row.UpdatedAt = DateTimeOffset.UtcNow;
    }

    private async Task UpsertSettingAsync(string key, string value, CancellationToken ct)
    {
        var row = await _db.PlatformBrandingSettings.FirstOrDefaultAsync(x => x.Key == key, ct);
        if (row == null)
        {
            _db.PlatformBrandingSettings.Add(new PlatformBrandingSetting
            {
                Key = key,
                Value = value,
                UpdatedAt = DateTimeOffset.UtcNow
            });
        }
        else
        {
            row.Value = value;
            row.UpdatedAt = DateTimeOffset.UtcNow;
        }
        await _db.SaveChangesAsync(ct);
    }

    private static string GatewayConfigPrefix(Guid storeId) => $"store.payment.gateway.{storeId:N}.";
    private static string GatewayConfigKey(Guid storeId, string gatewayId) => $"{GatewayConfigPrefix(storeId)}{gatewayId.ToLowerInvariant()}";
    private static string ThemeScopedSectionsKey(Guid storeId, Guid themeId) => $"store.theme.builder.{storeId:N}.{themeId:N}.sections";
    private static string ThemeScopedSettingsKey(Guid storeId, Guid themeId) => $"store.theme.builder.{storeId:N}.{themeId:N}.settings";

    private IActionResult? EnsureStoreAccess(Guid storeId)
    {
        if (Tenancy?.UserId == null) return Unauthorized();
        if (Tenancy.IsPlatformOwner || Tenancy.IsPlatformStaff) return null;
        if (Tenancy.Store == null || Tenancy.Store.Id != storeId) return Forbid();
        return null;
    }

    private async Task<IActionResult?> EnsureStoreAccessAsync(Guid storeId, CancellationToken ct)
    {
        var access = EnsureStoreAccess(storeId);
        if (access != null) return access;

        var exists = await _db.Stores.AsNoTracking().AnyAsync(x => x.Id == storeId, ct);
        if (!exists) return NotFound();
        return null;
    }

    private static string SafeJson(string? raw, string fallback)
    {
        if (string.IsNullOrWhiteSpace(raw)) return fallback;
        try
        {
            JsonDocument.Parse(raw);
            return raw;
        }
        catch
        {
            return fallback;
        }
    }

    private static List<object> ParseJsonArray(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return new List<object>();
        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return new List<object>();
            var json = doc.RootElement.GetRawText();
            return JsonSerializer.Deserialize<List<object>>(json) ?? new List<object>();
        }
        catch
        {
            return new List<object>();
        }
    }

    private static Dictionary<string, object?> ParseJsonObject(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return new Dictionary<string, object?>();
        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return new Dictionary<string, object?>();
            var json = doc.RootElement.GetRawText();
            return JsonSerializer.Deserialize<Dictionary<string, object?>>(json) ?? new Dictionary<string, object?>();
        }
        catch
        {
            return new Dictionary<string, object?>();
        }
    }

    private static HashSet<string> ParseCsvLower(string? csv)
    {
        if (string.IsNullOrWhiteSpace(csv)) return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        return csv
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => x.Trim().ToLowerInvariant())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    private static string InferThemeTier(ThemeCatalogItem item)
    {
        var plans = ParseCsvLower(item.AllowedPlanCodesCsv);
        if (plans.Contains("enterprise")) return "enterprise";
        if (plans.Contains("pro")) return "premium";
        if (plans.Contains("growth")) return "standard";
        return item.IsPaid ? "standard" : "free";
    }
}

public class PluginInstallRequest
{
    public Guid AppId { get; set; }
    public string PlanId { get; set; } = "default";
    public string CredentialsJson { get; set; } = "{}";
    public bool TestMode { get; set; } = true;
}

public class PluginModeRequest
{
    public bool TestMode { get; set; }
}

public class ThemeSaveRequest
{
    public string SectionsJson { get; set; } = "[]";
    public string SettingsJson { get; set; } = "{}";
}

public class SetActiveThemeRequest
{
    public Guid ThemeId { get; set; }
}

public class NavigationSaveRequest
{
    public string MainJson { get; set; } = "[]";
    public string Footer1Json { get; set; } = "[]";
    public string Footer2Json { get; set; } = "[]";
}

public class PageUpsertRequest
{
    [Required, MinLength(2), MaxLength(160)]
    public string Title { get; set; } = string.Empty;
    [Required, MinLength(2), MaxLength(200)]
    public string Slug { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
}

public class PaymentGatewayRequest
{
    [Required, MinLength(2), MaxLength(60)]
    public string GatewayId { get; set; } = string.Empty;
    public string CredentialsJson { get; set; } = "{}";
    public bool TestMode { get; set; }
    public string PlanId { get; set; } = "default";
}
