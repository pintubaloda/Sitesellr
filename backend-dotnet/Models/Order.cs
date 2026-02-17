using System.ComponentModel.DataAnnotations;

namespace backend_dotnet.Models;

public enum OrderType
{
    Retail = 0,
    Wholesale = 1,
    Manual = 2,
    Social = 3
}

public enum OrderStatus
{
    Pending = 0,
    Paid = 1,
    Shipped = 2,
    Delivered = 3,
    Cancelled = 4,
    Refunded = 5
}

public enum PaymentStatus
{
    Pending = 0,
    Paid = 1,
    Partial = 2,
    Refunded = 3
}

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;

    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public OrderType Type { get; set; } = OrderType.Retail;
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;

    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Shipping { get; set; }
    public decimal Total { get; set; }
    public string Currency { get; set; } = "INR";

    [MaxLength(200)]
    public string? Notes { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}

public class OrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = default!;

    public Guid? ProductId { get; set; }
    public Guid? VariantId { get; set; }

    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    [MaxLength(64)]
    public string? SKU { get; set; }

    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal Total { get; set; }
}
