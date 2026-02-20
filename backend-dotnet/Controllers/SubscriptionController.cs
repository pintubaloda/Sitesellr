using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using backend_dotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/stores/{storeId:guid}/subscription")]
public class StoreSubscriptionController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ISubscriptionCapabilityService _caps;

    public StoreSubscriptionController(AppDbContext db, ISubscriptionCapabilityService caps)
    {
        _db = db;
        _caps = caps;
    }

    [HttpGet("capabilities")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> Capabilities(Guid storeId, CancellationToken ct)
    {
        var cap = await _caps.GetCapabilitiesAsync(storeId, ct);
        return Ok(cap);
    }

    [HttpGet("usage")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> Usage(Guid storeId, CancellationToken ct)
    {
        var usage = await _caps.GetUsageAsync(storeId, ct);
        return Ok(usage);
    }

    [HttpPost("preview-check")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> PreviewCheck(Guid storeId, [FromBody] SubscriptionActionCheckRequest req, CancellationToken ct)
    {
        if (req.Action == "products.create")
        {
            var chk = await _caps.CheckProductsCreateAsync(storeId, req.VariantsCount, ct);
            if (!chk.Allowed) return StatusCode(StatusCodes.Status403Forbidden, new { error = chk.Error, details = chk.Details });
            return Ok(new { allowed = true });
        }
        if (req.Action == "themes.apply")
        {
            var chk = await _caps.CheckThemeApplyAsync(storeId, req.ThemeIsPremium, req.ThemeTier, ct);
            if (!chk.Allowed) return StatusCode(StatusCodes.Status403Forbidden, new { error = chk.Error, details = chk.Details });
            return Ok(new { allowed = true });
        }
        return BadRequest(new { error = "unsupported_action" });
    }
}

[ApiController]
[Route("api/platform/billing-plans")]
[Authorize(Policy = Policies.PlatformOwner)]
public class PlatformBillingPlansController : ControllerBase
{
    private readonly AppDbContext _db;

    public PlatformBillingPlansController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var rows = await _db.BillingPlans.AsNoTracking().OrderBy(x => x.PricePerMonth).ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] BillingPlan req, CancellationToken ct)
    {
        req.Id = Guid.NewGuid();
        req.Code = req.Code.Trim().ToLowerInvariant();
        req.CreatedAt = DateTimeOffset.UtcNow;
        _db.BillingPlans.Add(req);
        await _db.SaveChangesAsync(ct);
        return Ok(req);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] BillingPlan req, CancellationToken ct)
    {
        var row = await _db.BillingPlans.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (row == null) return NotFound();
        row.Name = req.Name;
        row.Code = req.Code.Trim().ToLowerInvariant();
        row.PricePerMonth = req.PricePerMonth;
        row.TrialDays = req.TrialDays;
        row.MaxStores = req.MaxStores;
        row.MaxProducts = req.MaxProducts;
        row.MaxVariantsPerProduct = req.MaxVariantsPerProduct;
        row.MaxCategories = req.MaxCategories;
        row.MaxPaymentGateways = req.MaxPaymentGateways;
        row.AllowedGatewayTypesJson = req.AllowedGatewayTypesJson;
        row.CodEnabled = req.CodEnabled;
        row.SmsEnabled = req.SmsEnabled;
        row.SmsQuotaMonthly = req.SmsQuotaMonthly;
        row.EmailEnabled = req.EmailEnabled;
        row.EmailQuotaMonthly = req.EmailQuotaMonthly;
        row.WhatsappEnabled = req.WhatsappEnabled;
        row.WhatsappFeaturesTier = req.WhatsappFeaturesTier;
        row.MaxPluginsInstalled = req.MaxPluginsInstalled;
        row.AllowedPluginTiersJson = req.AllowedPluginTiersJson;
        row.PaidPluginsAllowed = req.PaidPluginsAllowed;
        row.AllowedThemeTier = req.AllowedThemeTier;
        row.MaxThemeInstalls = req.MaxThemeInstalls;
        row.PremiumThemeAccess = req.PremiumThemeAccess;
        row.CapabilitiesJson = req.CapabilitiesJson;
        row.IsActive = req.IsActive;
        await _db.SaveChangesAsync(ct);
        return Ok(row);
    }
}

public class SubscriptionActionCheckRequest
{
    public string Action { get; set; } = string.Empty;
    public int VariantsCount { get; set; }
    public bool ThemeIsPremium { get; set; }
    public string ThemeTier { get; set; } = "free";
}
