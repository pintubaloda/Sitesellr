using backend_dotnet.Models;
using Microsoft.EntityFrameworkCore;

namespace backend_dotnet.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<StatusCheck> StatusChecks => Set<StatusCheck>();
    public DbSet<User> Users => Set<User>();
    public DbSet<AccessToken> AccessTokens => Set<AccessToken>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<LoginAttempt> LoginAttempts => Set<LoginAttempt>();
    public DbSet<WebAuthnCredential> WebAuthnCredentials => Set<WebAuthnCredential>();
    public DbSet<Merchant> Merchants => Set<Merchant>();
    public DbSet<Store> Stores => Set<Store>();
    public DbSet<StoreUserRole> StoreUserRoles => Set<StoreUserRole>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<CustomerAddress> CustomerAddresses => Set<CustomerAddress>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<ProductMedia> ProductMedia => Set<ProductMedia>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<StatusCheck>();

        entity.ToTable("status_checks");
        entity.HasKey(x => x.Id);

        entity.Property(x => x.ClientName)
              .IsRequired()
              .HasMaxLength(200);

        entity.Property(x => x.Timestamp)
              .HasColumnType("timestamp with time zone")
              .IsRequired();

        modelBuilder.Entity<User>(b =>
        {
            b.ToTable("users");
            b.HasKey(u => u.Id);
            b.Property(u => u.Email).IsRequired().HasMaxLength(320);
            b.HasIndex(u => u.Email).IsUnique();
            b.Property(u => u.PasswordHash).IsRequired().HasMaxLength(200);
            b.Property(u => u.IsLocked).HasDefaultValue(false);
            b.Property(u => u.LockoutEnd).HasColumnType("timestamp with time zone");
            b.Property(u => u.MfaEnabled).HasDefaultValue(false);
            b.Property(u => u.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(u => u.UpdatedAt).HasColumnType("timestamp with time zone");
        });

        modelBuilder.Entity<Merchant>(b =>
        {
            b.ToTable("merchants");
            b.HasKey(m => m.Id);
            b.Property(m => m.Name).IsRequired().HasMaxLength(200);
            b.Property(m => m.PrimaryDomain).HasMaxLength(200);
            b.Property(m => m.Status).HasConversion<int>();
            b.Property(m => m.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(m => m.UpdatedAt).HasColumnType("timestamp with time zone");
        });

        modelBuilder.Entity<Store>(b =>
        {
            b.ToTable("stores");
            b.HasKey(s => s.Id);
            b.Property(s => s.Name).IsRequired().HasMaxLength(200);
            b.Property(s => s.Subdomain).HasMaxLength(120);
            b.Property(s => s.Currency).HasMaxLength(10);
            b.Property(s => s.Timezone).HasMaxLength(100);
            b.Property(s => s.Status).HasConversion<int>();
            b.Property(s => s.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(s => s.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasOne(s => s.Merchant)
                .WithMany(m => m.Stores)
                .HasForeignKey(s => s.MerchantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StoreUserRole>(b =>
        {
            b.ToTable("store_user_roles");
            b.HasKey(su => su.Id);
            b.Property(su => su.Role).HasConversion<int>();
            b.Property(su => su.CustomRoleName).HasMaxLength(120);
            b.Property(su => su.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(su => new { su.StoreId, su.UserId }).IsUnique();
            b.HasOne(su => su.Store).WithMany(s => s.StoreUsers).HasForeignKey(su => su.StoreId);
            b.HasOne(su => su.User).WithMany().HasForeignKey(su => su.UserId);
        });

        modelBuilder.Entity<Category>(b =>
        {
            b.ToTable("categories");
            b.HasKey(c => c.Id);
            b.Property(c => c.Name).IsRequired().HasMaxLength(120);
            b.Property(c => c.Slug).IsRequired().HasMaxLength(160);
            b.Property(c => c.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasIndex(c => new { c.StoreId, c.Slug }).IsUnique();
        });

        modelBuilder.Entity<Product>(b =>
        {
            b.ToTable("products");
            b.HasKey(p => p.Id);
            b.Property(p => p.Title).IsRequired().HasMaxLength(200);
            b.Property(p => p.Description).HasMaxLength(500);
            b.Property(p => p.SKU).HasMaxLength(64);
            b.Property(p => p.Price).HasColumnType("numeric(18,2)");
            b.Property(p => p.CompareAtPrice).HasColumnType("numeric(18,2)");
            b.Property(p => p.Currency).HasMaxLength(10);
            b.Property(p => p.Status).HasConversion<int>();
            b.Property(p => p.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(p => p.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasOne(p => p.Store).WithMany(s => s.Products).HasForeignKey(p => p.StoreId);
            b.HasOne(p => p.Category).WithMany().HasForeignKey(p => p.CategoryId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ProductVariant>(b =>
        {
            b.ToTable("product_variants");
            b.HasKey(v => v.Id);
            b.Property(v => v.SKU).HasMaxLength(64);
            b.Property(v => v.Price).HasColumnType("numeric(18,2)");
            b.Property(v => v.AttributesJson).HasMaxLength(200);
            b.HasOne(v => v.Product).WithMany(p => p.Variants).HasForeignKey(v => v.ProductId);
        });

        modelBuilder.Entity<ProductMedia>(b =>
        {
            b.ToTable("product_media");
            b.HasKey(m => m.Id);
            b.Property(m => m.Url).IsRequired().HasMaxLength(500);
            b.Property(m => m.SortOrder).HasDefaultValue(0);
            b.HasOne(m => m.Product).WithMany(p => p.Media).HasForeignKey(m => m.ProductId);
        });

        modelBuilder.Entity<Customer>(b =>
        {
            b.ToTable("customers");
            b.HasKey(c => c.Id);
            b.Property(c => c.Name).IsRequired().HasMaxLength(200);
            b.Property(c => c.Email).HasMaxLength(320);
            b.Property(c => c.Phone).HasMaxLength(20);
            b.Property(c => c.CompanyName).HasMaxLength(200);
            b.Property(c => c.GSTIN).HasMaxLength(15);
            b.Property(c => c.Type).HasConversion<int>();
            b.Property(c => c.CreditLimit).HasColumnType("numeric(18,2)");
            b.Property(c => c.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(c => c.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasOne(c => c.Store).WithMany(s => s.Customers).HasForeignKey(c => c.StoreId);
        });

        modelBuilder.Entity<CustomerAddress>(b =>
        {
            b.ToTable("customer_addresses");
            b.HasKey(a => a.Id);
            b.Property(a => a.Label).HasMaxLength(100);
            b.Property(a => a.Line1).HasMaxLength(200);
            b.Property(a => a.Line2).HasMaxLength(200);
            b.Property(a => a.City).HasMaxLength(100);
            b.Property(a => a.State).HasMaxLength(100);
            b.Property(a => a.PostalCode).HasMaxLength(20);
            b.Property(a => a.Country).HasMaxLength(100);
            b.Property(a => a.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasOne(a => a.Customer).WithMany(c => c.Addresses).HasForeignKey(a => a.CustomerId);
        });

        modelBuilder.Entity<Order>(b =>
        {
            b.ToTable("orders");
            b.HasKey(o => o.Id);
            b.Property(o => o.Type).HasConversion<int>();
            b.Property(o => o.Status).HasConversion<int>();
            b.Property(o => o.PaymentStatus).HasConversion<int>();
            b.Property(o => o.Subtotal).HasColumnType("numeric(18,2)");
            b.Property(o => o.Tax).HasColumnType("numeric(18,2)");
            b.Property(o => o.Shipping).HasColumnType("numeric(18,2)");
            b.Property(o => o.Total).HasColumnType("numeric(18,2)");
            b.Property(o => o.Currency).HasMaxLength(10);
            b.Property(o => o.Notes).HasMaxLength(200);
            b.Property(o => o.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(o => o.UpdatedAt).HasColumnType("timestamp with time zone");
            b.HasOne(o => o.Store).WithMany(s => s.Orders).HasForeignKey(o => o.StoreId);
            b.HasOne(o => o.Customer).WithMany(c => c.Orders).HasForeignKey(o => o.CustomerId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<OrderItem>(b =>
        {
            b.ToTable("order_items");
            b.HasKey(oi => oi.Id);
            b.Property(oi => oi.Title).IsRequired().HasMaxLength(200);
            b.Property(oi => oi.SKU).HasMaxLength(64);
            b.Property(oi => oi.Price).HasColumnType("numeric(18,2)");
            b.Property(oi => oi.Total).HasColumnType("numeric(18,2)");
            b.HasOne(oi => oi.Order).WithMany(o => o.Items).HasForeignKey(oi => oi.OrderId);
        });

        modelBuilder.Entity<AccessToken>(b =>
        {
            b.ToTable("access_tokens");
            b.HasKey(t => t.Id);
            b.HasIndex(t => t.TokenHash).IsUnique();
            b.Property(t => t.TokenHash).IsRequired().HasMaxLength(128);
            b.Property(t => t.Scope).HasMaxLength(200);
            b.Property(t => t.ExpiresAt).HasColumnType("timestamp with time zone");
            b.Property(t => t.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(t => t.RevokedAt).HasColumnType("timestamp with time zone");
            b.Property(t => t.ClientIp).HasMaxLength(64);
            b.Property(t => t.UserAgent).HasMaxLength(256);
            b.HasOne(t => t.User)
                .WithMany(u => u.AccessTokens)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RefreshToken>(b =>
        {
            b.ToTable("refresh_tokens");
            b.HasKey(t => t.Id);
            b.HasIndex(t => t.TokenHash).IsUnique();
            b.Property(t => t.TokenHash).IsRequired().HasMaxLength(128);
            b.Property(t => t.ExpiresAt).HasColumnType("timestamp with time zone");
            b.Property(t => t.CreatedAt).HasColumnType("timestamp with time zone");
            b.Property(t => t.RevokedAt).HasColumnType("timestamp with time zone");
            b.Property(t => t.ClientIp).HasMaxLength(64);
            b.Property(t => t.UserAgent).HasMaxLength(256);
            b.Property(t => t.ParentTokenId);
            b.HasOne(t => t.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LoginAttempt>(b =>
        {
            b.ToTable("login_attempts");
            b.HasKey(a => a.Id);
            b.Property(a => a.Email).IsRequired().HasMaxLength(320);
            b.Property(a => a.Success).IsRequired();
            b.Property(a => a.ClientIp).HasMaxLength(64);
            b.Property(a => a.UserAgent).HasMaxLength(256);
            b.Property(a => a.CreatedAt).HasColumnType("timestamp with time zone");
        });

        modelBuilder.Entity<WebAuthnCredential>(b =>
        {
            b.ToTable("webauthn_credentials");
            b.HasKey(c => c.Id);
            b.Property(c => c.CredentialId).IsRequired().HasMaxLength(512);
            b.HasIndex(c => c.CredentialId).IsUnique();
            b.Property(c => c.PublicKey).IsRequired();
            b.Property(c => c.SignCount).IsRequired();
            b.Property(c => c.AaGuid).IsRequired();
            b.Property(c => c.CredType).HasMaxLength(32);
            b.Property(c => c.Transports).HasMaxLength(64);
            b.Property(c => c.CreatedAt).HasColumnType("timestamp with time zone");
            b.HasOne(c => c.User)
                .WithMany(u => u.WebAuthnCredentials)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
