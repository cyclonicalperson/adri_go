namespace Mcp.Endpoints;

internal static class AppEndpointRouteBuilderExtensions
{
    public static IEndpointRouteBuilder MapAppEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/", () => Results.Ok(new
        {
            name = "Tourism MCP Server",
            version = "1.0.0",
            transport = "http",
            endpoint = "/mcp",
            health = "/health",
            chat = "/api/chat"
        }));

        endpoints.MapGet("/health", () => Results.Ok(new
        {
            status = "healthy",
            database = "not_configured",
            backendCapabilities = "required",
            time = DateTime.UtcNow
        }));

        endpoints.MapMcp("/mcp");
        endpoints.MapGeminiChatEndpoints();

        return endpoints;
    }
}
