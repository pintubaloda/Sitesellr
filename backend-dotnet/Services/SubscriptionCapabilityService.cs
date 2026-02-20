using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace backend_dotnet.Services;

public record PlanCapabilities(
    string PlanCode,
    int MaxProducts,
    int MaxVariantsPerProduct,
    int MaxCategories,
    int MaxPaymentGateways,
    string[] AllowedGatewayTypes,
    bool CodEnabled,
    bool SmsEnabled,
    int SmsQuotaMonthly,
    bool EmailEnabled,
    int EmailQuotaMonthly,
    bool WhatsappEnabled,
    string WhatsappFeaturesTier,
    int MaxPluginsInstalled,
    string[] AllowedPluginTiers,
    bool PaidPluginsAllowed,
    string AllowedThemeTier,
    int MaxThemeInstalls,
    bool PremiumThemeAccess);

public interface ISubscriptionCapabilityService
{
    Task<PlanCapabilities> GetCapabilitiesAsync(Guid storeId, CancellationToken ct);
    Task<(bool Allowed, string? Error, object? Details)> CheckProductsCreateAsync(Guid storeId, int variantsCount, CancellationToken ct);
    Task<(bool Allowed, string? Error, object? Details)> CheckThemeApplyAsync(Guid storeId, bool isPremiumTheme, string themeTier, CancellationToken ct);
    Task<Models.StoreUsageCounter> GetUsageAsync(Guid storeId, CancellationToken ct);
}

public class SubscriptionCapabilityService : ISubscriptionCapabilityService
{
    private readonly AppDbContext _db;
    private readonly Dictionary<Guid, (PlanCapabilities Cap, DateTimeOffset At)> _cache = new();

    public SubscriptionCapabilityService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<PlanCapabilities> GetCapabilitiesAsync(Guid storeId, CancellationToken ct)
    {
        if (_cache.TryGetValue(storeId, out var cached) && (DateTimeOffset.UtcNow - cached.At).TotalMinutes < 5) return cached.Cap;
        var store = await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Id == storeId, ct);
        if (store == null) return DefaultCaps("none");
        var sub = await _db.MerchantSubscriptions.AsNoTracking()
            .Include(x => x.Plan)
            .Where(x => x.MerchantId == store.MerchantId && !x.IsCancelled)
            .OrderByDescending(x => x.StartedAt)
            .FirstOrDefaultAsync(ct);
        var plan = sub?.Plan;
        if (plan == null) return DefaultCaps("free");
        var caps = new PlanCapabilities(
            plan.Code.Trim().ToLowerInvariant(),
            plan.MaxProducts,
            plan.MaxVariantsPerProduct,
            plan.MaxCategories,
            plan.MaxPaymentGateways,
            ParseJsonArray(plan.AllowedGatewayTypesJson),
            plan.CodEnabled,
            plan.SmsEnabled,
            plan.SmsQuotaMonthly,
            plan.EmailEnabled,
            plan.EmailQuotaMonthly,
            plan.WhatsappEnabled,
            plan.WhatsappFeaturesTier,
            plan.MaxPluginsInstalled,
            ParseJsonArray(plan.AllowedPluginTiersJson),
            plan.PaidPluginsAllowed,
            plan.AllowedThemeTier,
            plan.MaxThemeInstalls,
            plan.PremiumThemeAccess);
        _cache[storeId] = (caps, DateTimeOffset.UtcNow);
        return caps;
    }

    public async Task<(bool Allowed, string? Error, object? Details)> CheckProductsCreateAsync(Guid storeId, int variantsCount, CancellationToken ct)
    {
        var caps = await GetCapabilitiesAsync(storeId, ct);
        var current = await _db.Products.AsNoTracking().CountAsync(x => x.StoreId == storeId, ct);
        if (caps.MaxProducts > 0 && current >= caps.MaxProducts)
            return (false, "plan_limit_exceeded", new { action = "products.create", limit = caps.MaxProducts, current });
        if (caps.MaxVariantsPerProduct > 0 && variantsCount > caps.MaxVariantsPerProduct)
            return (false, "plan_limit_exceeded", new { action = "products.variants", limit = caps.MaxVariantsPerProduct, current = variantsCount });
        return (true, null, null);
    }

    public async Task<(bool Allowed, string? Error, object? Details)> CheckThemeApplyAsync(Guid storeId, bool isPremiumTheme, string themeTier, CancellationToken ct)
    {
        var caps = await GetCapabilitiesAsync(storeId, ct);
        if (isPremiumTheme && !caps.PremiumThemeAccess)
            return (false, "feature_not_enabled", new { action = "themes.premium", requiredPlan = "growth_or_higher" });
        if (!string.IsNullOrWhiteSpace(themeTier) && CompareTier(themeTier, caps.AllowedThemeTier) > 0)
            return (false, "feature_not_enabled", new { action = "themes.tier", allowed = caps.AllowedThemeTier, requested = themeTier });
        // Theme apply is an activation switch. Install-count enforcement is handled by
        // marketplace purchase/install flows, not by every activation click.
        return (true, null, null);
    }

    public async Task<Models.StoreUsageCounter> GetUsageAsync(Guid storeId, CancellationToken ct)
    {
        var key = DateTime.UtcNow.ToString("yyyy-MM");
        var row = await _db.StoreUsageCounters.FirstOrDefaultAsync(x => x.StoreId == storeId && x.PeriodKey == key, ct);
        if (row != null) return row;
        row = new Models.StoreUsageCounter { StoreId = storeId, PeriodKey = key, UpdatedAt = DateTimeOffset.UtcNow };
        _db.StoreUsageCounters.Add(row);
        await _db.SaveChangesAsync(ct);
        return row;
    }

    private static string[] ParseJsonArray(string json)
    {
        try
        {
            var arr = JsonSerializer.Deserialize<string[]>(json);
            return arr?.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim().ToLowerInvariant()).ToArray() ?? Array.Empty<string>();
        }
        catch
        {
            return Array.Empty<string>();
        }
    }

    private static int CompareTier(string candidate, string allowed)
    {
        static int Rank(string x) => x.Trim().ToLowerInvariant() switch
        {
            "free" => 0,
            "standard" => 1,
            "premium" => 2,
            "enterprise" => 3,
            _ => 0
        };
        return Rank(candidate) - Rank(allowed);
    }

    private static PlanCapabilities DefaultCaps(string code) => new(
        code, 50, 20, 20, 1, Array.Empty<string>(), true, false, 0, true, 1000, false, "none", 2, Array.Empty<string>(), false, "free", 1, false);
}
