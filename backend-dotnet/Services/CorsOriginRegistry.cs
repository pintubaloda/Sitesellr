using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Services;

public interface ICorsOriginRegistry
{
    bool IsAllowed(string origin);
}

public class CorsOriginRegistry : ICorsOriginRegistry
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _config;
    private readonly object _lock = new();
    private DateTimeOffset _lastRefresh = DateTimeOffset.MinValue;
    private List<string> _patterns = new();

    public CorsOriginRegistry(IServiceScopeFactory scopeFactory, IConfiguration config)
    {
        _scopeFactory = scopeFactory;
        _config = config;
    }

    public bool IsAllowed(string origin)
    {
        if (string.IsNullOrWhiteSpace(origin)) return false;
        EnsureFresh();
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var originUri)) return false;
        var patterns = _patterns;
        if (patterns.Count == 0 || patterns.Contains("*")) return true;

        foreach (var configured in patterns)
        {
            if (!Uri.TryCreate(configured, UriKind.Absolute, out var configuredUri)) continue;

            if (string.Equals(configuredUri.Scheme, originUri.Scheme, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(configuredUri.Host, originUri.Host, StringComparison.OrdinalIgnoreCase) &&
                configuredUri.Port == originUri.Port)
            {
                return true;
            }

            if (configuredUri.Host.StartsWith("*.", StringComparison.Ordinal))
            {
                var suffix = configuredUri.Host[1..];
                if (originUri.Host.EndsWith(suffix, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(configuredUri.Scheme, originUri.Scheme, StringComparison.OrdinalIgnoreCase) &&
                    configuredUri.Port == originUri.Port)
                {
                    return true;
                }
            }
        }

        return false;
    }

    private void EnsureFresh()
    {
        if (DateTimeOffset.UtcNow - _lastRefresh < TimeSpan.FromMinutes(1)) return;
        lock (_lock)
        {
            if (DateTimeOffset.UtcNow - _lastRefresh < TimeSpan.FromMinutes(1)) return;
            _patterns = LoadPatterns();
            _lastRefresh = DateTimeOffset.UtcNow;
        }
    }

    private List<string> LoadPatterns()
    {
        var fromEnv = (_config["CORS_ORIGINS"] ?? "*")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var rows = db.PlatformBrandingSettings.AsNoTracking()
                .Where(x =>
                    x.Key == "platform.security.cors.origins" ||
                    EF.Functions.ILike(x.Key, "store.security.cors.origins.%"))
                .Select(x => x.Value)
                .ToList();

            foreach (var value in rows)
            {
                var items = (value ?? string.Empty)
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                fromEnv.AddRange(items);
            }
        }
        catch
        {
            // keep env fallback only
        }

        return fromEnv
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
