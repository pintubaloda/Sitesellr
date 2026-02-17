namespace backend_dotnet.Security;

public static class SecurityHeaders
{
    public static IApplicationBuilder UseTightSecurityHeaders(this IApplicationBuilder app)
    {
        app.Use(async (context, next) =>
        {
            context.Response.Headers["X-Frame-Options"] = "DENY";
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            context.Response.Headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()";
            // Example CSP: adjust as you learn your asset hosts
            context.Response.Headers["Content-Security-Policy"] =
                "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';";
            await next();
        });

        return app;
    }
}
