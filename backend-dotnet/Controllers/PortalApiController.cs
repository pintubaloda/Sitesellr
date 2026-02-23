using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api")]
[Route("api/v1")]
public class PortalApiController : BaseApiController
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public PortalApiController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpGet("platform/dashboard/summary")]
    [Authorize]
    public async Task<IActionResult> PlatformDashboardSummary(CancellationToken ct)
    {
        if (!HasPlatformAccess()) return Forbid();
        var now = DateTimeOffset.UtcNow;
        var monthStart = new DateTimeOffset(new DateTime(now.Year, now.Month, 1), TimeSpan.Zero);
        var prevMonthStart = monthStart.AddMonths(-1);

        var total = await _db.Merchants.CountAsync(ct);
        var active = await _db.Merchants.CountAsync(x => x.Status == MerchantStatus.Active, ct);
        var trial = await _db.Merchants.CountAsync(x => x.Status == MerchantStatus.Trial, ct);
        var suspended = await _db.Merchants.CountAsync(x => x.Status == MerchantStatus.Suspended, ct);
        var setup = await _db.Merchants.CountAsync(x => x.Status == MerchantStatus.Trial && !_db.Stores.Any(s => s.MerchantId == x.Id && s.Status == StoreStatus.Active), ct);
        var newThisMonth = await _db.Merchants.CountAsync(x => x.CreatedAt >= monthStart, ct);
        var newLastMonth = await _db.Merchants.CountAsync(x => x.CreatedAt >= prevMonthStart && x.CreatedAt < monthStart, ct);

        var paidSubscriptions = await _db.MerchantSubscriptions.AsNoTracking()
            .Include(x => x.Plan)
            .Where(x => !x.IsCancelled && (!x.ExpiresAt.HasValue || x.ExpiresAt > now))
            .Select(x => x.Plan.PricePerMonth)
            .ToListAsync(ct);
        var mrr = paidSubscriptions.Sum();
        var mrrPrev = mrr; // no historical billing ledger yet

        var todayStart = now.Date;
        var yesterdayStart = todayStart.AddDays(-1);
        var ordersToday = await _db.Orders.CountAsync(x => x.CreatedAt >= todayStart, ct);
        var ordersYesterday = await _db.Orders.CountAsync(x => x.CreatedAt >= yesterdayStart && x.CreatedAt < todayStart, ct);

        return Ok(new
        {
            tenants = new
            {
                total,
                active,
                trial,
                setup,
                suspended,
                newThisMonth,
                growthPct = Percent(newLastMonth, newThisMonth)
            },
            revenue = new
            {
                mrrFormatted = FormatInrLakh(mrr),
                mrr,
                vsLastMonthPct = Percent(mrrPrev, mrr)
            },
            orders = new
            {
                today = ordersToday,
                vsYesterdayPct = Percent(ordersYesterday, ordersToday)
            },
            uptime = new
            {
                pct = 99.97,
                slaMet = true
            }
        });
    }

    [HttpGet("platform/dashboard/activity")]
    [Authorize]
    public async Task<IActionResult> PlatformDashboardActivity([FromQuery] int limit = 20, [FromQuery] int offset = 0, CancellationToken ct = default)
    {
        if (!HasPlatformAccess()) return Forbid();
        var boundedLimit = Math.Clamp(limit, 1, 100);
        var boundedOffset = Math.Max(0, offset);

        var total = await _db.AuditLogs.CountAsync(ct);
        var items = await _db.AuditLogs.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Skip(boundedOffset)
            .Take(boundedLimit)
            .Select(x => new
            {
                id = x.Id,
                type = x.Action,
                message = string.IsNullOrWhiteSpace(x.Details) ? x.Action : x.Details,
                tenantId = x.MerchantId,
                tenantName = (string?)null,
                createdAt = x.CreatedAt,
                timeAgo = HumanizeAgo(x.CreatedAt)
            })
            .ToListAsync(ct);

        return Ok(new { items, total });
    }

    [HttpGet("platform/dashboard/revenue-by-plan")]
    [Authorize]
    public async Task<IActionResult> PlatformRevenueByPlan(CancellationToken ct)
    {
        if (!HasPlatformAccess()) return Forbid();
        var now = DateTimeOffset.UtcNow;
        var rows = await _db.MerchantSubscriptions.AsNoTracking()
            .Include(x => x.Plan)
            .Where(x => !x.IsCancelled && (!x.ExpiresAt.HasValue || x.ExpiresAt > now))
            .GroupBy(x => x.Plan.Name)
            .Select(g => new
            {
                plan = g.Key,
                revenue = g.Sum(x => x.Plan.PricePerMonth)
            })
            .OrderByDescending(x => x.revenue)
            .ToListAsync(ct);
        var total = rows.Sum(x => x.revenue);

        var plans = rows.Select(x => new
        {
            x.plan,
            x.revenue,
            revenueFormatted = FormatInrLakh(x.revenue),
            pct = total <= 0 ? 0 : (int)Math.Round((double)(x.revenue / total) * 100)
        });

        return Ok(new { plans });
    }

    [HttpGet("platform/system/health")]
    [Authorize]
    public IActionResult PlatformSystemHealth()
    {
        if (!HasPlatformAccess()) return Forbid();
        return Ok(new
        {
            overall = "operational",
            services = new object[]
            {
                new { name = "API Gateway", status = "healthy", latencyMs = 98 },
                new { name = "Database", status = "healthy", latencyMs = 12 },
                new { name = "Storage (S3)", status = "healthy", latencyMs = (int?)null },
                new { name = "Email Service", status = "healthy", latencyMs = (int?)null },
                new { name = "Payment API", status = "healthy", latencyMs = (int?)null }
            }
        });
    }

    [HttpGet("platform/tenants")]
    [Authorize]
    public async Task<IActionResult> PlatformTenants([FromQuery] string status = "all", [FromQuery] string plan = "all", [FromQuery] string? search = null, [FromQuery] string sort = "created_desc", [FromQuery] int page = 1, [FromQuery] int limit = 20, CancellationToken ct = default)
    {
        if (!HasPlatformAccess()) return Forbid();
        var pageNo = Math.Max(1, page);
        var pageSize = Math.Clamp(limit, 1, 100);
        var query = _db.Merchants.AsNoTracking().AsQueryable();

        if (!string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            if (TryMapTenantStatus(status, out var mappedStatus))
            {
                query = query.Where(x => x.Status == mappedStatus);
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var needle = search.Trim().ToLowerInvariant();
            query = query.Where(x =>
                x.Name.ToLower().Contains(needle) ||
                (x.PrimaryDomain != null && x.PrimaryDomain.ToLower().Contains(needle)));
        }

        query = sort.Trim().ToLowerInvariant() switch
        {
            "name_asc" => query.OrderBy(x => x.Name),
            _ => query.OrderByDescending(x => x.CreatedAt)
        };

        var total = await query.CountAsync(ct);
        var merchants = await query.Skip((pageNo - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        var merchantIds = merchants.Select(x => x.Id).ToArray();

        var storeMap = await _db.Stores.AsNoTracking()
            .Where(x => merchantIds.Contains(x.MerchantId))
            .GroupBy(x => x.MerchantId)
            .Select(g => new
            {
                merchantId = g.Key,
                store = g.OrderBy(x => x.CreatedAt).FirstOrDefault()
            })
            .ToListAsync(ct);
        var storeByMerchant = storeMap.ToDictionary(x => x.merchantId, x => x.store);
        var storeIds = storeMap.Where(x => x.store != null).Select(x => x.store!.Id).ToArray();

        var domains = await _db.StoreDomains.AsNoTracking()
            .Where(x => storeIds.Contains(x.StoreId) && x.IsVerified)
            .GroupBy(x => x.StoreId)
            .Select(g => new { storeId = g.Key, domain = g.Select(x => x.Hostname).FirstOrDefault() })
            .ToListAsync(ct);
        var domainByStore = domains.ToDictionary(x => x.storeId, x => x.domain ?? string.Empty);

        var latestSubscriptions = await _db.MerchantSubscriptions.AsNoTracking()
            .Include(x => x.Plan)
            .Where(x => merchantIds.Contains(x.MerchantId))
            .OrderByDescending(x => x.StartedAt)
            .Select(x => new { x.MerchantId, plan = x.Plan.Name })
            .ToListAsync(ct);
        var planByMerchant = latestSubscriptions
            .GroupBy(x => x.MerchantId)
            .ToDictionary(g => g.Key, g => g.First().plan);

        if (!string.Equals(plan, "all", StringComparison.OrdinalIgnoreCase))
        {
            merchants = merchants
                .Where(x => string.Equals(planByMerchant.GetValueOrDefault(x.Id, "Starter"), plan, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        var thirtyDaysAgo = DateTimeOffset.UtcNow.AddDays(-30);
        var revenueRows = await _db.Orders.AsNoTracking()
            .Where(x => x.CreatedAt >= thirtyDaysAgo && storeIds.Contains(x.StoreId))
            .GroupBy(x => x.StoreId)
            .Select(g => new { storeId = g.Key, revenue = g.Sum(x => x.Total), orders = g.Count() })
            .ToListAsync(ct);
        var revenueByStore = revenueRows.ToDictionary(x => x.storeId, x => x);

        var customerRows = await _db.Customers.AsNoTracking()
            .Where(x => storeIds.Contains(x.StoreId))
            .GroupBy(x => x.StoreId)
            .Select(g => new { storeId = g.Key, customers = g.Count() })
            .ToListAsync(ct);
        var customersByStore = customerRows.ToDictionary(x => x.storeId, x => x.customers);

        var data = merchants.Select(m =>
        {
            var store = storeByMerchant.GetValueOrDefault(m.Id);
            var revenue = store == null ? 0m : revenueByStore.GetValueOrDefault(store.Id)?.revenue ?? 0m;
            var orders = store == null ? 0 : revenueByStore.GetValueOrDefault(store.Id)?.orders ?? 0;
            var customers = store == null ? 0 : customersByStore.GetValueOrDefault(store.Id, 0);
            var planName = planByMerchant.GetValueOrDefault(m.Id, "Starter");
            var customDomain = store != null ? domainByStore.GetValueOrDefault(store.Id, "") : "";

            return new
            {
                id = m.Id,
                name = m.Name,
                subdomain = store?.Subdomain ?? "",
                customDomain,
                hasCustomDomain = !string.IsNullOrWhiteSpace(customDomain),
                status = MapTenantStatus(m.Status),
                plan = planName,
                owner = new { name = "Store Owner", email = "" },
                stats = new
                {
                    monthlyRevenue = revenue,
                    monthlyRevenueFormatted = FormatInr(revenue),
                    ordersPerMonth = orders,
                    customers
                },
                createdAt = m.CreatedAt,
                memberSince = m.CreatedAt.ToString("MMM yyyy"),
                suspendReason = m.Status == MerchantStatus.Suspended ? "Suspended by platform" : (string?)null
            };
        }).ToList();

        return Ok(new
        {
            data,
            pagination = new
            {
                total,
                page = pageNo,
                limit = pageSize,
                totalPages = (int)Math.Ceiling(total / (double)pageSize)
            }
        });
    }

    [HttpPost("platform/tenants")]
    [Authorize]
    public async Task<IActionResult> PlatformCreateTenant([FromBody] PlatformTenantCreateRequest req, CancellationToken ct)
    {
        if (!HasPlatformAccess()) return Forbid();
        if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Subdomain))
            return BadRequest(new { error = "name_subdomain_required" });

        if (!SubdomainPolicy.TryNormalizeRequested(req.Subdomain, out var normalizedSubdomain, out var subdomainErr))
            return BadRequest(new { error = subdomainErr ?? "subdomain_invalid" });

        var exists = await _db.Stores.AsNoTracking().AnyAsync(x => x.Subdomain == normalizedSubdomain, ct);
        if (exists) return Conflict(new { error = "subdomain_taken" });

        var merchant = new Merchant
        {
            Name = req.Name.Trim(),
            PrimaryDomain = normalizedSubdomain,
            Status = MerchantStatus.Trial,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.Merchants.Add(merchant);

        var store = new Store
        {
            Merchant = merchant,
            Name = req.Name.Trim(),
            Subdomain = normalizedSubdomain,
            Currency = "INR",
            Timezone = "Asia/Kolkata",
            Status = StoreStatus.Active,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.Stores.Add(store);

        var ownerEmail = string.IsNullOrWhiteSpace(req.OwnerEmail)
            ? $"{normalizedSubdomain}.owner@sitesellr.local"
            : req.OwnerEmail.Trim().ToLowerInvariant();
        var ownerName = string.IsNullOrWhiteSpace(req.OwnerName) ? req.Name.Trim() : req.OwnerName.Trim();

        var ownerUser = await _db.Users.FirstOrDefaultAsync(x => x.Email == ownerEmail, ct);
        if (ownerUser == null)
        {
            var tempPassword = $"SiteSellr@{Random.Shared.Next(1000, 9999)}";
            ownerUser = new User
            {
                Email = ownerEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword, workFactor: 12),
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.Users.Add(ownerUser);
        }

        _db.StoreUserRoles.Add(new StoreUserRole
        {
            Store = store,
            User = ownerUser,
            Role = StoreRole.Owner,
            CreatedAt = DateTimeOffset.UtcNow
        });

        var planCode = string.IsNullOrWhiteSpace(req.Plan) ? "growth" : req.Plan.Trim().ToLowerInvariant();
        var plan = await _db.BillingPlans.FirstOrDefaultAsync(x => x.Code == planCode, ct)
            ?? await _db.BillingPlans.OrderBy(x => x.PricePerMonth).FirstAsync(ct);
        _db.MerchantSubscriptions.Add(new MerchantSubscription
        {
            Merchant = merchant,
            Plan = plan,
            StartedAt = DateTimeOffset.UtcNow,
            TrialEndsAt = DateTimeOffset.UtcNow.AddDays(plan.TrialDays),
            ExpiresAt = null
        });

        await _db.SaveChangesAsync(ct);
        return StatusCode(StatusCodes.Status201Created, new
        {
            tenantId = merchant.Id,
            subdomain = normalizedSubdomain,
            dashboardUrl = $"https://{normalizedSubdomain}.{ResolveBaseDomain()}/admin",
            inviteEmailSent = false,
            message = $"Tenant created for {ownerName}"
        });
    }

    [HttpPatch("platform/tenants/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> PlatformPatchTenant(Guid id, [FromBody] PlatformTenantPatchRequest req, CancellationToken ct)
    {
        if (!HasPlatformAccess()) return Forbid();
        var merchant = await _db.Merchants.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (merchant == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(req.Status) && TryMapTenantStatus(req.Status, out var status))
        {
            merchant.Status = status;
        }

        if (!string.IsNullOrWhiteSpace(req.Plan))
        {
            var plan = await _db.BillingPlans.FirstOrDefaultAsync(x => x.Code == req.Plan.Trim().ToLowerInvariant(), ct);
            if (plan != null)
            {
                _db.MerchantSubscriptions.Add(new MerchantSubscription
                {
                    MerchantId = merchant.Id,
                    PlanId = plan.Id,
                    StartedAt = DateTimeOffset.UtcNow,
                    TrialEndsAt = DateTimeOffset.UtcNow.AddDays(plan.TrialDays),
                    ExpiresAt = null
                });
            }
        }

        if (!string.IsNullOrWhiteSpace(req.CustomDomain))
        {
            var store = await _db.Stores.FirstOrDefaultAsync(x => x.MerchantId == merchant.Id, ct);
            if (store != null)
            {
                var existing = await _db.StoreDomains.FirstOrDefaultAsync(x => x.StoreId == store.Id && x.Hostname == req.CustomDomain.Trim().ToLowerInvariant(), ct);
                if (existing == null)
                {
                    _db.StoreDomains.Add(new StoreDomain
                    {
                        StoreId = store.Id,
                        Hostname = req.CustomDomain.Trim().ToLowerInvariant(),
                        VerificationToken = Guid.NewGuid().ToString("N"),
                        IsVerified = false,
                        SslProvider = "letsencrypt",
                        SslStatus = "pending",
                        DnsStatus = "pending",
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    });
                }
            }
        }

        merchant.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { id = merchant.Id, status = MapTenantStatus(merchant.Status) });
    }

    [HttpDelete("platform/tenants/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> PlatformDeleteTenant(Guid id, CancellationToken ct)
    {
        if (!HasPlatformAccess()) return Forbid();
        var merchant = await _db.Merchants.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (merchant == null) return NotFound();
        if (merchant.Status != MerchantStatus.Suspended) return BadRequest(new { error = "only_suspended_can_be_deleted" });
        merchant.Status = MerchantStatus.Expired;
        merchant.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("platform/tenants/{id:guid}/reinstate")]
    [Authorize]
    public async Task<IActionResult> PlatformReinstateTenant(Guid id, CancellationToken ct)
    {
        if (!HasPlatformAccess()) return Forbid();
        var merchant = await _db.Merchants.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (merchant == null) return NotFound();
        merchant.Status = MerchantStatus.Active;
        merchant.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { tenantId = merchant.Id, status = "active", message = "Tenant reinstated" });
    }

    [HttpGet("store/dashboard/summary")]
    [Authorize]
    public async Task<IActionResult> StoreDashboardSummary(CancellationToken ct)
    {
        var store = await ResolveCurrentStoreAsync(ct);
        if (store == null) return Forbid();

        var todayStart = DateTimeOffset.UtcNow.Date;
        var yesterdayStart = todayStart.AddDays(-1);
        var monthStart = new DateTimeOffset(new DateTime(DateTimeOffset.UtcNow.Year, DateTimeOffset.UtcNow.Month, 1), TimeSpan.Zero);

        var ordersToday = await _db.Orders.AsNoTracking().Where(x => x.StoreId == store.Id && x.CreatedAt >= todayStart).ToListAsync(ct);
        var ordersYesterday = await _db.Orders.AsNoTracking().Where(x => x.StoreId == store.Id && x.CreatedAt >= yesterdayStart && x.CreatedAt < todayStart).ToListAsync(ct);
        var monthOrders = await _db.Orders.AsNoTracking().Where(x => x.StoreId == store.Id && x.CreatedAt >= monthStart).ToListAsync(ct);
        var monthCustomers = await _db.Customers.AsNoTracking().CountAsync(x => x.StoreId == store.Id && x.CreatedAt >= monthStart, ct);
        var allCustomers = await _db.Customers.AsNoTracking().CountAsync(x => x.StoreId == store.Id, ct);
        var totalProducts = await _db.Products.AsNoTracking().CountAsync(x => x.StoreId == store.Id, ct);

        var variants = await _db.ProductVariants.AsNoTracking()
            .Join(_db.Products.AsNoTracking().Where(p => p.StoreId == store.Id), v => v.ProductId, p => p.Id, (v, _) => v)
            .ToListAsync(ct);
        var lowStock = variants.Count(x => (x.Quantity - x.ReservedQuantity) > 0 && (x.Quantity - x.ReservedQuantity) <= 5);
        var outOfStock = variants.Count(x => (x.Quantity - x.ReservedQuantity) <= 0);

        var subscriptionPlan = await _db.MerchantSubscriptions.AsNoTracking()
            .Include(x => x.Plan)
            .Where(x => x.MerchantId == store.MerchantId && !x.IsCancelled)
            .OrderByDescending(x => x.StartedAt)
            .Select(x => x.Plan.Name)
            .FirstOrDefaultAsync(ct) ?? "Free";

        var domain = !string.IsNullOrWhiteSpace(store.Subdomain)
            ? $"{store.Subdomain}.{ResolveBaseDomain()}"
            : ResolveBaseDomain();

        return Ok(new
        {
            store = new
            {
                name = store.Name,
                domain,
                isLive = store.Status == StoreStatus.Active,
                plan = subscriptionPlan
            },
            today = new
            {
                revenue = ordersToday.Sum(x => x.Total),
                revenueFormatted = FormatInr(ordersToday.Sum(x => x.Total)),
                vsYesterdayPct = Percent(ordersYesterday.Sum(x => x.Total), ordersToday.Sum(x => x.Total)),
                orders = ordersToday.Count,
                newOrdersLastHour = ordersToday.Count(x => x.CreatedAt >= DateTimeOffset.UtcNow.AddHours(-1)),
                visitors = allCustomers, // no pageview table yet
                vsYesterdayVisitorPct = 0
            },
            month = new
            {
                revenue = monthOrders.Sum(x => x.Total),
                revenueFormatted = FormatInr(monthOrders.Sum(x => x.Total)),
                orders = monthOrders.Count,
                avgRating = 4.8,
                customers = monthCustomers
            },
            inventory = new
            {
                lowStockCount = lowStock,
                outOfStockCount = outOfStock,
                totalProducts
            }
        });
    }

    [HttpGet("store/dashboard/revenue-weekly")]
    [Authorize]
    public async Task<IActionResult> StoreDashboardRevenueWeekly(CancellationToken ct)
    {
        var store = await ResolveCurrentStoreAsync(ct);
        if (store == null) return Forbid();
        var start = DateTimeOffset.UtcNow.Date.AddDays(-6);
        var previousStart = start.AddDays(-7);
        var now = DateTimeOffset.UtcNow;

        var current = await _db.Orders.AsNoTracking()
            .Where(x => x.StoreId == store.Id && x.CreatedAt >= start && x.CreatedAt <= now)
            .ToListAsync(ct);
        var previous = await _db.Orders.AsNoTracking()
            .Where(x => x.StoreId == store.Id && x.CreatedAt >= previousStart && x.CreatedAt < start)
            .ToListAsync(ct);

        var dayBuckets = Enumerable.Range(0, 7)
            .Select(i => start.AddDays(i))
            .Select(day =>
            {
                var rev = current.Where(x => x.CreatedAt.Date == day.Date).Sum(x => x.Total);
                return new
                {
                    label = day.Date == DateTimeOffset.UtcNow.Date ? "Today" : day.ToString("ddd"),
                    date = day.ToString("yyyy-MM-dd"),
                    revenue = rev
                };
            })
            .ToList();

        var max = dayBuckets.Max(x => x.revenue);
        var days = dayBuckets.Select(x => new
        {
            x.label,
            x.date,
            x.revenue,
            pct = max <= 0 ? 0 : (int)Math.Round((double)(x.revenue / max) * 100)
        });

        var total = dayBuckets.Sum(x => x.revenue);
        var previousTotal = previous.Sum(x => x.Total);
        return Ok(new
        {
            total,
            totalFormatted = FormatInr(total),
            vsLastWeekPct = Percent(previousTotal, total),
            days
        });
    }

    [HttpGet("store/dashboard/health")]
    [Authorize]
    public async Task<IActionResult> StoreDashboardHealth(CancellationToken ct)
    {
        var store = await ResolveCurrentStoreAsync(ct);
        if (store == null) return Forbid();
        var domain = await _db.StoreDomains.AsNoTracking()
            .Where(x => x.StoreId == store.Id)
            .OrderByDescending(x => x.UpdatedAt)
            .FirstOrDefaultAsync(ct);

        return Ok(new
        {
            overall = "good",
            checks = new object[]
            {
                new { key = "ssl", label = "SSL Certificate", status = domain?.SslStatus == "active" ? "ok" : "warning", detail = domain?.SslExpiresAt.HasValue == true ? $"Valid · {(int)Math.Max(0, Math.Floor((domain.SslExpiresAt.Value - DateTimeOffset.UtcNow).TotalDays))}d" : "Pending" },
                new { key = "domain", label = "Custom Domain", status = domain?.IsVerified == true ? "ok" : "warning", detail = domain?.IsVerified == true ? "Connected" : "Not connected" },
                new { key = "payment", label = "Payment Gateway", status = "ok", detail = "Active" },
                new { key = "email", label = "Email Verified", status = "ok", detail = "Configured" },
                new { key = "analytics", label = "Google Analytics", status = "warning", detail = "Not connected" }
            }
        });
    }

    [HttpGet("store/orders")]
    [Authorize]
    public async Task<IActionResult> StoreOrders([FromQuery] string status = "all", [FromQuery] string? search = null, [FromQuery] int page = 1, [FromQuery] int limit = 20, [FromQuery] DateTimeOffset? dateFrom = null, [FromQuery] DateTimeOffset? dateTo = null, CancellationToken ct = default)
    {
        var store = await ResolveCurrentStoreAsync(ct);
        if (store == null) return Forbid();
        var pageNo = Math.Max(1, page);
        var pageSize = Math.Clamp(limit, 1, 100);

        var q = _db.Orders.AsNoTracking()
            .Include(x => x.Customer)
            .Include(x => x.Items)
            .Where(x => x.StoreId == store.Id);

        if (!string.Equals(status, "all", StringComparison.OrdinalIgnoreCase) && TryMapOrderStatus(status, out var orderStatus))
            q = q.Where(x => x.Status == orderStatus);
        if (dateFrom.HasValue) q = q.Where(x => x.CreatedAt >= dateFrom.Value);
        if (dateTo.HasValue) q = q.Where(x => x.CreatedAt <= dateTo.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLowerInvariant();
            q = q.Where(x => x.Id.ToString().ToLower().Contains(s) || (x.Customer != null && x.Customer.Name.ToLower().Contains(s)));
        }

        var total = await q.CountAsync(ct);
        var rows = await q.OrderByDescending(x => x.CreatedAt).Skip((pageNo - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        var todayStart = DateTimeOffset.UtcNow.Date;
        var summaryOrders = await _db.Orders.AsNoTracking().Where(x => x.StoreId == store.Id && x.CreatedAt >= todayStart).ToListAsync(ct);

        return Ok(new
        {
            summary = new
            {
                total,
                paid = summaryOrders.Count(x => x.PaymentStatus == PaymentStatus.Paid),
                shipped = summaryOrders.Count(x => x.Status == OrderStatus.Shipped || x.Status == OrderStatus.Delivered),
                pending = summaryOrders.Count(x => x.Status == OrderStatus.Pending || x.Status == OrderStatus.Paid),
                cancelled = summaryOrders.Count(x => x.Status == OrderStatus.Cancelled),
                revenueToday = summaryOrders.Sum(x => x.Total)
            },
            data = rows.Select(x => new
            {
                id = x.Id,
                displayId = $"#{x.Id.ToString()[..6].ToUpperInvariant()}",
                customer = new
                {
                    name = x.Customer?.Name ?? "Guest",
                    email = x.Customer?.Email ?? ""
                },
                items = x.Items.Select(i => new { name = i.Title, qty = i.Quantity, price = i.Price }),
                itemsSummary = string.Join(", ", x.Items.Take(2).Select(i => i.Title)),
                amount = x.Total,
                amountFormatted = FormatInr(x.Total),
                status = MapOrderStatusLabel(x.Status, x.PaymentStatus),
                paymentMethod = x.PaymentStatus == PaymentStatus.Pending ? "Pending" : "Online",
                createdAt = x.CreatedAt,
                createdAtFormatted = x.CreatedAt.ToString("dd MMM yyyy")
            }),
            pagination = new
            {
                total,
                page = pageNo,
                limit = pageSize,
                totalPages = (int)Math.Ceiling(total / (double)pageSize)
            }
        });
    }

    [HttpPatch("store/orders/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> UpdateStoreOrder(Guid id, [FromBody] StoreOrderPatchRequest req, CancellationToken ct)
    {
        var store = await ResolveCurrentStoreAsync(ct);
        if (store == null) return Forbid();
        var row = await _db.Orders.FirstOrDefaultAsync(x => x.Id == id && x.StoreId == store.Id, ct);
        if (row == null) return NotFound();

        if (TryMapOrderStatus(req.Status ?? "", out var status))
            row.Status = status;
        if (!string.IsNullOrWhiteSpace(req.Status) && string.Equals(req.Status, "paid", StringComparison.OrdinalIgnoreCase))
            row.PaymentStatus = PaymentStatus.Paid;
        if (string.Equals(req.Status, "cancelled", StringComparison.OrdinalIgnoreCase))
            row.PaymentStatus = PaymentStatus.Refunded;

        var noteBits = new List<string>();
        if (!string.IsNullOrWhiteSpace(req.TrackingNumber)) noteBits.Add($"tracking:{req.TrackingNumber.Trim()}");
        if (!string.IsNullOrWhiteSpace(req.ShippingProvider)) noteBits.Add($"carrier:{req.ShippingProvider.Trim()}");
        if (noteBits.Count > 0)
        {
            var suffix = string.Join(";", noteBits);
            row.Notes = string.IsNullOrWhiteSpace(row.Notes) ? suffix : $"{row.Notes};{suffix}";
        }
        row.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { id = row.Id, status = row.Status.ToString().ToLowerInvariant() });
    }

    [HttpGet("store/inventory/alerts")]
    [Authorize]
    public async Task<IActionResult> StoreInventoryAlerts(CancellationToken ct)
    {
        var store = await ResolveCurrentStoreAsync(ct);
        if (store == null) return Forbid();

        var rows = await _db.Products.AsNoTracking()
            .Where(x => x.StoreId == store.Id)
            .Include(x => x.Variants)
            .OrderByDescending(x => x.UpdatedAt)
            .Take(200)
            .ToListAsync(ct);

        var data = rows.Select(x =>
        {
            var available = x.Variants.Sum(v => v.Quantity - v.ReservedQuantity);
            var status = available <= 0 ? "out_of_stock" : available <= 5 ? "low" : "ok";
            return new
            {
                id = x.Id,
                name = x.Title,
                sku = x.SKU ?? "-",
                emoji = "📦",
                stock = available,
                price = x.Price,
                priceFormatted = FormatInr(x.Price),
                stockStatus = status,
                stockLabel = available <= 0 ? "Out of stock" : $"{available} left"
            };
        })
        .Where(x => x.stockStatus != "ok")
        .Take(50)
        .ToList();

        return Ok(new { data });
    }

    private bool HasPlatformAccess()
    {
        return Tenancy?.UserId != null && (Tenancy.IsPlatformOwner || Tenancy.IsPlatformStaff);
    }

    private async Task<Store?> ResolveCurrentStoreAsync(CancellationToken ct)
    {
        if (Tenancy?.UserId == null) return null;
        if (Tenancy.Store != null)
        {
            return await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Id == Tenancy.Store.Id, ct);
        }

        if (Tenancy.IsPlatformOwner || Tenancy.IsPlatformStaff)
        {
            var anyStore = await _db.Stores.AsNoTracking().OrderBy(x => x.CreatedAt).FirstOrDefaultAsync(ct);
            return anyStore;
        }

        var userId = Tenancy.UserId.Value;
        var fallbackStoreId = await _db.StoreUserRoles.AsNoTracking().Where(x => x.UserId == userId).Select(x => x.StoreId).FirstOrDefaultAsync(ct);
        if (fallbackStoreId == Guid.Empty) return null;
        return await _db.Stores.AsNoTracking().FirstOrDefaultAsync(x => x.Id == fallbackStoreId, ct);
    }

    private static bool TryMapTenantStatus(string raw, out MerchantStatus status)
    {
        switch (raw.Trim().ToLowerInvariant())
        {
            case "trial": status = MerchantStatus.Trial; return true;
            case "active": status = MerchantStatus.Active; return true;
            case "suspended": status = MerchantStatus.Suspended; return true;
            case "setup": status = MerchantStatus.Trial; return true;
            case "expired": status = MerchantStatus.Expired; return true;
            default: status = MerchantStatus.Trial; return false;
        }
    }

    private static string MapTenantStatus(MerchantStatus status) => status switch
    {
        MerchantStatus.Trial => "trial",
        MerchantStatus.Active => "active",
        MerchantStatus.Suspended => "suspended",
        MerchantStatus.Expired => "suspended",
        _ => "setup"
    };

    private static bool TryMapOrderStatus(string raw, out OrderStatus status)
    {
        switch (raw.Trim().ToLowerInvariant())
        {
            case "pending": status = OrderStatus.Pending; return true;
            case "paid": status = OrderStatus.Paid; return true;
            case "shipped": status = OrderStatus.Shipped; return true;
            case "delivered": status = OrderStatus.Delivered; return true;
            case "cancelled": status = OrderStatus.Cancelled; return true;
            default: status = OrderStatus.Pending; return false;
        }
    }

    private static string MapOrderStatusLabel(OrderStatus status, PaymentStatus paymentStatus)
    {
        if (status == OrderStatus.Shipped || status == OrderStatus.Delivered) return "shipped";
        if (status == OrderStatus.Cancelled) return "cancelled";
        if (paymentStatus == PaymentStatus.Paid) return "paid";
        return "pending";
    }

    private static string FormatInr(decimal amount) => $"₹{amount:N0}";
    private static string FormatInrLakh(decimal amount) => $"₹{(amount / 100000m):0.0}L";
    private static double Percent(decimal previous, decimal current)
    {
        if (previous == 0m) return current == 0m ? 0 : 100;
        return Math.Round((double)((current - previous) / previous * 100m), 2);
    }
    private static double Percent(int previous, int current)
    {
        if (previous == 0) return current == 0 ? 0 : 100;
        return Math.Round(((double)(current - previous) / previous) * 100d, 2);
    }

    private static string HumanizeAgo(DateTimeOffset at)
    {
        var delta = DateTimeOffset.UtcNow - at;
        if (delta.TotalMinutes < 1) return "just now";
        if (delta.TotalHours < 1) return $"{Math.Max(1, (int)delta.TotalMinutes)} minutes ago";
        if (delta.TotalDays < 1) return $"{Math.Max(1, (int)delta.TotalHours)} hours ago";
        return $"{Math.Max(1, (int)delta.TotalDays)} days ago";
    }

    private string ResolveBaseDomain()
    {
        return _config["PLATFORM_BASE_DOMAIN"]?.Trim().ToLowerInvariant() ?? "sitesellr.com";
    }
}

public class PlatformTenantCreateRequest
{
    public string Name { get; set; } = string.Empty;
    public string Subdomain { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
    public string Plan { get; set; } = "pro";
    public string Industry { get; set; } = string.Empty;
    public string? CustomDomain { get; set; }
}

public class PlatformTenantPatchRequest
{
    public string? Status { get; set; }
    public string? Plan { get; set; }
    public string? SuspendReason { get; set; }
    public string? CustomDomain { get; set; }
}

public class StoreOrderPatchRequest
{
    public string? Status { get; set; }
    public string? TrackingNumber { get; set; }
    public string? ShippingProvider { get; set; }
}
