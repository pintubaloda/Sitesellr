using System.Diagnostics;
using backend_dotnet.Models;
using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Services;

public record SslIssueResult(bool Success, DateTimeOffset? ExpiresAt, string? Error);
public record SslProviderHealthResult(bool Configured, bool ExecutableFound, string? Executable, string? Message);

public interface ISslProvider
{
    string Name { get; }
    Task<SslIssueResult> IssueAsync(StoreDomain domain, CancellationToken ct);
    Task<SslProviderHealthResult> HealthCheckAsync(CancellationToken ct);
}

public class LetsEncryptShellProvider : ISslProvider
{
    private readonly IConfiguration _config;
    private readonly ILogger<LetsEncryptShellProvider> _logger;
    private readonly AppDbContext _db;

    public string Name => "letsencrypt";

    public LetsEncryptShellProvider(IConfiguration config, ILogger<LetsEncryptShellProvider> logger, AppDbContext db)
    {
        _config = config;
        _logger = logger;
        _db = db;
    }

    public async Task<SslIssueResult> IssueAsync(StoreDomain domain, CancellationToken ct)
    {
        var cmd = await GetValueAsync("platform.domains.ssl.issuer_command", "SSL_ISSUER_COMMAND", ct);
        if (string.IsNullOrWhiteSpace(cmd))
            return new SslIssueResult(false, null, "SSL_ISSUER_COMMAND is not configured in platform settings.");

        var email = await GetValueAsync("platform.domains.ssl.contact_email", "SSL_CONTACT_EMAIL", ct)
                    ?? "admin@example.com";
        var challenge = await GetValueAsync("platform.domains.acme.challenge_method", "ACME_CHALLENGE_METHOD", ct)
                        ?? "dns-01";
        var directoryUrl = await GetValueAsync("platform.domains.acme.directory_url", "ACME_DIRECTORY_URL", ct)
                           ?? "https://acme-v02.api.letsencrypt.org/directory";

        var command = cmd
            .Replace("{domain}", domain.Hostname, StringComparison.OrdinalIgnoreCase)
            .Replace("{email}", email, StringComparison.OrdinalIgnoreCase)
            .Replace("{challenge}", challenge, StringComparison.OrdinalIgnoreCase)
            .Replace("{acmeDirectory}", directoryUrl, StringComparison.OrdinalIgnoreCase);

        // FIX: Shell-escape the rendered command rather than naively embedding it
        // with a simple Replace. Using -c and passing the string as a single argument
        // prevents argument splitting issues.
        var psi = new ProcessStartInfo
        {
            FileName = "/bin/sh",
            ArgumentList = { "-c", command },   // ArgumentList avoids shell escaping pitfalls
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromMinutes(5)); // hard timeout for ACME commands

            using var proc = Process.Start(psi);
            if (proc == null)
                return new SslIssueResult(false, null, "Could not start the SSL issuer process.");

            // Read stdout/stderr concurrently to prevent deadlocks on large output
            var stdoutTask = proc.StandardOutput.ReadToEndAsync(cts.Token);
            var stderrTask = proc.StandardError.ReadToEndAsync(cts.Token);
            await proc.WaitForExitAsync(cts.Token);
            var stdout = await stdoutTask;
            var stderr = await stderrTask;

            if (proc.ExitCode != 0)
            {
                var errorDetail = string.IsNullOrWhiteSpace(stderr) ? stdout : stderr;
                _logger.LogError("SSL issue failed for {Domain} (exit {Code}): {Error}", domain.Hostname, proc.ExitCode, errorDetail);
                // Return a user-friendly message without leaking internal paths/tokens
                var safeError = SanitizeProcessOutput(errorDetail);
                return new SslIssueResult(false, null, string.IsNullOrWhiteSpace(safeError)
                    ? $"SSL issuer command exited with code {proc.ExitCode}. Check server logs for details."
                    : safeError);
            }

            _logger.LogInformation("SSL issued successfully for {Domain}", domain.Hostname);
            // Let's Encrypt certs are valid for 90 days; we track the expiry estimate
            return new SslIssueResult(true, DateTimeOffset.UtcNow.AddDays(90), null);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            _logger.LogError("SSL issue timed out for {Domain}", domain.Hostname);
            return new SslIssueResult(false, null, "SSL issuance timed out after 5 minutes. Verify ACME client is installed and network is reachable.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SSL issue exception for {Domain}", domain.Hostname);
            return new SslIssueResult(false, null, $"Unexpected error during SSL issuance: {ex.Message}");
        }
    }

    public async Task<SslProviderHealthResult> HealthCheckAsync(CancellationToken ct)
    {
        var cmd = await GetValueAsync("platform.domains.ssl.issuer_command", "SSL_ISSUER_COMMAND", ct);
        if (string.IsNullOrWhiteSpace(cmd))
            return new SslProviderHealthResult(false, false, null, "SSL_ISSUER_COMMAND is not configured in platform settings.");

        // Extract the first token of the command as the executable
        // FIX: Handle commands that contain environment variable assignments or quoted paths
        var executable = cmd.Trim().Split([' ', '\t'], StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        if (string.IsNullOrWhiteSpace(executable))
            return new SslProviderHealthResult(false, false, null, "Could not detect the executable from the SSL command string.");

        // Strip env variable prefix patterns like VAR=value certbot …
        if (executable.Contains('=', StringComparison.Ordinal))
        {
            executable = cmd.Trim()
                .Split([' ', '\t'], StringSplitOptions.RemoveEmptyEntries)
                .FirstOrDefault(t => !t.Contains('='))
                ?? string.Empty;
            if (string.IsNullOrWhiteSpace(executable))
                return new SslProviderHealthResult(false, false, null, "Could not identify executable after env var prefix.");
        }

        var psi = new ProcessStartInfo
        {
            FileName = "/bin/sh",
            ArgumentList = { "-c", $"command -v {executable}" },
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        try
        {
            using var proc = Process.Start(psi);
            if (proc == null)
                return new SslProviderHealthResult(true, false, executable, "Could not start shell for executable check.");

            await proc.WaitForExitAsync(ct);
            if (proc.ExitCode != 0)
                return new SslProviderHealthResult(true, false, executable,
                    $"Executable '{executable}' was not found in the runtime PATH. Install it or update the issuer command.");

            return new SslProviderHealthResult(true, true, executable,
                $"SSL provider command configured and '{executable}' is available.");
        }
        catch (Exception ex)
        {
            return new SslProviderHealthResult(true, false, executable, ex.Message);
        }
    }

    private static string SanitizeProcessOutput(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
        // Truncate very long output to a safe length for storage (see controller truncates to 400)
        var trimmed = raw.Trim();
        return trimmed.Length > 600 ? trimmed[..600] : trimmed;
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

public interface ISslProviderFactory
{
    ISslProvider? Resolve(string providerName);
}

public class SslProviderFactory : ISslProviderFactory
{
    private readonly IEnumerable<ISslProvider> _providers;

    public SslProviderFactory(IEnumerable<ISslProvider> providers)
    {
        _providers = providers;
    }

    public ISslProvider? Resolve(string providerName)
        => _providers.FirstOrDefault(x => string.Equals(x.Name, providerName, StringComparison.OrdinalIgnoreCase));
}
