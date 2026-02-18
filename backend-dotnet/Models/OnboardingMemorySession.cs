namespace backend_dotnet.Models;

public enum OnboardingMemoryStatus
{
    Started = 0,
    OtpVerified = 1,
    PlanChosen = 2,
    PaymentCompleted = 3,
    StoreSetup = 4,
    Activated = 5
}

public class OnboardingMemorySession
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string EmailOtp { get; set; } = string.Empty;
    public string MobileOtp { get; set; } = string.Empty;
    public bool EmailVerified { get; set; }
    public bool MobileVerified { get; set; }
    public string? PlanCode { get; set; }
    public bool PaymentRequired { get; set; }
    public bool PaymentDone { get; set; }
    public string? StoreName { get; set; }
    public string? Subdomain { get; set; }
    public OnboardingMemoryStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
