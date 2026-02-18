using System.ComponentModel.DataAnnotations;

namespace backend_dotnet.Models;

public class CustomerGroup
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;
    [MaxLength(400)]
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class CustomerGroupMember
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    public Guid CustomerGroupId { get; set; }
    public CustomerGroup CustomerGroup { get; set; } = default!;
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class VisibilityRule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;
    public Guid? CustomerGroupId { get; set; }
    public CustomerGroup? CustomerGroup { get; set; }
    [Required, MaxLength(30)]
    public string TargetType { get; set; } = "product"; // product|category|page|theme_block
    [Required, MaxLength(120)]
    public string TargetKey { get; set; } = string.Empty; // id, slug, or block id
    [Required, MaxLength(10)]
    public string Effect { get; set; } = "deny"; // allow|deny
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
