using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend_dotnet.Models;

public class WebAuthnCredential
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;

    [Required, MaxLength(512)]
    public string CredentialId { get; set; } = string.Empty; // base64url

    [Required]
    public byte[] PublicKey { get; set; } = Array.Empty<byte>();

    public uint SignCount { get; set; }
    public Guid AaGuid { get; set; }
    [MaxLength(32)]
    public string CredType { get; set; } = "public-key";

    [MaxLength(64)]
    public string? Transports { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class WebAuthnRegisterOptionsRequest
{
    [Required, JsonPropertyName("display_name")]
    public string DisplayName { get; set; } = string.Empty;
}

public class WebAuthnLoginOptionsRequest
{
    [Required, EmailAddress, JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
}
