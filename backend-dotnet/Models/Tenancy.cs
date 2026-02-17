namespace backend_dotnet.Models;

public enum MerchantStatus
{
    Trial = 0,
    Active = 1,
    Suspended = 2,
    Expired = 3
}

public class Merchant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? PrimaryDomain { get; set; }
    public MerchantStatus Status { get; set; } = MerchantStatus.Trial;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Store> Stores { get; set; } = new List<Store>();
}

public enum StoreStatus
{
    Draft = 0,
    Active = 1,
    Suspended = 2,
    Closed = 3
}

public class Store
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MerchantId { get; set; }
    public Merchant Merchant { get; set; } = default!;

    public string Name { get; set; } = string.Empty;
    public string? Subdomain { get; set; }
    public string Currency { get; set; } = "INR";
    public string Timezone { get; set; } = "Asia/Kolkata";
    public StoreStatus Status { get; set; } = StoreStatus.Active;
    public bool IsWholesaleEnabled { get; set; } = false;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<StoreUserRole> StoreUsers { get; set; } = new List<StoreUserRole>();
    public ICollection<Product> Products { get; set; } = new List<Product>();
    public ICollection<Customer> Customers { get; set; } = new List<Customer>();
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}

public enum StoreRole
{
    Owner = 0,
    Admin = 1,
    Staff = 2,
    Custom = 3
}

public class StoreUserRole
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = default!;

    public Guid UserId { get; set; }
    public User User { get; set; } = default!;

    public StoreRole Role { get; set; } = StoreRole.Staff;
    public string? CustomRoleName { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
