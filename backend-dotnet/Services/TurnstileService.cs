using System.Net.Http.Json;

namespace backend_dotnet.Services;

public interface ITurnstileService
{
    Task<bool> VerifyAsync(string token, string? remoteIp, CancellationToken ct = default);
}

public class TurnstileService : ITurnstileService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<TurnstileService> _logger;
    private readonly string? _secret;

    public TurnstileService(HttpClient httpClient, IConfiguration config, ILogger<TurnstileService> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
        _secret = _config["Turnstile:SecretKey"];
    }

    public async Task<bool> VerifyAsync(string token, string? remoteIp, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_secret))
        {
            _logger.LogWarning("Turnstile secret not configured; failing verification.");
            return false;
        }

        var request = new HttpRequestMessage(HttpMethod.Post, "https://challenges.cloudflare.com/turnstile/v0/siteverify")
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string?>
            {
                ["secret"] = _secret,
                ["response"] = token,
                ["remoteip"] = remoteIp
            }!)
        };

        var response = await _httpClient.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Turnstile verify HTTP {Status}", response.StatusCode);
            return false;
        }

        var payload = await response.Content.ReadFromJsonAsync<TurnstileResponse>(cancellationToken: ct);
        if (payload?.Success == true) return true;

        _logger.LogWarning("Turnstile failed: {Errors}", payload?.ErrorCodes == null ? "unknown" : string.Join(",", payload.ErrorCodes));
        return false;
    }

    private class TurnstileResponse
    {
        public bool Success { get; set; }
        public string?[]? ErrorCodes { get; set; }
    }
}
