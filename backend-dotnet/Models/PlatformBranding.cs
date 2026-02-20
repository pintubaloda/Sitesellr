using System.ComponentModel.DataAnnotations;

namespace backend_dotnet.Models;

public class PlatformBrandingSetting
{
    public Guid Id { get; set; } = Guid.NewGuid();
    [MaxLength(120)]
    public string Key { get; set; } = string.Empty;
    [MaxLength(4000)]
    public string Value { get; set; } = string.Empty;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
