using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/platform/branding")]
public class PlatformBrandingController : ControllerBase
{
    private readonly AppDbContext _db;

    public PlatformBrandingController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var rows = await _db.PlatformBrandingSettings.AsNoTracking().ToListAsync(ct);
        var map = rows.ToDictionary(x => x.Key, x => x.Value, StringComparer.OrdinalIgnoreCase);
        return Ok(new
        {
            brandName = map.GetValueOrDefault("brandName", "Sitesellr"),
            logoUrl = map.GetValueOrDefault("logoUrl", string.Empty),
            primaryColor = map.GetValueOrDefault("primaryColor", "#2563eb"),
            accentColor = map.GetValueOrDefault("accentColor", "#0f172a"),
            fontFamily = map.GetValueOrDefault("fontFamily", "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"),
            landingHeroTitle = map.GetValueOrDefault("landingHeroTitle", string.Empty),
            landingHeroSubtitle = map.GetValueOrDefault("landingHeroSubtitle", string.Empty)
        });
    }

    [HttpPut]
    [Authorize(Policy = Policies.PlatformOwner)]
    public async Task<IActionResult> Put([FromBody] PlatformBrandingRequest req, CancellationToken ct)
    {
        var kv = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["brandName"] = req.BrandName?.Trim() ?? "Sitesellr",
            ["logoUrl"] = req.LogoUrl?.Trim() ?? string.Empty,
            ["primaryColor"] = req.PrimaryColor?.Trim() ?? "#2563eb",
            ["accentColor"] = req.AccentColor?.Trim() ?? "#0f172a",
            ["fontFamily"] = req.FontFamily?.Trim() ?? "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            ["landingHeroTitle"] = req.LandingHeroTitle?.Trim() ?? string.Empty,
            ["landingHeroSubtitle"] = req.LandingHeroSubtitle?.Trim() ?? string.Empty
        };
        var rows = await _db.PlatformBrandingSettings.Where(x => kv.Keys.Contains(x.Key)).ToListAsync(ct);
        foreach (var pair in kv)
        {
            var row = rows.FirstOrDefault(x => x.Key == pair.Key);
            if (row == null)
            {
                _db.PlatformBrandingSettings.Add(new PlatformBrandingSetting
                {
                    Key = pair.Key,
                    Value = pair.Value,
                    UpdatedAt = DateTimeOffset.UtcNow
                });
            }
            else
            {
                row.Value = pair.Value;
                row.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }
        await _db.SaveChangesAsync(ct);
        return Ok(new { saved = true });
    }
}

public class PlatformBrandingRequest
{
    public string? BrandName { get; set; }
    public string? LogoUrl { get; set; }
    public string? PrimaryColor { get; set; }
    public string? AccentColor { get; set; }
    public string? FontFamily { get; set; }
    public string? LandingHeroTitle { get; set; }
    public string? LandingHeroSubtitle { get; set; }
}
