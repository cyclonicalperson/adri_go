using Mcp.Data;
using Mcp.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ModelContextProtocol.Server;
using System.Reflection;
using System.Text;

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

        // JWT autentikacija — verifikujemo tokene koje je izdao Backend
        var jwtSecret = configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret nije postavljen u appsettings.json");

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer           = true,
                    ValidIssuer              = configuration["Jwt:Issuer"],
                    ValidateAudience         = true,
                    ValidAudience            = configuration["Jwt:Audience"],
                    ValidateLifetime         = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                    ClockSkew                = TimeSpan.Zero
                };
            });

        services.AddAuthorization();

        // IHttpContextAccessor — potreban CurrentTouristContext-u
        services.AddHttpContextAccessor();

        // Trenutni kontekst turiste (čita tourist_id iz JWT-a)
        services.AddScoped<ICurrentTouristContext, CurrentTouristContext>();

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

                    AUTHENTICATION:
                    Some tools require the tourist to be logged in (they are prefixed with "my").
                    These tools read the tourist identity from the JWT token automatically — NEVER ask the user
                    for their tourist ID or any personal identifier. If a "my" tool returns empty results,
                    tell the user they need to log in to see their personal data.

                    PERSONAL DATA TOOLS (require login — use these, never ask for IDs):
                      tourism_get_my_planner    → tourist's own trip itineraries
                      tourism_get_my_saved      → tourist's bookmarked locations
                      tourism_get_my_favorites  → tourist's favorited locations and routes

                    RECOMMENDED WORKFLOWS:

                    "What does destination X offer?"
                      → tourism_search_regions (find region ID) → tourism_get_region_summary (overview)

                    "Find restaurants / hotels / attractions in region X":
                      → tourism_search_regions (find region ID) → tourism_search_posts (filter by postTypes)

                    "What is new / recently opened in region X":
                      → tourism_search_regions (find region ID) → tourism_search_posts (sortBy: newest)

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

                    "Hotel with pool / restaurant with parking / location with WiFi":
                      → tourism_search_tags (category: amenity) to discover available amenity tag names
                      → tourism_search_posts (tags: [tag name from previous step])

                    "Adventure activities / wellness / outdoor things to do":
                      → tourism_search_activities (category: ADVENTURE | WELLNESS | SPORT | DINING | NIGHTLIFE | SIGHTSEEING | CULTURE)
                      → tourism_search_posts (tags: [activity name from previous step])

                    "What do visitors say about X?":
                      → tourism_search_posts (find ID) → tourism_get_reviews

                    "Show me my saved places / my trip plan / my favorites":
                      → tourism_get_my_saved / tourism_get_my_planner / tourism_get_my_favorites
                      (no parameters needed — identity comes from the login token)

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