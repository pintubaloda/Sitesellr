using System.Security.Cryptography;
using System.Text;
using backend_dotnet.Data;
using backend_dotnet.Models;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Services;

public interface ITokenService
{
    Task<(string accessToken, string refreshToken, AccessToken accessRecord, RefreshToken refreshRecord)> IssueAsync(User user, string? scope, string? clientIp, string? userAgent, CancellationToken ct = default);
    Task RevokeRefreshFamilyAsync(Guid refreshId, CancellationToken ct = default);
    string HashToken(string token);
}

public class TokenService : ITokenService
{
    private readonly AppDbContext _db;
    private readonly ILogger<TokenService> _logger;
    private static readonly TimeSpan AccessLifetime = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan RefreshLifetime = TimeSpan.FromDays(14);

    public TokenService(AppDbContext db, ILogger<TokenService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<(string accessToken, string refreshToken, AccessToken accessRecord, RefreshToken refreshRecord)> IssueAsync(
        User user,
        string? scope,
        string? clientIp,
        string? userAgent,
        CancellationToken ct = default)
    {
        var accessToken = GenerateOpaqueToken();
        var refreshToken = GenerateOpaqueToken();

        var accessRecord = new AccessToken
        {
            UserId = user.Id,
            TokenHash = HashToken(accessToken),
            Scope = scope,
            ExpiresAt = DateTimeOffset.UtcNow.Add(AccessLifetime),
            ClientIp = clientIp,
            UserAgent = userAgent
        };

        var refreshRecord = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = HashToken(refreshToken),
            ExpiresAt = DateTimeOffset.UtcNow.Add(RefreshLifetime),
            ClientIp = clientIp,
            UserAgent = userAgent
        };

        _db.AccessTokens.Add(accessRecord);
        _db.RefreshTokens.Add(refreshRecord);
        await _db.SaveChangesAsync(ct);

        return (accessToken, refreshToken, accessRecord, refreshRecord);
    }

    public async Task RevokeRefreshFamilyAsync(Guid refreshId, CancellationToken ct = default)
    {
        var refresh = await _db.RefreshTokens.FirstOrDefaultAsync(r => r.Id == refreshId, ct);
        if (refresh == null) return;

        // revoke the chain
        var tokens = await _db.RefreshTokens
            .Where(r => r.UserId == refresh.UserId && (r.Id == refreshId || r.ParentTokenId == refreshId))
            .ToListAsync(ct);

        foreach (var t in tokens)
        {
            t.RevokedAt = DateTimeOffset.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
    }

    public string HashToken(string token)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }

    private static string GenerateOpaqueToken()
    {
        var bytes = new byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToHexString(bytes);
    }
}
