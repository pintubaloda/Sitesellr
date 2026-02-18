using backend_dotnet.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthAccessController : ControllerBase
{
    [HttpGet("access")]
    public IActionResult GetAccess()
    {
        var tenancy = HttpContext.Items["Tenancy"] as TenancyContext;
        if (tenancy?.UserId == null)
        {
            return Unauthorized(new { error = "unauthenticated" });
        }

        return Ok(new
        {
            userId = tenancy.UserId,
            isPlatformOwner = tenancy.IsPlatformOwner,
            isPlatformStaff = tenancy.IsPlatformStaff,
            isStoreOwnerOrAdmin = tenancy.IsOwnerOrAdmin,
            storeRole = tenancy.Role?.ToString(),
            platformRoles = tenancy.PlatformRoles.Select(x => x.ToString()).ToArray(),
            platformPermissions = tenancy.PlatformPermissions.OrderBy(x => x).ToArray(),
            storePermissions = tenancy.StorePermissions.OrderBy(x => x).ToArray(),
            highRiskActions = new[]
            {
                "refunds.override",
                "payouts.freeze",
                "payouts.release",
                "plugins.approve",
                "api_keys.revoke",
                "merchants.suspend",
                "merchants.delete"
            }
        });
    }
}
