using System.Diagnostics;
using backend_dotnet.Models;
using backend_dotnet.Data;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Services;

public record SslIssueResult(bool Success, DateTimeOffset? ExpiresAt, string? Error);

public interface ISslProvider
{
    string Name { get; }
    Task<SslIssueResult> IssueAsync(StoreDomain domain, CancellationToken ct);
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
        {
            return new SslIssueResult(false, null, "SSL_ISSUER_COMMAND is not configured.");
        }

        var email = await GetValueAsync("platform.domains.ssl.contact_email", "SSL_CONTACT_EMAIL", ct) ?? "admin@example.com";
        var command = cmd
            .Replace("{domain}", domain.Hostname, StringComparison.OrdinalIgnoreCase)
            .Replace("{email}", email, StringComparison.OrdinalIgnoreCase);

        var psi = new ProcessStartInfo
        {
            FileName = "/bin/sh",
            Arguments = $"-c \"{command.Replace("\"", "\\\"")}\"",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        };

        try
        {
            using var proc = Process.Start(psi);
            if (proc == null) return new SslIssueResult(false, null, "Could not start SSL issue process.");
            await proc.WaitForExitAsync(ct);
            var stderr = await proc.StandardError.ReadToEndAsync(ct);
            if (proc.ExitCode != 0)
            {
                _logger.LogError("SSL issue failed for {Domain}: {Err}", domain.Hostname, stderr);
                return new SslIssueResult(false, null, string.IsNullOrWhiteSpace(stderr) ? "SSL issue command failed." : stderr);
            }
            var expiresAt = DateTimeOffset.UtcNow.AddDays(90);
            return new SslIssueResult(true, expiresAt, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SSL issue exception for {Domain}", domain.Hostname);
            return new SslIssueResult(false, null, ex.Message);
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
    {
        return _providers.FirstOrDefault(x => string.Equals(x.Name, providerName, StringComparison.OrdinalIgnoreCase));
    }
}
