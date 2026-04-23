using Mcp.Data;
using Mcp.Services;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;
using System.Reflection;

namespace Mcp.Infrastructure;

internal static class ServiceCollectionExtensions
{
    public static IServiceCollection AddMcpServer(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services
            .AddMcpServer(options =>
            {
                options.ServerInfo = new()
                {
                    Name = "tourism-mcp-server",
                    Version = "1.0.0"
                };
                options.ServerInstructions = """
                    This server provides structured tourism data for destinations,
                    points of interest, routes, events, and accommodation.
                    When user preferences are known, translate them into explicit search filters before calling tools.
                    Use reliable preferences already known from conversation context when relevant.
                    If preferences are incomplete, ask brief follow-up questions to narrow the search.
                    Try to return a small, relevant set of options rather than a long list.
                    Do not invent facts that are not returned by the server.
                    """;
            })
            .WithHttpTransport(options =>
            {
                options.Stateless = true;
            })
            .WithToolsFromAssembly(Assembly.GetExecutingAssembly())
            .WithResourcesFromAssembly(Assembly.GetExecutingAssembly());

        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "Connection string 'DefaultConnection' is not configured.");

        services.AddDbContext<McpDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<ITourismQueryService, TourismQueryService>();

        return services;
    }
}