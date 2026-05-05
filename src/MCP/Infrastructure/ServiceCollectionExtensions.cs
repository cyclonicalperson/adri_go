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
        // CORS
        var corsSection = configuration.GetSection(McpCorsOptions.SectionName);
        var corsOptions = corsSection.Get<McpCorsOptions>() ?? new McpCorsOptions();

        services.Configure<McpCorsOptions>(corsSection);

        services.AddCors(cors =>
        {
            cors.AddPolicy(McpCorsOptions.PolicyName, policy =>
            {
                var allowedOrigins = corsOptions.AllowedOrigins;

                if (allowedOrigins.Length > 0)
                {
                    policy
                        .WithOrigins(allowedOrigins)
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                }
                else
                {
                    // Nema konfiguriranih origina — dozvoli sve (pogodno za lokalni razvoj)
                    policy
                        .AllowAnyOrigin()
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                }
            });
        });

        services
            .AddMcpServer(options =>
            {
                options.ServerInfo = new()
                {
                    Name = "tourism-mcp-server",
                    Version = "1.0.0"
                };
                options.ServerInstructions = """
                    This server exposes structured tourism data from a regional tourist guide application.
                    All data comes exclusively from the internal database — do not invent facts not returned by tools.

                    AVAILABLE DATA: regions/destinations, locations (accommodation, restaurants, attractions, monuments,
                    cultural sites, clubs, sports facilities, shops, events), hiking/tourist routes, visitor reviews,
                    activity tags, engagement analytics, and registered tourist statistics.

                    RECOMMENDED WORKFLOWS:

                    "What does destination X offer?"
                      → tourism_search_regions (find region ID) → tourism_get_region_summary (overview)

                    "Find restaurants / hotels / attractions in region X":
                      → tourism_search_regions (find region ID) → tourism_search_posts (filter by postTypes)

                    "Tell me more about location Y":
                      → tourism_search_posts (find post ID) → tourism_get_post_detail

                    "Best/most popular locations":
                      → tourism_get_top_content (sortBy: views | likes | rating | review_count)

                    "Routes for beginners / flat routes / short hikes":
                      → tourism_search_routes (filter difficulties, maxElevationGain, maxDistanceKm)

                    "What is near me / near coordinates?":
                      → tourism_get_nearby (latitude, longitude, radiusKm)

                    "Show me something similar to this":
                      → tourism_get_similar_posts (postId)

                    "What activities / amenities are available?":
                      → tourism_search_tags (category: aktivnost | amenity)

                    "What do visitors say about X?":
                      → tourism_search_posts (find ID) → tourism_get_reviews

                    PAGINATION: All search tools return { Items, TotalCount, HasMore }.
                    Use offset parameter to get more results when HasMore is true.

                    TOOL NAMING: All tools are prefixed with tourism_ to avoid conflicts with other MCP servers.
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

        // Logging
        services.AddLogging(logging =>
        {
            logging.AddConsole();
            logging.SetMinimumLevel(LogLevel.Information);
        });

        return services;
    }
}