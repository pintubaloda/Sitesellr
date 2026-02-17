using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend_dotnet.Models;

public class AccessToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;

    [Required, MaxLength(128)]
    [JsonIgnore]
    public string TokenHash { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Scope { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? RevokedAt { get; set; }

    [MaxLength(64)]
    public string? ClientIp { get; set; }

    [MaxLength(256)]
    public string? UserAgent { get; set; }
}

public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;

    [Required, MaxLength(128)]
    [JsonIgnore]
    public string TokenHash { get; set; } = string.Empty;

    public Guid? ParentTokenId { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? RevokedAt { get; set; }

    [MaxLength(64)]
    public string? ClientIp { get; set; }

    [MaxLength(256)]
    public string? UserAgent { get; set; }
}

public class LoginAttempt
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(320)]
    public string Email { get; set; } = string.Empty;
    public bool Success { get; set; }

    [MaxLength(64)]
    public string? ClientIp { get; set; }

    [MaxLength(256)]
    public string? UserAgent { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
