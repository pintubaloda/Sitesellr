using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend_dotnet.Models;

public enum CustomerType
{
    Retail = 0,
    Business = 1
}

public class Customer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [EmailAddress, MaxLength(320)]
    public string? Email { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }

    public CustomerType Type { get; set; } = CustomerType.Retail;

    [MaxLength(15)]
    public string? GSTIN { get; set; }

    [MaxLength(200)]
    public string? CompanyName { get; set; }

    public decimal? CreditLimit { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<CustomerAddress> Addresses { get; set; } = new List<CustomerAddress>();
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}

public class CustomerAddress
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = default!;

    [MaxLength(100)]
    public string Label { get; set; } = "Default";

    [MaxLength(200)]
    public string Line1 { get; set; } = string.Empty;
    [MaxLength(200)]
    public string? Line2 { get; set; }
    [MaxLength(100)]
    public string City { get; set; } = string.Empty;
    [MaxLength(100)]
    public string State { get; set; } = string.Empty;
    [MaxLength(20)]
    public string PostalCode { get; set; } = string.Empty;
    [MaxLength(100)]
    public string Country { get; set; } = "India";
    public bool IsDefault { get; set; } = false;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
