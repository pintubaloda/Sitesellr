namespace backend_dotnet.Models;

public record OnboardingStartRequest(string Name, string Email, string Mobile, string Password);
public record OtpVerifyRequest(Guid SessionId, string Otp);
public record ChoosePlanRequest(Guid SessionId, string PlanCode);
public record SetupStoreRequest(Guid SessionId, string StoreName, string Subdomain);
public record SessionOnlyRequest(Guid SessionId);
