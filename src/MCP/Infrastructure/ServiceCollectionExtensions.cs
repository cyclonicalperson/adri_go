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
                    Some tools require the tourist to be logged in (they are prefixed with "my" or perform write actions).
                    These tools read the tourist identity from the JWT token automatically — NEVER ask the user
                    for their tourist ID or any personal identifier. If a "my" or write tool returns an auth error,
                    tell the user they need to log in to use that feature.

                    PERSONALISATION — IMPORTANT:
                    At the start of a conversation where the tourist is logged in, call tourism_get_my_profile FIRST.
                    Use the returned language, interests, topPostTypes, topTags, and topRegions to:
                      - respond in the tourist's preferred language (Language field)
                      - prioritise content matching their interests and top tags
                      - favour their preferred regions in recommendations
                    If the profile returns null, the tourist is not logged in — treat them as anonymous.

                    PERSONAL DATA TOOLS (require login — use these, never ask for IDs):
                      tourism_get_my_planner    → tourist's own trip itineraries
                      tourism_get_my_saved      → tourist's bookmarked locations
                      tourism_get_my_favorites  → tourist's favorited locations and routes
                      tourism_get_my_profile    → full profile + behavioural preferences

                    WRITE TOOLS (require login — perform actions on behalf of the tourist):
                      tourism_submit_review       → leave a star rating + comment for a location
                      tourism_save_location       → bookmark a location
                      tourism_unsave_location     → remove a bookmark
                      tourism_like_location       → like a location
                      tourism_unlike_location     → remove a like
                      tourism_add_to_planner      → add a location to the travel calendar
                      tourism_remove_from_planner → remove a location from the travel calendar

                    RECOMMENDED WORKFLOWS:

                    Starting a personalised chat (tourist logged in):
                      → tourism_get_my_profile (get language + interests) → use profile to shape all responses

                    "What does destination X offer?":
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

                    "I want to leave a review for X":
                      → tourism_search_posts (find post ID) → tourism_submit_review (postId, rating, comment)

                    "Save this location" / "Add to my list":
                      → tourism_save_location (postId)

                    "Add this to my travel plan":
                      → tourism_add_to_planner (postId)

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

        // HTTP klijent za pozive Backend API-ja (write operacije)
        var backendUrl = configuration["BackendApi:BaseUrl"]
            ?? throw new InvalidOperationException("BackendApi:BaseUrl nije postavljen u appsettings.json");

        services.AddHttpClient("BackendApi", client =>
        {
            client.BaseAddress = new Uri(backendUrl);
            client.Timeout = TimeSpan.FromSeconds(15);
        });

        services.AddScoped<ITourismWriteService, TourismWriteService>();

        services.AddScoped<ITouristProfileService, TouristProfileService>();

        // Gemini AI orkestratorski servis
        services.AddHttpClient("GeminiApi", client =>
        {
            client.BaseAddress = new Uri("https://generativelanguage.googleapis.com/");
            client.Timeout = TimeSpan.FromSeconds(60);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
        });

        services.AddScoped<IGeminiChatService, GeminiChatService>();

        // Logging
        services.AddLogging(logging =>
        {
            logging.AddConsole();
            logging.SetMinimumLevel(LogLevel.Information);
        });

        return services;
    }
}