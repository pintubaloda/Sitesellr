using AspNetCoreRateLimit;
using backend_dotnet.Data;
using backend_dotnet.Models;
using backend_dotnet.Security;
using backend_dotnet.Services;
using Fido2NetLib;
using Fido2NetLib.Objects;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Serilog;
using Serilog.Events;
using System.Security.Claims;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Antiforgery;
using OtpNet;

var builder = WebApplication.CreateBuilder(args);

// Serilog for structured logging
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

// Configuration
var connectionString =
    builder.Configuration.GetConnectionString("Postgres") ??
    builder.Configuration["POSTGRES_CONNECTION_STRING"] ??
    throw new InvalidOperationException("PostgreSQL connection string not configured. Set POSTGRES_CONNECTION_STRING or ConnectionStrings:Postgres.");

var corsOrigins = (builder.Configuration["CORS_ORIGINS"] ?? "*")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

// Services
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.Configure<IpRateLimitPolicies>(builder.Configuration.GetSection("IpRateLimitPolicies"));
builder.Services.AddInMemoryRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddHttpClient<ITurnstileService, TurnstileService>();
builder.Services.AddScoped<IWebAuthnService, WebAuthnService>();
builder.Services.AddScoped<ITenancyResolver, TenancyResolver>();
builder.Services.AddSingleton<IPaymentPlugin, DummyPaymentPlugin>();
builder.Services.AddSingleton<IPaymentPluginFactory, PaymentPluginFactory>();
builder.Services.AddSingleton<IFido2>(sp =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    var rpId = cfg["WebAuthn:RpId"] ?? "localhost";
    var origin = cfg["WebAuthn:Origin"] ?? "https://localhost:3000";
    var rpName = cfg["WebAuthn:RpName"] ?? "Sitesellr Dev";
    return new Fido2(new Fido2Configuration
    {
        ServerName = rpName,
        ServerDomain = rpId,
        Origins = new HashSet<string> { origin }
    });
});
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-Token";
    options.Cookie.Name = "XSRF-TOKEN";
    options.Cookie.HttpOnly = false;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Lax;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(Policies.StoreOwnerOrAdmin, policy =>
        policy.Requirements.Add(new TenancyRoleRequirement(requireOwnerOrAdmin: true)));
    options.AddPolicy(Policies.StoreStaff, policy =>
        policy.Requirements.Add(new TenancyRoleRequirement(requireOwnerOrAdmin: false)));
});
builder.Services.AddSingleton<IAuthorizationHandler, TenancyRoleHandler>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("ApiCorsPolicy", policy =>
    {
        if (corsOrigins.Length == 0 || corsOrigins.Contains("*"))
        {
            policy.AllowAnyOrigin();
        }
        else
        {
            policy.WithOrigins(corsOrigins);
        }

        policy.AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Optionally apply migrations on startup when configured (off by default to avoid blocking design-time tools)
if (builder.Configuration.GetValue("APPLY_MIGRATIONS_ON_STARTUP", false))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("ApiCorsPolicy");
app.UseIpRateLimiting();
app.UseTightSecurityHeaders();
app.UseCsrfProtection();
app.UseTenancy();

var api = app.MapGroup("/api");

api.MapGet("/", () => Results.Ok(new { message = "Hello World" }))
   .WithName("Root");

api.MapGet("/webauthn/rp", (IConfiguration cfg) =>
{
    var rpId = cfg["WebAuthn:RpId"] ?? "localhost";
    var origin = cfg["WebAuthn:Origin"] ?? "https://localhost:3000";
    return Results.Ok(new { rpId, origin });
});

api.MapPost("/status", async (StatusCheckCreate input, AppDbContext db) =>
{
    var status = new StatusCheck
    {
        ClientName = input.ClientName,
        Timestamp = DateTime.UtcNow
    };

    db.StatusChecks.Add(status);
    await db.SaveChangesAsync();

    return Results.Created($"/api/status/{status.Id}", status);
}).WithName("CreateStatus");

api.MapGet("/status", async (AppDbContext db) =>
{
    var items = await db.StatusChecks
        .AsNoTracking()
        .OrderByDescending(x => x.Timestamp)
        .ToListAsync();

    return Results.Ok(items);
}).WithName("GetStatuses");

api.MapPost("/auth/register", async (RegisterRequest req, AppDbContext db, ITokenService tokenService, ITurnstileService turnstile, HttpContext httpContext, IAntiforgery antiforgery, CancellationToken ct) =>
{
    var normalizedEmail = req.Email.Trim().ToLowerInvariant();
    var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, ct);
    if (existing != null)
    {
        return Results.Conflict(new { error = "email_exists" });
    }

    if (string.IsNullOrWhiteSpace(req.TurnstileToken) || !await turnstile.VerifyAsync(req.TurnstileToken, httpContext.Connection.RemoteIpAddress?.ToString(), ct))
    {
        return Results.BadRequest(new { error = "captcha_failed" });
    }

    var hash = BCrypt.Net.BCrypt.HashPassword(req.Password, workFactor: 12);
    var user = new User
    {
        Email = normalizedEmail,
        PasswordHash = hash,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    db.Users.Add(user);
    await db.SaveChangesAsync(ct);

    var (access, refresh, _, _) = await tokenService.IssueAsync(user, scope: null, clientIp: httpContext.Connection.RemoteIpAddress?.ToString(), userAgent: httpContext.Request.Headers.UserAgent.ToString(), ct);

    var tokens = antiforgery.GetAndStoreTokens(httpContext);
    httpContext.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, new CookieOptions
    {
        HttpOnly = false,
        Secure = true,
        SameSite = SameSiteMode.Lax
    });

    return Results.Ok(new TokenResponse
    {
        AccessToken = access,
        RefreshToken = refresh,
        ExpiresInSeconds = 15 * 60
    });
}).WithName("Register");

api.MapPost("/auth/login", async (LoginRequest req, AppDbContext db, ITokenService tokenService, ITurnstileService turnstile, HttpContext httpContext, IConfiguration config, IAntiforgery antiforgery, CancellationToken ct) =>
{
    var ip = httpContext.Connection.RemoteIpAddress?.ToString();
    var ua = httpContext.Request.Headers.UserAgent.ToString();
    var normalizedEmail = req.Email.Trim().ToLowerInvariant();

    var user = await db.Users.Include(u => u.RefreshTokens)
        .FirstOrDefaultAsync(u => u.Email == normalizedEmail, ct);

    var attempt = new LoginAttempt
    {
        Email = normalizedEmail,
        ClientIp = ip,
        UserAgent = ua
    };

    var lockoutMinutes = config.GetValue("Auth:LockoutMinutes", 15);
    var maxFailures = config.GetValue("Auth:MaxFailedAttempts", 5);

    if (string.IsNullOrWhiteSpace(req.TurnstileToken) || !await turnstile.VerifyAsync(req.TurnstileToken, ip, ct))
    {
        attempt.Success = false;
        db.LoginAttempts.Add(attempt);
        await db.SaveChangesAsync(ct);
        return Results.BadRequest(new { error = "captcha_failed" });
    }

    if (user != null && user.IsLocked && user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow)
    {
        return Results.StatusCode(StatusCodes.Status423Locked);
    }

    if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
    {
        attempt.Success = false;
        db.LoginAttempts.Add(attempt);
        await db.SaveChangesAsync(ct);

        if (user != null)
        {
            var recentFailures = await db.LoginAttempts
                .Where(a => a.Email == normalizedEmail && !a.Success && a.CreatedAt > DateTimeOffset.UtcNow.AddMinutes(-lockoutMinutes))
                .CountAsync(ct);
            if (recentFailures >= maxFailures)
            {
                user.IsLocked = true;
                user.LockoutEnd = DateTimeOffset.UtcNow.AddMinutes(lockoutMinutes);
                await db.SaveChangesAsync(ct);
            }
        }

        return Results.Unauthorized();
    }

    if (user.MfaEnabled)
    {
        if (string.IsNullOrWhiteSpace(user.MfaSecret) || string.IsNullOrWhiteSpace(req.MfaCode))
        {
            return Results.BadRequest(new { error = "mfa_required" });
        }
        var totp = new Totp(Base32Encoding.ToBytes(user.MfaSecret));
        if (!totp.VerifyTotp(req.MfaCode, out _, VerificationWindow.RfcSpecifiedNetworkDelay))
        {
            return Results.BadRequest(new { error = "mfa_invalid" });
        }
    }

    attempt.Success = true;
    db.LoginAttempts.Add(attempt);
    user.IsLocked = false;
    user.LockoutEnd = null;
    await db.SaveChangesAsync(ct);

    var (access, refresh, _, refreshRec) = await tokenService.IssueAsync(user, scope: null, clientIp: ip, userAgent: ua, ct);

    // Set HttpOnly secure cookie for session-style usage
    httpContext.Response.Cookies.Append("session", refresh, new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Lax,
        Expires = refreshRec.ExpiresAt.UtcDateTime
    });

    var tokens = antiforgery.GetAndStoreTokens(httpContext);
    httpContext.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, new CookieOptions
    {
        HttpOnly = false,
        Secure = true,
        SameSite = SameSiteMode.Lax
    });

    return Results.Ok(new TokenResponse
    {
        AccessToken = access,
        RefreshToken = refresh,
        ExpiresInSeconds = 15 * 60
    });
}).WithName("Login");

api.MapPost("/auth/refresh", async (RefreshRequest req, AppDbContext db, ITokenService tokenService, HttpContext httpContext, CancellationToken ct) =>
{
    var ip = httpContext.Connection.RemoteIpAddress?.ToString();
    var ua = httpContext.Request.Headers.UserAgent.ToString();
    var hashed = tokenService.HashToken(req.RefreshToken);

    var refresh = await db.RefreshTokens.Include(r => r.User)
        .FirstOrDefaultAsync(r => r.TokenHash == hashed && r.RevokedAt == null, ct);

    if (refresh == null || refresh.ExpiresAt < DateTimeOffset.UtcNow)
    {
        return Results.Unauthorized();
    }

    await tokenService.RevokeRefreshFamilyAsync(refresh.Id, ct);

    var (access, newRefresh, _, refreshRec) = await tokenService.IssueAsync(refresh.User, scope: null, clientIp: ip, userAgent: ua, ct);

    httpContext.Response.Cookies.Append("session", newRefresh, new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Lax,
        Expires = refreshRec.ExpiresAt.UtcDateTime
    });

    var tokens = httpContext.RequestServices.GetRequiredService<IAntiforgery>().GetAndStoreTokens(httpContext);
    httpContext.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, new CookieOptions
    {
        HttpOnly = false,
        Secure = true,
        SameSite = SameSiteMode.Lax
    });

    return Results.Ok(new TokenResponse
    {
        AccessToken = access,
        RefreshToken = newRefresh,
        ExpiresInSeconds = 15 * 60
    });
}).WithName("Refresh");

api.MapPost("/auth/webauthn/register/options", async (HttpContext ctx, AppDbContext db, ITokenService tokenService, IWebAuthnService webAuthn, CancellationToken ct) =>
{
    var bearer = ctx.Request.Headers.Authorization.FirstOrDefault();
    if (string.IsNullOrWhiteSpace(bearer) || !bearer.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
    {
        return Results.Unauthorized();
    }

    var token = bearer.Substring("Bearer ".Length).Trim();
    var hashed = tokenService.HashToken(token);
    var access = await db.AccessTokens.Include(a => a.User).FirstOrDefaultAsync(a => a.TokenHash == hashed && a.RevokedAt == null, ct);
    if (access == null || access.ExpiresAt < DateTimeOffset.UtcNow) return Results.Unauthorized();

    var options = await webAuthn.StartRegistrationAsync(access.User, access.User.Email, ct);
    return Results.Ok(options);
}).WithName("WebAuthnRegisterOptions");

api.MapPost("/auth/webauthn/register/verify", async (HttpContext ctx, AppDbContext db, ITokenService tokenService, IWebAuthnService webAuthn, CancellationToken ct) =>
{
    var bearer = ctx.Request.Headers.Authorization.FirstOrDefault();
    if (string.IsNullOrWhiteSpace(bearer) || !bearer.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
    {
        return Results.Unauthorized();
    }

    var token = bearer.Substring("Bearer ".Length).Trim();
    var hashed = tokenService.HashToken(token);
    var access = await db.AccessTokens.Include(a => a.User).FirstOrDefaultAsync(a => a.TokenHash == hashed && a.RevokedAt == null, ct);
    if (access == null || access.ExpiresAt < DateTimeOffset.UtcNow) return Results.Unauthorized();

    var attestation = await ctx.Request.ReadFromJsonAsync<AuthenticatorAttestationRawResponse>(cancellationToken: ct);
    if (attestation == null) return Results.BadRequest(new { error = "invalid_payload" });

    var ok = await webAuthn.FinishRegistrationAsync(access.User, attestation, ct);
    return ok ? Results.Ok() : Results.BadRequest(new { error = "webauthn_failed" });
}).WithName("WebAuthnRegisterVerify");

api.MapPost("/auth/webauthn/login/options", async (WebAuthnLoginOptionsRequest req, AppDbContext db, IWebAuthnService webAuthn, CancellationToken ct) =>
{
    var normalizedEmail = req.Email.Trim().ToLowerInvariant();
    var user = await db.Users.Include(u => u.WebAuthnCredentials).FirstOrDefaultAsync(u => u.Email == normalizedEmail, ct);
    if (user == null || !user.WebAuthnCredentials.Any())
    {
        return Results.NotFound(new { error = "no_webauthn" });
    }

    var options = await webAuthn.StartAssertionAsync(user, ct);
    return Results.Ok(options);
}).WithName("WebAuthnLoginOptions");

api.MapPost("/auth/webauthn/login/verify", async (HttpContext ctx, AppDbContext db, IWebAuthnService webAuthn, ITokenService tokenService, CancellationToken ct) =>
{
    var assertion = await ctx.Request.ReadFromJsonAsync<AuthenticatorAssertionRawResponse>(cancellationToken: ct);
    if (assertion == null) return Results.BadRequest(new { error = "invalid_payload" });

    var (ok, user) = await webAuthn.FinishAssertionAsync(assertion, ct);
    if (!ok || user == null) return Results.Unauthorized();

    var ip = ctx.Connection.RemoteIpAddress?.ToString();
    var ua = ctx.Request.Headers.UserAgent.ToString();
    var (access, refresh, _, refreshRec) = await tokenService.IssueAsync(user, scope: null, clientIp: ip, userAgent: ua, ct);

    ctx.Response.Cookies.Append("session", refresh, new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Lax,
        Expires = refreshRec.ExpiresAt.UtcDateTime
    });

    var tokens = ctx.RequestServices.GetRequiredService<IAntiforgery>().GetAndStoreTokens(ctx);
    ctx.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, new CookieOptions
    {
        HttpOnly = false,
        Secure = true,
        SameSite = SameSiteMode.Lax
    });

    return Results.Ok(new TokenResponse
    {
        AccessToken = access,
        RefreshToken = refresh,
        ExpiresInSeconds = 15 * 60
    });
}).WithName("WebAuthnLoginVerify");

api.MapPost("/auth/mfa/enroll", async (HttpContext ctx, AppDbContext db, ITokenService tokenService, CancellationToken ct) =>
{
    var bearer = ctx.Request.Headers.Authorization.FirstOrDefault();
    if (string.IsNullOrWhiteSpace(bearer) || !bearer.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
    {
        return Results.Unauthorized();
    }

    var token = bearer.Substring("Bearer ".Length).Trim();
    var hashed = tokenService.HashToken(token);
    var access = await db.AccessTokens.Include(a => a.User).FirstOrDefaultAsync(a => a.TokenHash == hashed && a.RevokedAt == null, ct);
    if (access == null || access.ExpiresAt < DateTimeOffset.UtcNow) return Results.Unauthorized();

    var secret = Base32Encoding.ToString(KeyGeneration.GenerateRandomKey(20));
    access.User.MfaSecret = secret;
    await db.SaveChangesAsync(ct);

    var otpauth = $"otpauth://totp/Sitesellr:{Uri.EscapeDataString(access.User.Email)}?secret={secret}&issuer=Sitesellr&digits=6&period=30";
    return Results.Ok(new { secret, otpauth });
}).WithName("MfaEnroll");

api.MapPost("/auth/mfa/verify", async (HttpContext ctx, AppDbContext db, ITokenService tokenService, CancellationToken ct) =>
{
    var bearer = ctx.Request.Headers.Authorization.FirstOrDefault();
    if (string.IsNullOrWhiteSpace(bearer) || !bearer.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
    {
        return Results.Unauthorized();
    }

    var token = bearer.Substring("Bearer ".Length).Trim();
    var hashed = tokenService.HashToken(token);
    var access = await db.AccessTokens.Include(a => a.User).FirstOrDefaultAsync(a => a.TokenHash == hashed && a.RevokedAt == null, ct);
    if (access == null || access.ExpiresAt < DateTimeOffset.UtcNow) return Results.Unauthorized();

    var body = await ctx.Request.ReadFromJsonAsync<Dictionary<string, string>>(cancellationToken: ct);
    if (body == null || !body.TryGetValue("mfa_code", out var code))
    {
        return Results.BadRequest(new { error = "mfa_required" });
    }

    if (string.IsNullOrWhiteSpace(access.User.MfaSecret))
    {
        return Results.BadRequest(new { error = "mfa_not_enrolled" });
    }

    var totp = new Totp(Base32Encoding.ToBytes(access.User.MfaSecret));
    if (!totp.VerifyTotp(code, out _, VerificationWindow.RfcSpecifiedNetworkDelay))
    {
        return Results.BadRequest(new { error = "mfa_invalid" });
    }

    access.User.MfaEnabled = true;
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { enabled = true });
}).WithName("MfaVerify");

api.MapPost("/auth/logout", async (LogoutRequest req, AppDbContext db, ITokenService tokenService, CancellationToken ct) =>
{
    var hashed = tokenService.HashToken(req.RefreshToken);
    var refresh = await db.RefreshTokens.FirstOrDefaultAsync(r => r.TokenHash == hashed && r.RevokedAt == null, ct);
    if (refresh != null)
    {
        refresh.RevokedAt = DateTimeOffset.UtcNow;
        await tokenService.RevokeRefreshFamilyAsync(refresh.Id, ct);
        await db.SaveChangesAsync(ct);
    }
    return Results.Ok();
}).WithName("Logout");

api.MapGet("/auth/me", async (HttpContext context, AppDbContext db, ITokenService tokenService, CancellationToken ct) =>
{
    var bearer = context.Request.Headers.Authorization.FirstOrDefault();
    if (string.IsNullOrWhiteSpace(bearer) || !bearer.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
    {
        return Results.Unauthorized();
    }

    var token = bearer.Substring("Bearer ".Length).Trim();
    var hashed = tokenService.HashToken(token);
    var access = await db.AccessTokens.Include(a => a.User)
        .FirstOrDefaultAsync(a => a.TokenHash == hashed && a.RevokedAt == null, ct);

    if (access == null || access.ExpiresAt < DateTimeOffset.UtcNow)
    {
        return Results.Unauthorized();
    }

    var user = access.User;
    return Results.Ok(new
    {
        user.Id,
        user.Email,
        user.MfaEnabled,
        user.CreatedAt
    });
}).WithName("Me");

app.Run();
