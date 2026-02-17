using backend_dotnet.Data;
using backend_dotnet.Models;
using Fido2NetLib;
using Fido2NetLib.Objects;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Linq;

namespace backend_dotnet.Services;

public interface IWebAuthnService
{
    Task<CredentialCreateOptions> StartRegistrationAsync(User user, string displayName, CancellationToken ct = default);
    Task<bool> FinishRegistrationAsync(User user, AuthenticatorAttestationRawResponse attestation, CancellationToken ct = default);
    Task<AssertionOptions> StartAssertionAsync(User user, CancellationToken ct = default);
    Task<(bool ok, User? user)> FinishAssertionAsync(AuthenticatorAssertionRawResponse assertion, CancellationToken ct = default);
}

public class WebAuthnService : IWebAuthnService
{
    private readonly IFido2 _fido2;
    private readonly IMemoryCache _cache;
    private readonly AppDbContext _db;
    private readonly ILogger<WebAuthnService> _logger;

    public WebAuthnService(IFido2 fido2, IMemoryCache cache, AppDbContext db, ILogger<WebAuthnService> logger)
    {
        _fido2 = fido2;
        _cache = cache;
        _db = db;
        _logger = logger;
    }

    public async Task<CredentialCreateOptions> StartRegistrationAsync(User user, string displayName, CancellationToken ct = default)
    {
        var existingCreds = await _db.WebAuthnCredentials
            .Where(c => c.UserId == user.Id)
            .Select(c => new PublicKeyCredentialDescriptor(c.CredentialId.Base64UrlToBytes()))
            .ToListAsync(ct);

        var userIdentity = new Fido2User
        {
            DisplayName = displayName,
            Name = user.Email,
            Id = user.Id.ToByteArray()
        };

        var options = _fido2.RequestNewCredential(userIdentity, existingCreds,
            authenticatorSelection: new AuthenticatorSelection
            {
                UserVerification = UserVerificationRequirement.Required
            },
            attestationPreference: AttestationConveyancePreference.None);

        _cache.Set($"fido2.attestation.{user.Id}", options, TimeSpan.FromMinutes(10));
        return options;
    }

    public async Task<bool> FinishRegistrationAsync(User user, AuthenticatorAttestationRawResponse attestation, CancellationToken ct = default)
    {
        if (!_cache.TryGetValue<CredentialCreateOptions>($"fido2.attestation.{user.Id}", out var origOptions))
        {
            return false;
        }

        var success = await _fido2.MakeNewCredentialAsync(attestation, origOptions!,
            async (args, cancellationToken) =>
            {
                var credId = args.CredentialId.ToBase64Url();
                var exists = await _db.WebAuthnCredentials.AnyAsync(c => c.CredentialId == credId, cancellationToken);
                return !exists;
            });

        if (success.Result is null)
        {
            return false;
        }

        var cred = new WebAuthnCredential
        {
            UserId = user.Id,
            CredentialId = success.Result.CredentialId.ToBase64Url(),
            PublicKey = success.Result.PublicKey,
            SignCount = success.Result.Counter,
            AaGuid = success.Result.Aaguid,
            CredType = success.Result.CredType
        };

        _db.WebAuthnCredentials.Add(cred);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<AssertionOptions> StartAssertionAsync(User user, CancellationToken ct = default)
    {
        var creds = await _db.WebAuthnCredentials
            .Where(c => c.UserId == user.Id)
            .Select(c => new PublicKeyCredentialDescriptor(c.CredentialId.Base64UrlToBytes()))
            .ToListAsync(ct);

        var options = _fido2.GetAssertionOptions(creds, UserVerificationRequirement.Required);
        _cache.Set($"fido2.assertion.{user.Id}", options, TimeSpan.FromMinutes(10));
        return options;
    }

    public async Task<(bool ok, User? user)> FinishAssertionAsync(AuthenticatorAssertionRawResponse assertion, CancellationToken ct = default)
    {
        var credId = assertion.Id.ToBase64Url();
        var cred = await _db.WebAuthnCredentials.Include(c => c.User)
            .FirstOrDefaultAsync(c => c.CredentialId == credId, ct);
        if (cred == null) return (false, null);

        if (!_cache.TryGetValue<AssertionOptions>($"fido2.assertion.{cred.UserId}", out var origOptions) || origOptions is null)
        {
            return (false, null);
        }

        var options = origOptions;

        var userHandle = cred.UserId.ToByteArray();
        var result = await _fido2.MakeAssertionAsync(
            assertion,
            options,
            cred.PublicKey,
            cred.SignCount,
            (args, cancellationToken) =>
            {
                var handle = args.UserHandle ?? Array.Empty<byte>();
                return Task.FromResult(handle.SequenceEqual(userHandle));
            },
            userHandle,
            ct);

        cred.SignCount = result.Counter;
        await _db.SaveChangesAsync(ct);

        return (result.Status == "ok", cred.User);
    }
}

internal static class Base64UrlExtensions
{
    public static byte[] Base64UrlToBytes(this string input)
    {
        var padded = input.Replace('-', '+').Replace('_', '/');
        switch (padded.Length % 4)
        {
            case 2: padded += "=="; break;
            case 3: padded += "="; break;
        }
        return Convert.FromBase64String(padded);
    }

    public static string ToBase64Url(this byte[] input)
    {
        return Convert.ToBase64String(input)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}
