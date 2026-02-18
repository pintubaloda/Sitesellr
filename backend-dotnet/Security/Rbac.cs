using backend_dotnet.Services;
using backend_dotnet.Models;
using Microsoft.AspNetCore.Authorization;

namespace backend_dotnet.Security;

public static class Policies
{
    public const string PlatformOwner = "PlatformOwner";
    public const string PlatformStaffRead = "PlatformStaffRead";
    public const string OrdersRead = "OrdersRead";
    public const string OrdersWrite = "OrdersWrite";
    public const string CustomersRead = "CustomersRead";
    public const string CustomersWrite = "CustomersWrite";
    public const string ProductsRead = "ProductsRead";
    public const string ProductsWrite = "ProductsWrite";
    public const string StoreSettingsRead = "StoreSettingsRead";
    public const string StoreSettingsWrite = "StoreSettingsWrite";
}

public class AccessRequirement : IAuthorizationRequirement
{
    public AccessRequirement(string? requiredPermission = null, PlatformRole? platformRole = null)
    {
        RequiredPermission = requiredPermission;
        PlatformRole = platformRole;
    }
    public string? RequiredPermission { get; }
    public PlatformRole? PlatformRole { get; }
}

public class AccessRequirementHandler : AuthorizationHandler<AccessRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, AccessRequirement requirement)
    {
        if (context.Resource is HttpContext httpContext &&
            httpContext.Items["Tenancy"] is TenancyContext tenancy)
        {
            if (!tenancy.IsAuthenticated)
            {
                return Task.CompletedTask;
            }

            if (requirement.PlatformRole.HasValue)
            {
                if (requirement.PlatformRole == PlatformRole.Owner && tenancy.IsPlatformOwner)
                {
                    context.Succeed(requirement);
                }
                else if (requirement.PlatformRole == PlatformRole.Staff && tenancy.IsPlatformStaff)
                {
                    context.Succeed(requirement);
                }

                return Task.CompletedTask;
            }

            if (tenancy.Store == null || string.IsNullOrWhiteSpace(requirement.RequiredPermission))
            {
                return Task.CompletedTask;
            }

            if (tenancy.StorePermissions.Contains(requirement.RequiredPermission))
            {
                context.Succeed(requirement);
            }
        }
        return Task.CompletedTask;
    }
}
