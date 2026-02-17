using backend_dotnet.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/[controller]")]
public abstract class BaseApiController : ControllerBase
{
    protected TenancyContext? Tenancy => HttpContext.Items["Tenancy"] as TenancyContext;
}
