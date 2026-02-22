using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Services;

public interface ICloudflareDnsService
{
    Task<(bool Success, string? Error)> EnsureTenantSubdomainAsync(string subdomain, CancellationToken ct);
    Task<CustomDomainDnsResult> EnsureCustomDomainAsync(string hostname, string verificationToken, CancellationToken ct);
    Task<CustomDomainDnsResult> CheckCustomDomainAsync(string hostname, string verificationToken, CancellationToken ct);
    Task<(bool Success, string? Error, IReadOnlyCollection<object> Zones)> ListZonesAsync(CancellationToken ct, string? apiTokenOverride = null);
    Task<(bool Success, string? Error)> TestConnectivityAsync(CancellationToken ct, string? apiTokenOverride = null);
}

public record CustomDomainDnsResult(
    bool ManagedByCloudflare,
    bool CnameConfigured,
    bool VerificationTxtConfigured,
    bool Success,
    string? ZoneId,
    string? TargetHost,
    string? Error);

public class CloudflareDnsService : ICloudflareDnsService
{
    private readonly IConfiguration _config;
    // FIX: IHttpClientFactory lets us create a fresh client per call, avoiding
    // shared DefaultRequestHeaders mutation across concurrent requests.
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<CloudflareDnsService> _logger;
    private readonly AppDbContext _db;

    public CloudflareDnsService(
        IConfiguration config,
        IHttpClientFactory httpClientFactory,
        ILogger<CloudflareDnsService> logger,
        AppDbContext db)
    {
        _config = config;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _db = db;
    }

    // ─── Public surface ────────────────────────────────────────────────────────

    public async Task<(bool Success, string? Error)> EnsureTenantSubdomainAsync(string subdomain, CancellationToken ct)
    {
        var token = await GetValueAsync("platform.domains.cloudflare.api_token", "CLOUDFLARE_API_TOKEN", ct);
        var zoneId = await GetValueAsync("platform.domains.cloudflare.zone_id", "CLOUDFLARE_ZONE_ID", ct);
        var baseDomain = await GetValueAsync("platform.domains.platform_base_domain", "PLATFORM_BASE_DOMAIN", ct);
        var target = await GetValueAsync("platform.domains.platform_ingress_host", "PLATFORM_INGRESS_HOST", ct);

        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(zoneId)
            || string.IsNullOrWhiteSpace(baseDomain) || string.IsNullOrWhiteSpace(target))
            return (false, "Cloudflare DNS configuration is incomplete (api_token / zone_id / base_domain / ingress_host).");

        var fullHost = $"{subdomain.Trim().ToLowerInvariant()}.{baseDomain.Trim().ToLowerInvariant()}";
        var http = CreateClient(token);

        try
        {
            var existing = await GetDnsRecordByNameAsync(http, zoneId, "CNAME", fullHost, ct);
            if (!string.IsNullOrWhiteSpace(existing.RecordId))
                return (true, null); // already exists – idempotent

            var payload = JsonSerializer.Serialize(new
            {
                type = "CNAME",
                name = fullHost,
                content = target,
                proxied = true,
                ttl = 1
            });
            var createResp = await http.PostAsync(
                $"https://api.cloudflare.com/client/v4/zones/{zoneId}/dns_records",
                new StringContent(payload, Encoding.UTF8, "application/json"),
                ct);

            if (!createResp.IsSuccessStatusCode)
            {
                var body = await createResp.Content.ReadAsStringAsync(ct);
                var cfError = ExtractCloudflareError(body);
                _logger.LogWarning("Cloudflare CNAME create failed for {Host}: {Status} {Error}", fullHost, createResp.StatusCode, cfError);
                return (false, $"Cloudflare create failed ({createResp.StatusCode}): {cfError}");
            }
            return (true, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cloudflare subdomain provisioning failed for {Subdomain}", subdomain);
            return (false, ex.Message);
        }
    }

    public async Task<CustomDomainDnsResult> EnsureCustomDomainAsync(string hostname, string verificationToken, CancellationToken ct)
    {
        var token = await GetValueAsync("platform.domains.cloudflare.api_token", "CLOUDFLARE_API_TOKEN", ct);
        var target = await GetValueAsync("platform.domains.platform_ingress_host", "PLATFORM_INGRESS_HOST", ct);

        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(target))
            return new CustomDomainDnsResult(false, false, false, false, null, target,
                "Cloudflare API token or platform ingress host is not configured.");

        var normalizedHost = hostname.Trim().ToLowerInvariant();
        var verificationHost = $"_sitesellr-verify.{normalizedHost}";
        var http = CreateClient(token);

        var zone = await ResolveZoneIdAsync(http, normalizedHost, ct);
        if (!zone.Success || string.IsNullOrWhiteSpace(zone.ZoneId))
            return new CustomDomainDnsResult(false, false, false, false, null, target,
                zone.Error ?? "No matching Cloudflare zone found for this hostname. The domain must already be in your Cloudflare account.");

        var cname = await UpsertDnsRecordAsync(http, zone.ZoneId, "CNAME", normalizedHost, target.Trim().ToLowerInvariant(), proxied: true, ct);
        var txt = await UpsertDnsRecordAsync(http, zone.ZoneId, "TXT", verificationHost, verificationToken.Trim(), proxied: null, ct);

        var success = cname.Success && txt.Success;
        var error = success ? null : string.Join("; ", new[] { cname.Error, txt.Error }.Where(x => !string.IsNullOrWhiteSpace(x)));
        return new CustomDomainDnsResult(true, cname.Success, txt.Success, success, zone.ZoneId, target,
            string.IsNullOrWhiteSpace(error) ? null : error);
    }

    public async Task<CustomDomainDnsResult> CheckCustomDomainAsync(string hostname, string verificationToken, CancellationToken ct)
    {
        var token = await GetValueAsync("platform.domains.cloudflare.api_token", "CLOUDFLARE_API_TOKEN", ct);
        var target = await GetValueAsync("platform.domains.platform_ingress_host", "PLATFORM_INGRESS_HOST", ct);

        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(target))
            return new CustomDomainDnsResult(false, false, false, false, null, target,
                "Cloudflare API token or platform ingress host is not configured.");

        var normalizedHost = hostname.Trim().ToLowerInvariant();
        var verificationHost = $"_sitesellr-verify.{normalizedHost}";
        var http = CreateClient(token);

        var zone = await ResolveZoneIdAsync(http, normalizedHost, ct);
        if (!zone.Success || string.IsNullOrWhiteSpace(zone.ZoneId))
            return new CustomDomainDnsResult(false, false, false, false, null, target,
                zone.Error ?? "No matching Cloudflare zone found for this hostname.");

        var cname = await FindDnsRecordAsync(http, zone.ZoneId, "CNAME", normalizedHost, ct);
        var txt = await FindDnsRecordAsync(http, zone.ZoneId, "TXT", verificationHost, ct);

        var expectedTarget = target.Trim().TrimEnd('.').ToLowerInvariant();
        var cnameConfigured = !string.IsNullOrWhiteSpace(cname.Content)
            && cname.Content.Trim().TrimEnd('.').Equals(expectedTarget, StringComparison.OrdinalIgnoreCase);
        // TXT records from Cloudflare are returned wrapped in quotes — strip them
        var txtRaw = (txt.Content ?? string.Empty).Trim().Trim('"');
        var txtConfigured = txtRaw.Equals(verificationToken.Trim(), StringComparison.Ordinal);

        var success = cnameConfigured && txtConfigured;
        string? errorDetail = null;
        if (!cnameConfigured) errorDetail = $"CNAME for '{normalizedHost}' does not point to '{expectedTarget}'.";
        else if (!txtConfigured) errorDetail = $"TXT record for '{verificationHost}' not matching expected token.";

        return new CustomDomainDnsResult(true, cnameConfigured, txtConfigured, success, zone.ZoneId, target,
            success ? null : errorDetail ?? "DNS records are not fully configured yet.");
    }

    public async Task<(bool Success, string? Error)> TestConnectivityAsync(CancellationToken ct, string? apiTokenOverride = null)
    {
        var token = apiTokenOverride;
        if (string.IsNullOrWhiteSpace(token))
            token = await GetValueAsync("platform.domains.cloudflare.api_token", "CLOUDFLARE_API_TOKEN", ct);
        if (string.IsNullOrWhiteSpace(token))
            return (false, "Cloudflare API token is not configured.");

        var http = CreateClient(token);
        try
        {
            var resp = await http.GetAsync("https://api.cloudflare.com/client/v4/user/tokens/verify", ct);
            if (!resp.IsSuccessStatusCode)
            {
                var body = await resp.Content.ReadAsStringAsync(ct);
                return (false, $"Token verification failed ({resp.StatusCode}): {ExtractCloudflareError(body)}");
            }
            return (true, null);
        }
        catch (Exception ex)
        {
            return (false, $"Network error: {ex.Message}");
        }
    }

    public async Task<(bool Success, string? Error, IReadOnlyCollection<object> Zones)> ListZonesAsync(CancellationToken ct, string? apiTokenOverride = null)
    {
        var token = apiTokenOverride;
        if (string.IsNullOrWhiteSpace(token))
            token = await GetValueAsync("platform.domains.cloudflare.api_token", "CLOUDFLARE_API_TOKEN", ct);
        if (string.IsNullOrWhiteSpace(token))
            return (false, "Cloudflare API token is not configured.", Array.Empty<object>());

        var http = CreateClient(token);
        try
        {
            var resp = await http.GetAsync("https://api.cloudflare.com/client/v4/zones?status=active&per_page=100", ct);
            if (!resp.IsSuccessStatusCode)
            {
                var body = await resp.Content.ReadAsStringAsync(ct);
                return (false, $"Zones request failed ({resp.StatusCode}): {ExtractCloudflareError(body)}", Array.Empty<object>());
            }

            var bodyJson = await resp.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(bodyJson);
            if (!doc.RootElement.TryGetProperty("result", out var result) || result.ValueKind != JsonValueKind.Array)
                return (false, "Unexpected response from Cloudflare zones API.", Array.Empty<object>());

            var zones = result.EnumerateArray()
                .Select(x => (object)new
                {
                    id = x.TryGetProperty("id", out var idNode) ? idNode.GetString() : string.Empty,
                    name = x.TryGetProperty("name", out var nameNode) ? nameNode.GetString() : string.Empty,
                    status = x.TryGetProperty("status", out var statusNode) ? statusNode.GetString() : string.Empty
                })
                .ToList();
            return (true, null, zones);
        }
        catch (Exception ex)
        {
            return (false, $"Network error: {ex.Message}", Array.Empty<object>());
        }
    }

    // ─── Internals ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a new HttpClient with the Bearer token set per-request.
    /// This avoids the race condition of mutating shared DefaultRequestHeaders on the
    /// singleton/scoped HttpClient that was registered via AddHttpClient.
    /// </summary>
    private HttpClient CreateClient(string apiToken)
    {
        var http = _httpClientFactory.CreateClient("Cloudflare");
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);
        return http;
    }

    private async Task<(bool Success, string? ZoneId, string? Error)> ResolveZoneIdAsync(HttpClient http, string hostname, CancellationToken ct)
    {
        var labels = hostname.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (labels.Length < 2) return (false, null, "Hostname must have at least two labels (e.g. shop.example.com).");

        // Walk from most-specific to least-specific (shop.example.com → example.com)
        for (var i = 0; i <= labels.Length - 2; i++)
        {
            var candidate = string.Join('.', labels.Skip(i));
            var url = $"https://api.cloudflare.com/client/v4/zones?name={Uri.EscapeDataString(candidate)}&status=active&per_page=1";
            try
            {
                var resp = await http.GetAsync(url, ct);
                if (!resp.IsSuccessStatusCode) continue;
                var body = await resp.Content.ReadAsStringAsync(ct);
                using var doc = JsonDocument.Parse(body);
                if (!doc.RootElement.TryGetProperty("result", out var result)
                    || result.ValueKind != JsonValueKind.Array
                    || result.GetArrayLength() == 0) continue;
                var zoneId = result[0].GetProperty("id").GetString();
                if (!string.IsNullOrWhiteSpace(zoneId)) return (true, zoneId, null);
            }
            catch { /* continue to next candidate */ }
        }
        return (false, null, "No matching active Cloudflare zone found for this hostname. Make sure the root domain is managed in your Cloudflare account.");
    }

    private async Task<(bool Success, string? Content, string? Error)> FindDnsRecordAsync(HttpClient http, string zoneId, string type, string name, CancellationToken ct)
    {
        var url = $"https://api.cloudflare.com/client/v4/zones/{zoneId}/dns_records?type={Uri.EscapeDataString(type)}&name={Uri.EscapeDataString(name)}";
        try
        {
            var resp = await http.GetAsync(url, ct);
            if (!resp.IsSuccessStatusCode)
                return (false, null, $"Cloudflare list failed ({resp.StatusCode}).");
            var body = await resp.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("result", out var result)
                || result.ValueKind != JsonValueKind.Array
                || result.GetArrayLength() == 0)
                return (false, null, "record_not_found");
            var content = result[0].GetProperty("content").GetString();
            return (true, content, null);
        }
        catch (Exception ex)
        {
            return (false, null, ex.Message);
        }
    }

    private async Task<(bool Success, string? Error)> UpsertDnsRecordAsync(
        HttpClient http, string zoneId, string type, string name, string content, bool? proxied, CancellationToken ct)
    {
        var existing = await GetDnsRecordByNameAsync(http, zoneId, type, name, ct);
        var payload = BuildDnsPayload(type, name, content, proxied);

        if (!string.IsNullOrWhiteSpace(existing.RecordId))
        {
            // If the record already has the correct value, skip the update
            var existingNorm = (existing.Content ?? string.Empty).Trim().Trim('"').TrimEnd('.');
            var newNorm = content.Trim().TrimEnd('.');
            if (string.Equals(existingNorm, newNorm, StringComparison.OrdinalIgnoreCase))
                return (true, null);

            var updateResp = await http.PutAsync(
                $"https://api.cloudflare.com/client/v4/zones/{zoneId}/dns_records/{existing.RecordId}",
                new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
                ct);
            if (!updateResp.IsSuccessStatusCode)
            {
                var body = await updateResp.Content.ReadAsStringAsync(ct);
                return (false, $"Cloudflare update failed ({updateResp.StatusCode}): {ExtractCloudflareError(body)}");
            }
            return (true, null);
        }

        var createResp = await http.PostAsync(
            $"https://api.cloudflare.com/client/v4/zones/{zoneId}/dns_records",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
            ct);
        if (!createResp.IsSuccessStatusCode)
        {
            var body = await createResp.Content.ReadAsStringAsync(ct);
            return (false, $"Cloudflare create failed ({createResp.StatusCode}): {ExtractCloudflareError(body)}");
        }
        return (true, null);
    }

    private static Dictionary<string, object?> BuildDnsPayload(string type, string name, string content, bool? proxied)
    {
        var payload = new Dictionary<string, object?>
        {
            ["type"] = type,
            ["name"] = name,
            ["content"] = content
        };
        if (proxied.HasValue)
            payload["proxied"] = proxied.Value;
        else
            payload["ttl"] = 120;
        return payload;
    }

    private async Task<(string? RecordId, string? Content)> GetDnsRecordByNameAsync(HttpClient http, string zoneId, string type, string name, CancellationToken ct)
    {
        var url = $"https://api.cloudflare.com/client/v4/zones/{zoneId}/dns_records?type={Uri.EscapeDataString(type)}&name={Uri.EscapeDataString(name)}";
        try
        {
            var resp = await http.GetAsync(url, ct);
            if (!resp.IsSuccessStatusCode) return (null, null);
            var body = await resp.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("result", out var result)
                || result.ValueKind != JsonValueKind.Array
                || result.GetArrayLength() == 0) return (null, null);
            var row = result[0];
            return (row.GetProperty("id").GetString(), row.GetProperty("content").GetString());
        }
        catch
        {
            return (null, null);
        }
    }

    private static string ExtractCloudflareError(string responseBody)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseBody);
            if (doc.RootElement.TryGetProperty("errors", out var errors)
                && errors.ValueKind == JsonValueKind.Array
                && errors.GetArrayLength() > 0)
            {
                var first = errors[0];
                if (first.TryGetProperty("message", out var msg))
                    return msg.GetString() ?? responseBody;
            }
        }
        catch { /* fall through */ }
        return responseBody.Length > 300 ? responseBody[..300] + "…" : responseBody;
    }

    private async Task<string?> GetValueAsync(string settingsKey, string configKey, CancellationToken ct)
    {
        var value = await _db.PlatformBrandingSettings.AsNoTracking()
            .Where(x => x.Key == settingsKey)
            .Select(x => x.Value)
            .FirstOrDefaultAsync(ct);
        return !string.IsNullOrWhiteSpace(value) ? value : _config[configKey];
    }
}
