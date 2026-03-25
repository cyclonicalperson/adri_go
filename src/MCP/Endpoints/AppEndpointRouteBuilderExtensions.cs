namespace Mcp.Endpoints;

internal static class AppEndpointRouteBuilderExtensions
{
    public static IEndpointRouteBuilder MapAppEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/", () => Results.Ok(new
        {
            name = "Tourism MCP server",
            transport = "http",
            endpoint = "/mcp"
        }));

        endpoints.MapMcp("/mcp");

        return endpoints;
    }
}
