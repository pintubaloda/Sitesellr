using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend_dotnet.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(320)]
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    [JsonIgnore]
    public string PasswordHash { get; set; } = string.Empty;

    public bool IsLocked { get; set; } = false;
    public DateTimeOffset? LockoutEnd { get; set; }
    public bool MfaEnabled { get; set; } = false;
    [JsonIgnore]
    [MaxLength(64)]
    public string? MfaSecret { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    [JsonIgnore]
    public ICollection<AccessToken> AccessTokens { get; set; } = new List<AccessToken>();
    [JsonIgnore]
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    [JsonIgnore]
    public ICollection<WebAuthnCredential> WebAuthnCredentials { get; set; } = new List<WebAuthnCredential>();
}

public class RegisterRequest
{
    [Required, EmailAddress, MaxLength(320)]
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8), MaxLength(128)]
    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;

    [JsonPropertyName("turnstile_token")]
    public string? TurnstileToken { get; set; }
}

public class LoginRequest
{
    [Required, EmailAddress, MaxLength(320)]
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8), MaxLength(128)]
    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;

    [JsonPropertyName("turnstile_token")]
    public string? TurnstileToken { get; set; }

    [JsonPropertyName("mfa_code")]
    public string? MfaCode { get; set; }
}

public class TokenResponse
{
    [JsonPropertyName("access_token")]
    public string AccessToken { get; set; } = string.Empty;

    [JsonPropertyName("refresh_token")]
    public string RefreshToken { get; set; } = string.Empty;

    [JsonPropertyName("expires_in")]
    public int ExpiresInSeconds { get; set; }

    [JsonPropertyName("default_store_id")]
    public Guid? DefaultStoreId { get; set; }
}

public class RefreshRequest
{
    [Required]
    [JsonPropertyName("refresh_token")]
    public string RefreshToken { get; set; } = string.Empty;
}

public class LogoutRequest
{
    [Required]
    [JsonPropertyName("refresh_token")]
    public string RefreshToken { get; set; } = string.Empty;
}
