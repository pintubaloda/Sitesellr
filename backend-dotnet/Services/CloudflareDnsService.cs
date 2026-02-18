using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace backend_dotnet.Services;

public interface ICloudflareDnsService
{
    Task<(bool Success, string? Error)> EnsureTenantSubdomainAsync(string subdomain, CancellationToken ct);
}

public class CloudflareDnsService : ICloudflareDnsService
{
    private readonly IConfiguration _config;
    private readonly HttpClient _http;
    private readonly ILogger<CloudflareDnsService> _logger;

    public CloudflareDnsService(IConfiguration config, HttpClient http, ILogger<CloudflareDnsService> logger)
    {
        _config = config;
        _http = http;
        _logger = logger;
    }

    public async Task<(bool Success, string? Error)> EnsureTenantSubdomainAsync(string subdomain, CancellationToken ct)
    {
        var token = _config["CLOUDFLARE_API_TOKEN"];
        var zoneId = _config["CLOUDFLARE_ZONE_ID"];
        var baseDomain = _config["PLATFORM_BASE_DOMAIN"];
        var target = _config["PLATFORM_INGRESS_HOST"];
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
}
