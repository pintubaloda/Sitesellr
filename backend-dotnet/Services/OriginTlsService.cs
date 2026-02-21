using System.Diagnostics;
using System.Security.Cryptography.X509Certificates;
using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Services;

public record OriginTlsStatusResult(
    bool Configured,
    bool CertFileExists,
    bool KeyFileExists,
    DateTimeOffset? ExpiresAt,
    int? DaysRemaining,
    string? Message);

public record OriginTlsIssueResult(bool Success, string? Message);

public interface IOriginTlsService
{
    Task<OriginTlsStatusResult> GetStatusAsync(CancellationToken ct);
    Task<OriginTlsIssueResult> IssueOrRenewAsync(CancellationToken ct);
}

public class OriginTlsService : IOriginTlsService
{
    private readonly IConfiguration _config;
    private readonly AppDbContext _db;

    public OriginTlsService(IConfiguration config, AppDbContext db)
    {
        _config = config;
        _db = db;
    }

    public async Task<OriginTlsStatusResult> GetStatusAsync(CancellationToken ct)
    {
        var certPath = await GetValueAsync("platform.domains.origin_tls.cert_path", "ORIGIN_TLS_CERT_PATH", ct);
        var keyPath = await GetValueAsync("platform.domains.origin_tls.key_path", "ORIGIN_TLS_KEY_PATH", ct);
        if (string.IsNullOrWhiteSpace(certPath) || string.IsNullOrWhiteSpace(keyPath))
        {
            return new OriginTlsStatusResult(false, false, false, null, null, "ORIGIN_TLS_CERT_PATH / ORIGIN_TLS_KEY_PATH not configured.");
        }

        var certExists = File.Exists(certPath);
        var keyExists = File.Exists(keyPath);
        if (!certExists || !keyExists)
        {
            return new OriginTlsStatusResult(true, certExists, keyExists, null, null, "Origin TLS cert/key files not found.");
        }

        try
        {
            var cert = X509Certificate2.CreateFromPemFile(certPath, keyPath);
            var expiresAt = new DateTimeOffset(cert.NotAfter, TimeSpan.Zero);
            var daysRemaining = (int)Math.Floor((expiresAt - DateTimeOffset.UtcNow).TotalDays);
            return new OriginTlsStatusResult(true, true, true, expiresAt, daysRemaining, "Origin TLS files found.");
        }
        catch (Exception ex)
        {
            return new OriginTlsStatusResult(true, true, true, null, null, $"Failed to parse cert: {ex.Message}");
        }
    }

    public async Task<OriginTlsIssueResult> IssueOrRenewAsync(CancellationToken ct)
    {
        var command = await GetValueAsync("platform.domains.origin_tls.issuer_command", "ORIGIN_TLS_ISSUER_COMMAND", ct);
        if (string.IsNullOrWhiteSpace(command))
        {
            return new OriginTlsIssueResult(false, "ORIGIN_TLS_ISSUER_COMMAND is not configured.");
        }

        var ingressHost = await GetValueAsync("platform.domains.platform_ingress_host", "PLATFORM_INGRESS_HOST", ct) ?? string.Empty;
        var certPath = await GetValueAsync("platform.domains.origin_tls.cert_path", "ORIGIN_TLS_CERT_PATH", ct) ?? string.Empty;
        var keyPath = await GetValueAsync("platform.domains.origin_tls.key_path", "ORIGIN_TLS_KEY_PATH", ct) ?? string.Empty;
        var mode = await GetValueAsync("platform.domains.origin_tls.mode", "ORIGIN_TLS_MODE", ct) ?? "cloudflare_origin_ca";

        var rendered = command
            .Replace("{host}", ingressHost, StringComparison.OrdinalIgnoreCase)
            .Replace("{certPath}", certPath, StringComparison.OrdinalIgnoreCase)
            .Replace("{keyPath}", keyPath, StringComparison.OrdinalIgnoreCase)
            .Replace("{mode}", mode, StringComparison.OrdinalIgnoreCase);

        var psi = new ProcessStartInfo
        {
            FileName = "/bin/sh",
            Arguments = $"-c \"{rendered.Replace("\"", "\\\"")}\"",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        };

        try
        {
            using var proc = Process.Start(psi);
            if (proc == null) return new OriginTlsIssueResult(false, "Could not start origin TLS command.");
            await proc.WaitForExitAsync(ct);
            var stderr = await proc.StandardError.ReadToEndAsync(ct);
            if (proc.ExitCode != 0)
            {
                return new OriginTlsIssueResult(false, string.IsNullOrWhiteSpace(stderr) ? "Origin TLS command failed." : stderr);
            }
            return new OriginTlsIssueResult(true, "Origin TLS issue/renew command completed.");
        }
        catch (Exception ex)
        {
            return new OriginTlsIssueResult(false, ex.Message);
        }
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
}
