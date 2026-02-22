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
    private readonly ILogger<OriginTlsService> _logger;

    public OriginTlsService(IConfiguration config, AppDbContext db, ILogger<OriginTlsService> logger)
    {
        _config = config;
        _db = db;
        _logger = logger;
    }

    public async Task<OriginTlsStatusResult> GetStatusAsync(CancellationToken ct)
    {
        var certPath = await GetValueAsync("platform.domains.origin_tls.cert_path", "ORIGIN_TLS_CERT_PATH", ct);
        var keyPath = await GetValueAsync("platform.domains.origin_tls.key_path", "ORIGIN_TLS_KEY_PATH", ct);

        if (string.IsNullOrWhiteSpace(certPath) || string.IsNullOrWhiteSpace(keyPath))
            return new OriginTlsStatusResult(false, false, false, null, null,
                "ORIGIN_TLS_CERT_PATH and ORIGIN_TLS_KEY_PATH are not configured.");

        var certExists = File.Exists(certPath);
        var keyExists = File.Exists(keyPath);

        if (!certExists || !keyExists)
            return new OriginTlsStatusResult(true, certExists, keyExists, null, null,
                $"Origin TLS files missing: cert={certExists}, key={keyExists}. Run 'Issue / Renew Origin TLS'.");

        try
        {
            // FIX: CreateFromPemFile requires the key file to be separate; if the PEM
            // is a combined file (cert+key in one), we load it differently.
            X509Certificate2 cert;
            var certPem = await File.ReadAllTextAsync(certPath, ct);
            if (certPem.Contains("-----BEGIN RSA PRIVATE KEY-----", StringComparison.Ordinal)
                || certPem.Contains("-----BEGIN PRIVATE KEY-----", StringComparison.Ordinal))
            {
                // Combined PEM — load without separate key file
                cert = X509Certificate2.CreateFromPem(certPem);
            }
            else
            {
                cert = X509Certificate2.CreateFromPemFile(certPath, keyPath);
            }

            // NotAfter is in local time — convert to UTC for consistent comparison
            var expiresAt = new DateTimeOffset(cert.NotAfter.ToUniversalTime(), TimeSpan.Zero);
            var daysRemaining = (int)Math.Floor((expiresAt - DateTimeOffset.UtcNow).TotalDays);
            var status = daysRemaining < 0
                ? "Certificate has EXPIRED."
                : daysRemaining <= 14
                    ? $"Certificate expires in {daysRemaining} day(s) — renewal recommended."
                    : $"Certificate valid for {daysRemaining} more day(s).";

            return new OriginTlsStatusResult(true, true, true, expiresAt, daysRemaining, status);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse origin TLS certificate at {CertPath}", certPath);
            return new OriginTlsStatusResult(true, true, true, null, null,
                $"Certificate files exist but could not be parsed: {ex.Message}");
        }
    }

    public async Task<OriginTlsIssueResult> IssueOrRenewAsync(CancellationToken ct)
    {
        var command = await GetValueAsync("platform.domains.origin_tls.issuer_command", "ORIGIN_TLS_ISSUER_COMMAND", ct);
        if (string.IsNullOrWhiteSpace(command))
            return new OriginTlsIssueResult(false, "ORIGIN_TLS_ISSUER_COMMAND is not configured in platform settings.");

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
            ArgumentList = { "-c", rendered },
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromMinutes(5));

            using var proc = Process.Start(psi);
            if (proc == null) return new OriginTlsIssueResult(false, "Could not start origin TLS issuer process.");

            var stdoutTask = proc.StandardOutput.ReadToEndAsync(cts.Token);
            var stderrTask = proc.StandardError.ReadToEndAsync(cts.Token);
            await proc.WaitForExitAsync(cts.Token);
            var stdout = await stdoutTask;
            var stderr = await stderrTask;

            if (proc.ExitCode != 0)
            {
                var detail = string.IsNullOrWhiteSpace(stderr) ? stdout : stderr;
                _logger.LogError("Origin TLS issue failed (exit {Code}): {Error}", proc.ExitCode, detail);
                return new OriginTlsIssueResult(false,
                    string.IsNullOrWhiteSpace(detail)
                        ? $"Origin TLS command exited with code {proc.ExitCode}."
                        : detail.Length > 400 ? detail[..400] + "…" : detail);
            }

            return new OriginTlsIssueResult(true, "Origin TLS certificate issued/renewed successfully.");
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            return new OriginTlsIssueResult(false, "Origin TLS issuance timed out after 5 minutes.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Origin TLS issue threw an exception");
            return new OriginTlsIssueResult(false, ex.Message);
        }
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
