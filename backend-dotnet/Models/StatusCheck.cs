using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend_dotnet.Models;

public class StatusCheck
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(200)]
    [JsonPropertyName("client_name")]
    public string ClientName { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class StatusCheckCreate
{
    [Required, MaxLength(200)]
    [JsonPropertyName("client_name")]
    public string ClientName { get; set; } = string.Empty;
}
