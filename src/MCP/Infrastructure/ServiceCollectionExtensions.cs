using Mcp.Services;
using ModelContextProtocol.Server;
using System.Reflection;

namespace Mcp.Infrastructure;

internal static class ServiceCollectionExtensions
{
    public static IServiceCollection AddMcpServer(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
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
                if (environment.IsDevelopment())
                {
                    allowedOrigins = allowedOrigins
                        .Concat(["http://localhost:4200", "http://localhost:4201"])
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToArray();
                }

                if (allowedOrigins.Length > 0)
                {
                    policy
                        .WithOrigins(allowedOrigins)
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                }
                else if (environment.IsDevelopment())
                {
                    // Nema konfiguriranih origina — dozvoli sve (pogodno za lokalni razvoj)
                    policy
                        .WithOrigins("http://localhost:4200", "http://localhost:4201")
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                }
                else
                {
                    throw new InvalidOperationException("Cors:AllowedOrigins must be configured outside Development.");
                }
            });
        });
        services.AddHttpContextAccessor();

        // MCP only forwards the Bearer token. Backend validates identity and authorization.
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
                    activity tags, engagement analytics (clicks, directions, visit trends), and tourist profile data.

                    AUTHENTICATION:
                    Some tools require the tourist to be logged in (prefixed with "my" or performing write actions).
                    These tools read the tourist identity from the JWT token automatically — NEVER ask the user
                    for their tourist ID or any personal identifier. If a "my" or write tool returns an auth error,
                    tell the user they need to log in to use that feature.

                    NAME-BASED LOOKUP — IMPORTANT:
                    All tools that accept regionId, postId, or routeId ALSO accept regionName, postName, or routeName.
                    ALWAYS prefer name parameters when the user provides a name — the system resolves IDs automatically.
                    NEVER ask the user for a numeric ID. Use the name parameters directly.
                    Example: instead of searching for 'Zabljak' to get its ID, pass regionName='Zabljak' directly.

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

                    "What does destination X offer?" (pass name directly, no ID lookup needed):
                      → tourism_get_region_summary(regionName='X') → overview of posts, routes, rating

                    "Find restaurants / hotels / attractions in region X":
                      → tourism_search_posts(regionName='X', postTypes=['restaurant'])

                    "What is new / recently opened in region X":
                      → tourism_search_posts(regionName='X', sortBy='newest')
                      OR tourism_get_new_content(regionName='X', daysBack=30)

                    "Tell me more about location Y" (pass name directly):
                      → tourism_get_post_detail(postName='Y')

                    "What do visitors say about location Y":
                      → tourism_get_reviews(postName='Y')

                    "Reviews for route Z":
                      → tourism_get_route_reviews(routeName='Z')

                    "Best/most popular locations and routes":
                      → tourism_get_top_content(sortBy='views') — returns both locations AND routes by default

                    "Most popular routes":
                      → tourism_search_routes(sortBy='popular')

                    "Routes for beginners / flat routes / short hikes":
                      → tourism_search_routes(difficulties=['easy'], maxElevationGain=200, regionName='X')

                    "What is near me / near coordinates?":
                      → tourism_get_nearby(latitude, longitude, radiusKm)

                    "Show me something similar to this location":
                      → tourism_get_similar_posts(postName='Y')

                    "What activities / amenities are available?":
                      → tourism_search_tags(category='aktivnost') or tourism_search_activities()

                    "Adventure / wellness / outdoor things to do":
                      → tourism_search_activities(category='ADVENTURE') → tourism_search_posts(tags=[activity names])

                    "Upcoming concerts / events in region X":
                      → tourism_search_events(regionName='X', category='CONCERT', startFrom=today)

                    "What drives most bookings in region X?":
                      → tourism_get_external_click_stats(regionName='X')

                    "Which locations do tourists navigate to most?":
                      → tourism_get_direction_stats(regionName='X')

                    "When is peak season for region X?":
                      → tourism_get_visit_trends(regionName='X')

                    "Save this location" / "Add to my list":
                      → tourism_save_location(postName='Y') — no ID needed

                    "Add to my travel plan":
                      → tourism_add_to_planner(postName='Y') — no ID needed

                    "Leave a review for location Y":
                      → tourism_submit_review(postName='Y', rating=5, comment='...')

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
