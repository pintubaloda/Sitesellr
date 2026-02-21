using backend_dotnet.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend_dotnet.Controllers;

[ApiController]
[Route("api/meta")]
public class MetaController : ControllerBase
{
    [HttpGet("india-states")]
    public IActionResult IndiaStates()
    {
        return Ok(new { states = IndiaStateCatalog.States });
    }
}
