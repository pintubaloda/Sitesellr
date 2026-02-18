using Microsoft.AspNetCore.Antiforgery;

namespace backend_dotnet.Security;

public class CsrfMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IAntiforgery _antiforgery;
    private static readonly string[] UnsafeMethods = { "POST", "PUT", "PATCH", "DELETE" };
    private static readonly string[] CsrfExemptPaths =
    {
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/refresh",
        "/api/auth/logout",
        "/api/auth/onboarding",
        "/api/team-invites/accept"
    };

    public CsrfMiddleware(RequestDelegate next, IAntiforgery antiforgery)
    {
        _next = next;
        _antiforgery = antiforgery;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var requestPath = context.Request.Path.Value ?? string.Empty;
        var isExempt = CsrfExemptPaths.Any(p => requestPath.StartsWith(p, StringComparison.OrdinalIgnoreCase));

        if (!isExempt && UnsafeMethods.Contains(context.Request.Method.ToUpperInvariant()))
        {
            try
            {
                await _antiforgery.ValidateRequestAsync(context);
            }
            catch (AntiforgeryValidationException)
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsJsonAsync(new { error = "csrf_invalid" });
                return;
            }
        }

        await _next(context);
    }
}

public static class CsrfExtensions
{
    public static IApplicationBuilder UseCsrfProtection(this IApplicationBuilder app)
    {
        return app.UseMiddleware<CsrfMiddleware>();
    }
}
