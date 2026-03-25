using Mcp.Data;
using Mcp.Services;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;
using ModelContextProtocol.Server;
using System.Reflection;

namespace Mcp.Infrastructure;

internal static class ServiceCollectionExtensions
{
    public static IServiceCollection AddMcpServer(this IServiceCollection services, IConfiguration configuration)
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
                    This server provides structured tourism data for destinations, points of interest, routes, events, and accommodation.
                    
                    When user preferences are known, translate them into explicit search filters before calling tools.
                    Use reliable preferences already known from conversation context when relevant.
                    If preferences are incomplete, ask brief follow-up questions to narrow the search. Avoid more than three clarification messages unless the user is clearly engaged.
                    If the request is still too broad for a targeted search, use an overview method first and refine from there.
                    Try to narrow the request enough to return a small, relevant set of options, then inspect details only for the strongest candidates.
                    Do not invent facts that are not returned by the server.
                    """;
            })
            .WithHttpTransport()
            .WithToolsFromAssembly(Assembly.GetExecutingAssembly())
            .WithResourcesFromAssembly(Assembly.GetExecutingAssembly());

        var connectionString = configuration.GetConnectionString("MySql")
            ?? throw new InvalidOperationException("Connection string 'MySql' is not configured.");
        var serverVersionString = configuration["ConnectionStrings:MySqlServerVersion"] ?? "8.0.36";
        var serverVersion = new MySqlServerVersion(new Version(serverVersionString));

        services.AddDbContext<McpDbContext>(options =>
            options.UseMySql(connectionString, serverVersion));
        services.AddScoped<ITourismQueryService, TourismQueryService>();

        return services;
    }
}
