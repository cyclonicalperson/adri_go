using Mcp.Data;

namespace Mcp.Endpoints;

internal static class AppEndpointRouteBuilderExtensions
{
    public static IEndpointRouteBuilder MapAppEndpoints(this IEndpointRouteBuilder endpoints)
    {
        // Info endpoint
        endpoints.MapGet("/", () => Results.Ok(new
        {
            name = "Tourism MCP Server",
            version = "1.0.0",
            transport = "http",
            endpoint = "/mcp",
            health = "/health"
        }));

        // Health check — provjera konekcije na bazu
        endpoints.MapGet("/health", async (McpDbContext db) =>
        {
            try
            {
                var canConnect = await db.Database.CanConnectAsync();
                if (!canConnect)
                    return Results.Problem("Database connection failed.", statusCode: 503);

                return Results.Ok(new
                {
                    status = "healthy",
                    database = "connected",
                    time = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return Results.Problem(
                    detail: ex.Message,
                    title: "Database unreachable",
                    statusCode: 503);
            }
        });

        // MCP endpoint
        endpoints.MapMcp("/mcp");

        return endpoints;
    }
}