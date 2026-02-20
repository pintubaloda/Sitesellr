using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

public class StoreInsightsController : BaseApiController
{
    private readonly AppDbContext _db;

    public StoreInsightsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("/api/stores/{storeId:guid}/insights/dashboard")]
    [Authorize(Policy = Policies.OrdersRead)]
    public async Task<IActionResult> Dashboard(Guid storeId, [FromQuery] string range = "30d", CancellationToken ct = default)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();

        var (from, previousFrom) = ResolveRange(range);
        var orders = await _db.Orders.AsNoTracking()
            .Where(x => x.StoreId == storeId && x.CreatedAt >= previousFrom)
            .Include(x => x.Customer)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
        var customers = await _db.Customers.AsNoTracking()
            .Where(x => x.StoreId == storeId)
            .ToListAsync(ct);
        var products = await _db.Products.AsNoTracking()
            .Where(x => x.StoreId == storeId)
            .ToListAsync(ct);
        var categories = await _db.Categories.AsNoTracking()
            .Where(x => x.StoreId == storeId)
            .ToDictionaryAsync(x => x.Id, x => x.Name, ct);
        var logs = await _db.AuditLogs.AsNoTracking()
            .Where(x => x.StoreId == storeId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(10)
            .ToListAsync(ct);

        var currentOrders = orders.Where(x => x.CreatedAt >= from).ToList();
        var previousOrders = orders.Where(x => x.CreatedAt >= previousFrom && x.CreatedAt < from).ToList();
        var currentRevenue = currentOrders.Where(x => x.PaymentStatus == PaymentStatus.Paid || x.PaymentStatus == PaymentStatus.Partial).Sum(x => x.Total);
        var previousRevenue = previousOrders.Where(x => x.PaymentStatus == PaymentStatus.Paid || x.PaymentStatus == PaymentStatus.Partial).Sum(x => x.Total);
        var currentCustomers = customers.Count(x => x.CreatedAt >= from);
        var previousCustomers = customers.Count(x => x.CreatedAt >= previousFrom && x.CreatedAt < from);

        var series = currentOrders
            .GroupBy(x => x.CreatedAt.UtcDateTime.Date)
            .OrderBy(x => x.Key)
            .Select(g => new
            {
                label = g.Key.ToString("dd MMM"),
                revenue = g.Sum(x => x.Total),
                orders = g.Count()
            })
            .ToList();

        var categorySplit = products
            .GroupBy(x => x.CategoryId)
            .Select(g => new
            {
                name = g.Key.HasValue && categories.TryGetValue(g.Key.Value, out var name) ? name : "General",
                value = g.Count()
            })
            .OrderByDescending(x => x.value)
            .Take(6)
            .ToList();

        return Ok(new
        {
            metrics = new
            {
                totalRevenue = currentRevenue,
                totalOrders = currentOrders.Count,
                totalCustomers = currentCustomers,
                conversionRate = currentCustomers == 0 ? 0 : Math.Round((double)currentOrders.Count / currentCustomers * 100, 2),
                revenueChange = PercentageChange(previousRevenue, currentRevenue),
                ordersChange = PercentageChange(previousOrders.Count, currentOrders.Count),
                customersChange = PercentageChange(previousCustomers, currentCustomers)
            },
            revenueSeries = series,
            categorySplit,
            recentOrders = currentOrders.Take(8).Select(x => new
            {
                x.Id,
                customerName = x.Customer?.Name ?? "Guest",
                x.Status,
                x.Total,
                x.Currency,
                x.CreatedAt
            }),
            recentActivities = logs.Select(x => new
            {
                x.Id,
                x.Action,
                x.Details,
                x.CreatedAt
            })
        });
    }

    [HttpGet("/api/stores/{storeId:guid}/insights/analytics")]
    [Authorize(Policy = Policies.OrdersRead)]
    public async Task<IActionResult> Analytics(Guid storeId, [FromQuery] string range = "30d", CancellationToken ct = default)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();

        var (from, _) = ResolveRange(range);
        var orders = await _db.Orders.AsNoTracking()
            .Where(x => x.StoreId == storeId && x.CreatedAt >= from)
            .Include(x => x.Items)
            .ToListAsync(ct);
        var customers = await _db.Customers.AsNoTracking()
            .Where(x => x.StoreId == storeId && x.CreatedAt >= from)
            .ToListAsync(ct);

        var revenueSeries = orders
            .GroupBy(x => x.CreatedAt.UtcDateTime.Date)
            .OrderBy(x => x.Key)
            .Select(g => new
            {
                label = g.Key.ToString("dd MMM"),
                revenue = g.Sum(x => x.Total),
                orders = g.Count()
            })
            .ToList();

        var statusBreakdown = orders
            .GroupBy(x => x.Status.ToString())
            .Select(g => new { name = g.Key, value = g.Count() })
            .OrderByDescending(x => x.value)
            .ToList();

        var topProducts = orders
            .SelectMany(x => x.Items.Select(i => new { i.Title, i.Quantity, i.Total }))
            .GroupBy(x => x.Title)
            .Select(g => new
            {
                name = g.Key,
                units = g.Sum(x => x.Quantity),
                revenue = g.Sum(x => x.Total)
            })
            .OrderByDescending(x => x.revenue)
            .Take(10)
            .ToList();

        var totalRevenue = orders.Sum(x => x.Total);
        var totalOrders = orders.Count;
        var avgOrderValue = totalOrders == 0 ? 0 : Math.Round(totalRevenue / totalOrders, 2);
        var totalCustomers = customers.Count;
        var conversionRate = totalCustomers == 0 ? 0 : Math.Round((double)totalOrders / totalCustomers * 100, 2);

        return Ok(new
        {
            metrics = new
            {
                totalRevenue,
                totalOrders,
                avgOrderValue,
                totalCustomers,
                conversionRate
            },
            revenueSeries,
            statusBreakdown,
            topProducts
        });
    }

    [HttpGet("/api/stores/{storeId:guid}/insights/marketing")]
    [Authorize(Policy = Policies.StoreSettingsRead)]
    public async Task<IActionResult> Marketing(Guid storeId, [FromQuery] string range = "30d", CancellationToken ct = default)
    {
        if (Tenancy?.Store != null && Tenancy.Store.Id != storeId) return Forbid();
        var (from, _) = ResolveRange(range);

        var subscriptions = await _db.StoreCampaignTemplateSubscriptions.AsNoTracking()
            .Where(x => x.StoreId == storeId)
            .Include(x => x.Template)
            .OrderByDescending(x => x.UpdatedAt)
            .Take(100)
            .ToListAsync(ct);
        var events = await _db.CampaignPaymentEvents.AsNoTracking()
            .Where(x => x.StoreId == storeId && x.CreatedAt >= from)
            .OrderByDescending(x => x.CreatedAt)
            .Take(50)
            .ToListAsync(ct);
        var templates = await _db.CampaignTemplateCatalogItems.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderByDescending(x => x.IsFeatured)
            .ThenByDescending(x => x.FeaturedRank)
            .Take(20)
            .ToListAsync(ct);
        var inquiries = await _db.StoreQuoteInquiries.AsNoTracking()
            .Where(x => x.StoreId == storeId && x.CreatedAt >= from)
            .ToListAsync(ct);

        return Ok(new
        {
            metrics = new
            {
                activeCampaigns = subscriptions.Count(x => x.Status == "active"),
                paidCampaigns = subscriptions.Count(x => x.BillingStatus == "paid"),
                marketingSpend = subscriptions.Sum(x => x.ChargedAmount),
                templatesAvailable = templates.Count,
                quoteInquiries = inquiries.Count
            },
            subscriptions = subscriptions.Select(x => new
            {
                x.Id,
                templateName = x.Template.Name,
                x.Status,
                x.BillingStatus,
                x.ChargedAmount,
                x.Currency,
                x.UpdatedAt
            }),
            paymentEvents = events.Select(x => new
            {
                x.Id,
                x.EventType,
                x.Status,
                x.Amount,
                x.Currency,
                x.CreatedAt
            }),
            templates = templates.Select(x => new
            {
                x.Id,
                x.Name,
                x.Category,
                x.IsPaid,
                x.Price,
                x.IsFeatured
            })
        });
    }

    private static (DateTimeOffset from, DateTimeOffset previousFrom) ResolveRange(string range)
    {
        var now = DateTimeOffset.UtcNow;
        var duration = range switch
        {
            "7d" => TimeSpan.FromDays(7),
            "30d" => TimeSpan.FromDays(30),
            "90d" => TimeSpan.FromDays(90),
            "1y" => TimeSpan.FromDays(365),
            _ => TimeSpan.FromDays(30)
        };
        return (now.Subtract(duration), now.Subtract(duration * 2));
    }

    private static double PercentageChange(decimal previous, decimal current)
    {
        if (previous == 0m) return current == 0m ? 0d : 100d;
        return Math.Round((double)((current - previous) / previous * 100m), 2);
    }

    private static double PercentageChange(int previous, int current)
    {
        if (previous == 0) return current == 0 ? 0d : 100d;
        return Math.Round(((double)(current - previous) / previous) * 100d, 2);
    }
}
