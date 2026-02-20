using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Services;

public interface ITenancyResolver
{
    Task<TenancyContext> ResolveAsync(HttpContext httpContext, CancellationToken ct = default);
}

public class TenancyContext
{
    public Merchant? Merchant { get; set; }
    public Store? Store { get; set; }
    public Guid? UserId { get; set; }
    public StoreRole? Role { get; set; }
    public HashSet<string> StorePermissions { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public HashSet<PlatformRole> PlatformRoles { get; set; } = new();
    public HashSet<string> PlatformPermissions { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public bool IsAuthenticated => UserId.HasValue;
    public bool IsOwnerOrAdmin => Role is StoreRole.Owner or StoreRole.Admin;
    public bool IsPlatformOwner => PlatformRoles.Contains(PlatformRole.Owner);
    public bool IsPlatformStaff => PlatformRoles.Contains(PlatformRole.Staff) || IsPlatformOwner;
}

public class TenancyResolver : ITenancyResolver
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public TenancyResolver(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<TenancyContext> ResolveAsync(HttpContext httpContext, CancellationToken ct = default)
    {
        // Resolve by host, then header/query override.
        var host = httpContext.Request.Host.Host;
        var rootDomain = _config["Tenancy:RootDomain"]; // e.g., sitesellr.local or app.sitesellr.com

        Guid? storeIdFromHeader = null;

        if (Guid.TryParse(httpContext.Request.Headers["X-Store-Id"].FirstOrDefault(), out var guidHeader))
            storeIdFromHeader = guidHeader;
        if (Guid.TryParse(httpContext.Request.Query["storeId"].FirstOrDefault(), out var guidQuery))
            storeIdFromHeader = guidQuery;

        Store? store = null;
        Merchant? merchant = null;

        if (storeIdFromHeader.HasValue)
        {
            store = await _db.Stores.Include(s => s.Merchant).FirstOrDefaultAsync(s => s.Id == storeIdFromHeader.Value, ct);
            merchant = store?.Merchant;
        }
        else if (!string.IsNullOrWhiteSpace(host))
        {
            // Match by subdomain if rootDomain set, otherwise by full host on PrimaryDomain.
            if (!string.IsNullOrWhiteSpace(rootDomain) && host.EndsWith(rootDomain, StringComparison.OrdinalIgnoreCase))
            {
                var sub = host[..^(rootDomain.Length)].TrimEnd('.'); // take left part before root domain
                if (!string.IsNullOrEmpty(sub))
                {
                    store = await _db.Stores.Include(s => s.Merchant)
                        .FirstOrDefaultAsync(s => s.Subdomain == sub, ct);
                    merchant = store?.Merchant;
                }
            }

            if (store == null)
            {
                store = await _db.Stores.Include(s => s.Merchant)
                    .FirstOrDefaultAsync(s => s.Merchant.PrimaryDomain == host, ct);
                merchant = store?.Merchant;
            }
        }

        Guid? userId = null;
        StoreRole? role = null;
        var permissions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var platformRoles = new HashSet<PlatformRole>();
        var platformPermissions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var bearer = httpContext.Request.Headers.Authorization.FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(bearer) && bearer.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = bearer.Substring("Bearer ".Length).Trim();
            var hashed = new TokenService(_db, httpContext.RequestServices.GetRequiredService<ILogger<TokenService>>()).HashToken(token);
            var access = await _db.AccessTokens.FirstOrDefaultAsync(a => a.TokenHash == hashed && a.RevokedAt == null, ct);
            if (access != null && access.ExpiresAt > DateTimeOffset.UtcNow)
            {
                userId = access.UserId;
                if (store != null)
                {
                    var sur = await _db.StoreUserRoles.FirstOrDefaultAsync(r => r.StoreId == store.Id && r.UserId == access.UserId, ct);
                    role = sur?.Role;
                    foreach (var permission in PermissionCatalog.GetTemplatePermissions(role))
                    {
                        permissions.Add(permission);
                    }

                    var explicitPermissions = await _db.StoreUserPermissions.AsNoTracking()
                        .Where(p => p.StoreId == store.Id && p.UserId == access.UserId)
                        .Select(p => p.Permission)
                        .ToListAsync(ct);
                    foreach (var permission in explicitPermissions)
                    {
                        permissions.Add(permission);
                    }
                }
                else
                {
                    // Auto-bind first store membership so store users get menu/permissions right after login
                    // even when no store header is provided yet.
                    var fallback = await _db.StoreUserRoles
                        .Include(r => r.Store)
                        .ThenInclude(s => s.Merchant)
                        .FirstOrDefaultAsync(r => r.UserId == access.UserId, ct);
                    if (fallback != null)
                    {
                        store = fallback.Store;
                        merchant = fallback.Store.Merchant;
                        role = fallback.Role;

                        foreach (var permission in PermissionCatalog.GetTemplatePermissions(role))
                        {
                            permissions.Add(permission);
                        }

                        var explicitPermissions = await _db.StoreUserPermissions.AsNoTracking()
                            .Where(p => p.StoreId == store.Id && p.UserId == access.UserId)
                            .Select(p => p.Permission)
                            .ToListAsync(ct);
                        foreach (var permission in explicitPermissions)
                        {
                            permissions.Add(permission);
                        }
                    }
                }

                var platformRoleValues = await _db.PlatformUserRoles.AsNoTracking()
                    .Where(r => r.UserId == access.UserId)
                    .Select(r => r.Role)
                    .ToListAsync(ct);
                foreach (var pr in platformRoleValues)
                {
                    platformRoles.Add(pr);
                }

                if (platformRoles.Contains(PlatformRole.Owner))
                {
                    foreach (var permission in PermissionCatalog.GetPlatformOwnerTemplatePermissions())
                    {
                        platformPermissions.Add(permission);
                    }
                }
                else if (platformRoles.Contains(PlatformRole.Staff))
                {
                    foreach (var permission in PermissionCatalog.GetPlatformStaffTemplatePermissions())
                    {
                        platformPermissions.Add(permission);
                    }
                }
            }
        }

        return new TenancyContext
        {
            Merchant = merchant,
            Store = store,
            UserId = userId,
            Role = role,
            StorePermissions = permissions,
            PlatformRoles = platformRoles,
            PlatformPermissions = platformPermissions
        };
    }
}
