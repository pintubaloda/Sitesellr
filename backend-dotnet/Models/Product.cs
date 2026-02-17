using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace backend_dotnet.Models;

public enum ProductStatus
{
    Draft = 0,
    Active = 1,
    Archived = 2
}

public class Category
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;

    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;
    [MaxLength(160)]
    public string Slug { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;

    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(64)]
    public string? SKU { get; set; }

    public decimal Price { get; set; }
    public decimal? CompareAtPrice { get; set; }
    public string Currency { get; set; } = "INR";

    public ProductStatus Status { get; set; } = ProductStatus.Draft;
    public bool IsPublished { get; set; } = false;

    public Guid? CategoryId { get; set; }
    public Category? Category { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
    public ICollection<ProductMedia> Media { get; set; } = new List<ProductMedia>();
}

public class ProductVariant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = default!;

    [MaxLength(64)]
    public string? SKU { get; set; }

    public decimal Price { get; set; }
    public int Quantity { get; set; }

    [MaxLength(200)]
    public string? AttributesJson { get; set; } // simple key/value pairs JSON

    public bool IsDefault { get; set; } = false;
}

public class ProductMedia
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = default!;

    [MaxLength(500)]
    public string Url { get; set; } = string.Empty;
    public int SortOrder { get; set; } = 0;
}
