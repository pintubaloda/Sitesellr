using System.Text.RegularExpressions;

namespace backend_dotnet.Services;

public static class SubdomainPolicy
{
    private static readonly Regex SubdomainRegex = new("^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$", RegexOptions.Compiled);
    private static readonly HashSet<string> Reserved = new(StringComparer.OrdinalIgnoreCase)
    {
        "www", "api", "admin", "app", "mail", "smtp", "imap", "ftp", "localhost", "root"
    };

    public static bool TryNormalizeRequested(string? requested, out string normalized, out string? error)
    {
        normalized = Normalize(requested);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            error = "subdomain_required";
            return false;
        }
        if (!SubdomainRegex.IsMatch(normalized))
        {
            error = "subdomain_invalid";
            return false;
        }
        if (Reserved.Contains(normalized))
        {
            error = "subdomain_reserved";
            return false;
        }

        error = null;
        return true;
    }

    public static string BuildSeedFromFallback(string? fallback)
    {
        var seed = Normalize(fallback);
        if (string.IsNullOrWhiteSpace(seed))
        {
            seed = "store";
        }
        if (Reserved.Contains(seed))
        {
            seed = $"{seed}-store";
        }
        if (!SubdomainRegex.IsMatch(seed))
        {
            seed = "store";
        }
        return seed.Length > 50 ? seed[..50].Trim('-') : seed;
    }

    private static string Normalize(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        var chars = input.Trim().ToLowerInvariant()
            .Select(ch => char.IsLetterOrDigit(ch) ? ch : '-')
            .ToArray();
        var normalized = new string(chars);
        while (normalized.Contains("--", StringComparison.Ordinal))
        {
            normalized = normalized.Replace("--", "-", StringComparison.Ordinal);
        }
        return normalized.Trim('-');
    }
}
