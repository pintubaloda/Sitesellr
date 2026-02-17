using backend_dotnet.Services;
using Microsoft.AspNetCore.Authorization;

namespace backend_dotnet.Security;

public static class Policies
{
    public const string StoreOwnerOrAdmin = "StoreOwnerOrAdmin";
    public const string StoreStaff = "StoreStaff";
}

public class TenancyRoleRequirement : IAuthorizationRequirement
{
    public TenancyRoleRequirement(bool requireOwnerOrAdmin)
    {
        RequireOwnerOrAdmin = requireOwnerOrAdmin;
    }
    public bool RequireOwnerOrAdmin { get; }
}

public class TenancyRoleHandler : AuthorizationHandler<TenancyRoleRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, TenancyRoleRequirement requirement)
    {
        if (context.Resource is HttpContext httpContext &&
            httpContext.Items["Tenancy"] is TenancyContext tenancy &&
            tenancy.IsAuthenticated &&
            tenancy.Store != null)
        {
            if (!requirement.RequireOwnerOrAdmin)
            {
                context.Succeed(requirement);
            }
            else if (tenancy.IsOwnerOrAdmin)
            {
                context.Succeed(requirement);
            }
        }
        return Task.CompletedTask;
    }
}
