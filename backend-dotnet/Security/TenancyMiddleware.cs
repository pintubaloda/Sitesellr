using backend_dotnet.Services;

namespace backend_dotnet.Security;

public class TenancyMiddleware
{
    private readonly RequestDelegate _next;

    public TenancyMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ITenancyResolver resolver)
    {
        var tenancy = await resolver.ResolveAsync(context, context.RequestAborted);
        context.Items["Tenancy"] = tenancy;
        await _next(context);
    }
}

public static class TenancyExtensions
{
    public static IApplicationBuilder UseTenancy(this IApplicationBuilder app)
    {
        return app.UseMiddleware<TenancyMiddleware>();
    }
}
