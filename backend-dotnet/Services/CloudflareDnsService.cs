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
    private readonly HttpClient _http;
    private readonly ILogger<CloudflareDnsService> _logger;
    private readonly AppDbContext _db;

    public CloudflareDnsService(IConfiguration config, HttpClient http, ILogger<CloudflareDnsService> logger, AppDbContext db)
    {
        _config = config;
        _http = http;
        _logger = logger;
        _db = db;
    }

    public async Task<(bool Success, string? Error)> EnsureTenantSubdomainAsync(string subdomain, CancellationToken ct)
    {
        var token = await GetValueAsync("platform.domains.cloudflare.api_token", "CLOUDFLARE_API_TOKEN", ct);
        var zoneId = await GetValueAsync("platform.domains.cloudflare.zone_id", "CLOUDFLARE_ZONE_ID", ct);
        var baseDomain = await GetValueAsync("platform.domains.platform_base_domain", "PLATFORM_BASE_DOMAIN", ct);
        var target = await GetValueAsync("platform.domains.platform_ingress_host", "PLATFORM_INGRESS_HOST", ct);
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(zoneId) || string.IsNullOrWhiteSpace(baseDomain) || string.IsNullOrWhiteSpace(target))
            return (false, "Cloudflare DNS env vars missing.");

        var fullHost = $"{subdomain.Trim().ToLowerInvariant()}.{baseDomain.Trim().ToLowerInvariant()}";
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        try
        {
            var listUrl = $"https://api.cloudflare.com/client/v4/zones/{zoneId}/dns_records?type=CNAME&name={Uri.EscapeDataString(fullHost)}";
            var listResp = await _http.GetAsync(listUrl, ct);
            var listBody = await listResp.Content.ReadAsStringAsync(ct);
            if (!listResp.IsSuccessStatusCode) return (false, $"Cloudflare list failed: {listResp.StatusCode}");

            using var doc = JsonDocument.Parse(listBody);
            var result = doc.RootElement.GetProperty("result");
            if (result.ValueKind == JsonValueKind.Array && result.GetArrayLength() > 0)
            {
                return (true, null);
            }

            var payload = JsonSerializer.Serialize(new
            {
                type = "CNAME",
                name = fullHost,
                content = target,
                proxied = true,
                ttl = 1
            });
            var createResp = await _http.PostAsync(
                $"https://api.cloudflare.com/client/v4/zones/{zoneId}/dns_records",
                new StringContent(payload, Encoding.UTF8, "application/json"),
                ct);
            if (!createResp.IsSuccessStatusCode)
            {
                var createBody = await createResp.Content.ReadAsStringAsync(ct);
                return (false, $"Cloudflare create failed: {createResp.StatusCode} {createBody}");
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
        {
            return new CustomDomainDnsResult(false, false, false, false, null, target, "Cloudflare custom-domain env vars missing.");
        }

        var normalizedHost = hostname.Trim().ToLowerInvariant();
        var verificationHost = $"_sitesellr-verify.{normalizedHost}";
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var zone = await ResolveZoneIdAsync(normalizedHost, ct);
        if (!zone.Success || string.IsNullOrWhiteSpace(zone.ZoneId))
        {
            return new CustomDomainDnsResult(false, false, false, false, null, target, zone.Error ?? "Cloudflare zone not found for hostname.");
        }

        var cname = await UpsertDnsRecordAsync(zone.ZoneId, "CNAME", normalizedHost, target.Trim().ToLowerInvariant(), proxied: true, ct);
        var txt = await UpsertDnsRecordAsync(zone.ZoneId, "TXT", verificationHost, verificationToken.Trim(), proxied: null, ct);

        var success = cname.Success && txt.Success;
        var error = success ? null : string.Join("; ", new[] { cname.Error, txt.Error }.Where(x => !string.IsNullOrWhiteSpace(x)));
        return new CustomDomainDnsResult(true, cname.Success, txt.Success, success, zone.ZoneId, target, string.IsNullOrWhiteSpace(error) ? null : error);
    }

    public async Task<CustomDomainDnsResult> CheckCustomDomainAsync(string hostname, string verificationToken, CancellationToken ct)
    {
        var token = await GetValueAsync("platform.domains.cloudflare.api_token", "CLOUDFLARE_API_TOKEN", ct);
        var target = await GetValueAsync("platform.domains.platform_ingress_host", "PLATFORM_INGRESS_HOST", ct);
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(target))
        {
            return new CustomDomainDnsResult(false, false, false, false, null, target, "Cloudflare custom-domain env vars missing.");
        }

        var normalizedHost = hostname.Trim().ToLowerInvariant();
        var verificationHost = $"_sitesellr-verify.{normalizedHost}";
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var zone = await ResolveZoneIdAsync(normalizedHost, ct);
        if (!zone.Success || string.IsNullOrWhiteSpace(zone.ZoneId))
        {
            return new CustomDomainDnsResult(false, false, false, false, null, target, zone.Error ?? "Cloudflare zone not found for hostname.");
        }

        var cname = await FindDnsRecordAsync(zone.ZoneId, "CNAME", normalizedHost, ct);
        var txt = await FindDnsRecordAsync(zone.ZoneId, "TXT", verificationHost, ct);

        var expectedTarget = target.Trim().TrimEnd('.').ToLowerInvariant();
        var cnameConfigured = !string.IsNullOrWhiteSpace(cname.Content) && cname.Content.Trim().TrimEnd('.').Equals(expectedTarget, StringComparison.OrdinalIgnoreCase);
        var txtConfigured = !string.IsNullOrWhiteSpace(txt.Content) && txt.Content.Trim().Equals(verificationToken.Trim(), StringComparison.Ordinal);
        var success = cnameConfigured && txtConfigured;
        return new CustomDomainDnsResult(true, cnameConfigured, txtConfigured, success, zone.ZoneId, target, success ? null : "DNS records not fully configured yet.");
    }

    private async Task<(bool Success, string? ZoneId, string? Error)> ResolveZoneIdAsync(string hostname, CancellationToken ct)
    {
        var labels = hostname.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (labels.Length < 2) return (false, null, "Invalid hostname.");

        for (var i = 0; i <= labels.Length - 2; i++)
        {
            var candidate = string.Join('.', labels.Skip(i));
            var url = $"https://api.cloudflare.com/client/v4/zones?name={Uri.EscapeDataString(candidate)}&status=active&per_page=1";
            var resp = await _http.GetAsync(url, ct);
            if (!resp.IsSuccessStatusCode) continue;

            var body = await resp.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("result", out var result) || result.ValueKind != JsonValueKind.Array || result.GetArrayLength() == 0) continue;
            var zoneId = result[0].GetProperty("id").GetString();
            if (!string.IsNullOrWhiteSpace(zoneId)) return (true, zoneId, null);
        }

        return (false, null, "No matching Cloudflare zone found for hostname.");
    }

    private async Task<(bool Success, string? Content, string? Error)> FindDnsRecordAsync(string zoneId, string type, string name, CancellationToken ct)
    {
        var listUrl = $"https://api.cloudflare.com/client/v4/zones/{zoneId}/dns_records?type={Uri.EscapeDataString(type)}&name={Uri.EscapeDataString(name)}";
        var listResp = await _http.GetAsync(listUrl, ct);
        if (!listResp.IsSuccessStatusCode)
        {
            return (false, null, $"Cloudflare list failed: {listResp.StatusCode}");
        }

        var listBody = await listResp.Content.ReadAsStringAsync(ct);
        using var listDoc = JsonDocument.Parse(listBody);
        if (!listDoc.RootElement.TryGetProperty("result", out var result) || result.ValueKind != JsonValueKind.Array || result.GetArrayLength() == 0)
        {
            return (false, null, "record_not_found");
        }

        var content = result[0].GetProperty("content").GetString();
        return (true, content, null);
    }

    private async Task<(bool Success, string? Error)> UpsertDnsRecordAsync(string zoneId, string type, string name, string content, bool? proxied, CancellationToken ct)
    {
        var existing = await GetDnsRecordByNameAsync(zoneId, type, name, ct);
        if (!string.IsNullOrWhiteSpace(existing.RecordId))
        {
            var existingContent = existing.Content?.Trim().Trim('"');
            if (string.Equals(existingContent, content.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                return (true, null);
            }

            var updatePayload = new Dictionary<string, object?>
            {
                ["type"] = type,
                ["name"] = name,
                ["content"] = content
            };
            if (proxied.HasValue) updatePayload["proxied"] = proxied.Value;
            if (!proxied.HasValue) updatePayload["ttl"] = 120;

            var updateResp = await _http.PutAsync(
                $"https://api.cloudflare.com/client/v4/zones/{zoneId}/dns_records/{existing.RecordId}",
                new StringContent(JsonSerializer.Serialize(updatePayload), Encoding.UTF8, "application/json"),
                ct);
            if (!updateResp.IsSuccessStatusCode)
            {
                var body = await updateResp.Content.ReadAsStringAsync(ct);
                return (false, $"Cloudflare update failed: {updateResp.StatusCode} {body}");
            }
            return (true, null);
        }

        var createPayload = new Dictionary<string, object?>
        {
            ["type"] = type,
            ["name"] = name,
            ["content"] = content
        };
        if (proxied.HasValue) createPayload["proxied"] = proxied.Value;
        if (!proxied.HasValue) createPayload["ttl"] = 120;

        var createResp = await _http.PostAsync(
            $"https://api.cloudflare.com/client/v4/zones/{zoneId}/dns_records",
            new StringContent(JsonSerializer.Serialize(createPayload), Encoding.UTF8, "application/json"),
            ct);
        if (!createResp.IsSuccessStatusCode)
        {
            var body = await createResp.Content.ReadAsStringAsync(ct);
            return (false, $"Cloudflare create failed: {createResp.StatusCode} {body}");
        }
        return (true, null);
    }

    private async Task<(string? RecordId, string? Content)> GetDnsRecordByNameAsync(string zoneId, string type, string name, CancellationToken ct)
    {
        var listUrl = $"https://api.cloudflare.com/client/v4/zones/{zoneId}/dns_records?type={Uri.EscapeDataString(type)}&name={Uri.EscapeDataString(name)}";
        var listResp = await _http.GetAsync(listUrl, ct);
        if (!listResp.IsSuccessStatusCode) return (null, null);
        var listBody = await listResp.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(listBody);
        if (!doc.RootElement.TryGetProperty("result", out var result) || result.ValueKind != JsonValueKind.Array || result.GetArrayLength() == 0) return (null, null);
        var row = result[0];
        return (row.GetProperty("id").GetString(), row.GetProperty("content").GetString());
    }

    private async Task<string?> GetValueAsync(string settingsKey, string configKey, CancellationToken ct)
    {
        var value = await _db.PlatformBrandingSettings.AsNoTracking()
            .Where(x => x.Key == settingsKey)
            .Select(x => x.Value)
            .FirstOrDefaultAsync(ct);
        if (!string.IsNullOrWhiteSpace(value))
        {
            return value;
        }
        return _config[configKey];
    }

    public async Task<(bool Success, string? Error)> TestConnectivityAsync(CancellationToken ct, string? apiTokenOverride = null)
    {
        var token = apiTokenOverride;
        if (string.IsNullOrWhiteSpace(token))
        {
            token = await GetValueAsync("platform.domains.cloudflare.api_token", "CLOUDFLARE_API_TOKEN", ct);
        }
        if (string.IsNullOrWhiteSpace(token))
        {
            return (false, "Cloudflare API token is missing.");
        }

        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await _http.GetAsync("https://api.cloudflare.com/client/v4/user/tokens/verify", ct);
        if (!resp.IsSuccessStatusCode)
        {
            var body = await resp.Content.ReadAsStringAsync(ct);
            return (false, $"Cloudflare token verify failed: {resp.StatusCode} {body}");
        }
        return (true, null);
    }

    public async Task<(bool Success, string? Error, IReadOnlyCollection<object> Zones)> ListZonesAsync(CancellationToken ct, string? apiTokenOverride = null)
    {
        var token = apiTokenOverride;
        if (string.IsNullOrWhiteSpace(token))
        {
            token = await GetValueAsync("platform.domains.cloudflare.api_token", "CLOUDFLARE_API_TOKEN", ct);
        }
        if (string.IsNullOrWhiteSpace(token))
        {
            return (false, "Cloudflare API token is missing.", Array.Empty<object>());
        }

        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await _http.GetAsync("https://api.cloudflare.com/client/v4/zones?status=active&per_page=100", ct);
        if (!resp.IsSuccessStatusCode)
        {
            var body = await resp.Content.ReadAsStringAsync(ct);
            return (false, $"Cloudflare zones request failed: {resp.StatusCode} {body}", Array.Empty<object>());
        }

        var bodyJson = await resp.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(bodyJson);
        if (!doc.RootElement.TryGetProperty("result", out var result) || result.ValueKind != JsonValueKind.Array)
        {
            return (false, "Invalid Cloudflare zones response.", Array.Empty<object>());
        }

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
}
