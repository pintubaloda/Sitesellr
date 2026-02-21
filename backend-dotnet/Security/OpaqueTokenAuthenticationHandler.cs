using System.Security.Claims;
using System.Text.Encodings.Web;
using backend_dotnet.Data;
using backend_dotnet.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend_dotnet.Security;

public class OpaqueTokenAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokenService;

    public OpaqueTokenAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        AppDbContext db,
        ITokenService tokenService) : base(options, logger, encoder)
    {
        _db = db;
        _tokenService = tokenService;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var header = Request.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(header) || !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return AuthenticateResult.NoResult();
        }

        var token = header["Bearer ".Length..].Trim();
        if (string.IsNullOrWhiteSpace(token))
        {
            return AuthenticateResult.Fail("missing_token");
        }

        var hash = _tokenService.HashToken(token);
        var access = await _db.AccessTokens.AsNoTracking()
            .FirstOrDefaultAsync(a => a.TokenHash == hash && a.RevokedAt == null);
        if (access == null || access.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            return AuthenticateResult.Fail("invalid_or_expired_token");
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, access.UserId.ToString()),
            new("user_id", access.UserId.ToString())
        };
        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);
        return AuthenticateResult.Success(ticket);
    }
}
