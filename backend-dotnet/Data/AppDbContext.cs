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
