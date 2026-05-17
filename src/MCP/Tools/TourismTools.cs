using Mcp.Dtos;
using Mcp.Services;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace Mcp.Tools;

[McpServerToolType]
internal static class TourismTools
{
    // ════════════════════════════════════════════════════════════════════════
    // REGIJE
    // ════════════════════════════════════════════════════════════════════════

    [McpServerTool(Name = "tourism_search_regions", Title = "Search Regions", ReadOnly = true, Idempotent = true)]
    [Description(
        "Search tourist regions and destinations such as cities, mountains, lakes, and national parks. " +
        "Returns paged results with total count. " +
        "Use this first to discover regionId values needed by other tools.")]
    public static Task<PagedResult<RegionSummary>> SearchRegions(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Optional free-text query, e.g. 'Zabljak', 'Durmitor', 'Budva'.")] string? query = null,
        [Description("Optional type filter: city, mountain, lake, national_park, coast, village, other.")] string? type = null,
        [Description("Optional country filter, e.g. 'Montenegro', 'Serbia'.")] string? country = null,
        [Description("If true, returns only regions with GPS coordinates.")] bool? hasCoordinates = null,
        [Description("Maximum number of results (default 10).")] int? limit = null,
        [Description("Number of results to skip for pagination (default 0).")] int? offset = null)
    {
        return tourismService.SearchRegionsAsync(
            new SearchRegionsRequest(query, type, country, hasCoordinates, limit ?? 10, offset ?? 0),
            cancellationToken);
    }

    [McpServerTool(Name = "tourism_get_region_summary", Title = "Get Region Summary", ReadOnly = true, Idempotent = true)]
    [Description(
        "Get a full overview of a region: total post count, route count, average rating, and breakdown of posts by type. " +
        "Provide regionId OR regionName — never both. " +
        "If you only have the region name (e.g. 'Zabljak'), provide regionName and the system will resolve the ID automatically. " +
        "Example: regionName='Durmitor' will match 'Nacionalni park Durmitor'.")]
    public static async Task<RegionFullSummary?> GetRegionSummary(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Numeric region ID (use if already known).")] uint? regionId = null,
        [Description("Region name or partial name (e.g. 'Zabljak', 'Durmitor'). Used when regionId is not provided.")] string? regionName = null)
    {
        var resolvedId = await ResolveRegionId(regionId, regionName, tourismService, cancellationToken);
        if (resolvedId is null) return null;

        return await tourismService.GetRegionSummaryAsync(new GetRegionSummaryRequest(resolvedId.Value), cancellationToken);
    }

    // ════════════════════════════════════════════════════════════════════════
    // LOKACIJE / OBJEKTI
    // ════════════════════════════════════════════════════════════════════════

    [McpServerTool(Name = "tourism_search_posts", Title = "Search Locations", ReadOnly = true, Idempotent = true)]
    [Description(
        "Search published locations and points of interest. " +
        "Post types: accommodation, restaurant, club, cultural_site, monument, sports_facility, event, attraction, shop, other. " +
        "Sort options: rating (default), distance (requires userLatitude/userLongitude), title, newest. " +
        "Tip: use regionName instead of regionId when you only know the destination name.")]
    public static async Task<PagedResult<PostSummary>> SearchPosts(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Optional region ID to scope the search (use regionName if ID is unknown).")] uint? regionId = null,
        [Description("Region name or partial name (e.g. 'Zabljak'). Resolved automatically when regionId is not provided.")] string? regionName = null,
        [Description("Optional free-text query matching title, description, or address.")] string? query = null,
        [Description("Optional post type list: accommodation, restaurant, club, cultural_site, monument, sports_facility, event, attraction, shop, other.")] IReadOnlyList<string>? postTypes = null,
        [Description("Optional minimum average rating (0-5).")] double? minRating = null,
        [Description("Optional maximum average rating (0-5).")] double? maxRating = null,
        [Description("Optional tag names to filter by, e.g. ['bazen', 'planinarenje'].")] IReadOnlyList<string>? tags = null,
        [Description("If true, only returns locations that have an external booking/info URL.")] bool? hasExternalUrl = null,
        [Description("If true, only returns locations with opening hours defined.")] bool? hasOpeningHours = null,
        [Description("User latitude for proximity sorting and radius filtering.")] double? userLatitude = null,
        [Description("User longitude for proximity sorting and radius filtering.")] double? userLongitude = null,
        [Description("Only return results within this many km from the user location.")] double? radiusKm = null,
        [Description("Sort order: rating (default), distance (requires userLatitude/userLongitude), title, newest.")] string? sortBy = null,
        [Description("Maximum number of results (default 10).")] int? limit = null,
        [Description("Number of results to skip for pagination (default 0).")] int? offset = null)
    {
        var resolvedRegionId = await ResolveRegionId(regionId, regionName, tourismService, cancellationToken);

        return await tourismService.SearchPostsAsync(
            new SearchPostsRequest(resolvedRegionId, query, postTypes, minRating, maxRating,
                userLatitude, userLongitude, radiusKm, tags,
                hasExternalUrl, hasOpeningHours, sortBy, limit ?? 10, offset ?? 0),
            cancellationToken);
    }

    [McpServerTool(Name = "tourism_get_post_detail", Title = "Get Location Detail", ReadOnly = true, Idempotent = true)]
    [Description(
        "Get full details for a specific location: description, opening hours, rating, views, likes, review count, tags, external booking URL, and image URLs. " +
        "Provide postId OR postName — never both. " +
        "If you only know the location name (e.g. 'Hotel Durmitor'), provide postName and the ID is resolved automatically. " +
        "Returns null if the location is not found or not published.")]
    public static async Task<PostDetail?> GetPostDetail(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Numeric ID of the location (use if already known).")] uint? postId = null,
        [Description("Location name or partial name (e.g. 'Hotel Durmitor', 'Restoran Jezero'). Used when postId is not provided.")] string? postName = null)
    {
        var resolvedId = await ResolvePostId(postId, postName, tourismService, cancellationToken);
        if (resolvedId is null) return null;

        return await tourismService.GetPostDetailAsync(new PostDetailRequest(resolvedId.Value), cancellationToken);
    }

    // ════════════════════════════════════════════════════════════════════════
    // RUTE
    // ════════════════════════════════════════════════════════════════════════

    [McpServerTool(Name = "tourism_search_routes", Title = "Search Routes", ReadOnly = true, Idempotent = true)]
    [Description(
        "Search published tourist routes (hiking, cycling, walking...). " +
        "Difficulty levels: easy, moderate, hard, expert. " +
        "Sort options: distance_asc, distance_desc, duration_asc, duration_desc, elevation_asc, elevation_desc, popular (by save count). " +
        "Use regionName instead of regionId when you only know the destination name.")]
    public static async Task<PagedResult<RouteSummary>> SearchRoutes(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Optional region ID (use regionName if ID is unknown).")] uint? regionId = null,
        [Description("Region name or partial name (e.g. 'Durmitor'). Resolved automatically when regionId is not provided.")] string? regionName = null,
        [Description("Optional free-text query matching route name or description.")] string? query = null,
        [Description("Optional difficulty list: easy, moderate, hard, expert.")] IReadOnlyList<string>? difficulties = null,
        [Description("Optional maximum route distance in kilometers.")] decimal? maxDistanceKm = null,
        [Description("Optional minimum route distance in kilometers.")] decimal? minDistanceKm = null,
        [Description("Optional maximum duration in minutes.")] int? maxDurationMinutes = null,
        [Description("Optional minimum duration in minutes.")] int? minDurationMinutes = null,
        [Description("Optional maximum elevation gain in meters.")] uint? maxElevationGain = null,
        [Description("Sort order: distance_asc, distance_desc, duration_asc, duration_desc, elevation_asc, elevation_desc, popular.")] string? sortBy = null,
        [Description("Maximum number of results (default 10).")] int? limit = null,
        [Description("Number of results to skip for pagination (default 0).")] int? offset = null)
    {
        var resolvedRegionId = await ResolveRegionId(regionId, regionName, tourismService, cancellationToken);

        return await tourismService.SearchRoutesAsync(
            new SearchRoutesRequest(resolvedRegionId, query, difficulties,
                maxDistanceKm, minDistanceKm,
                maxDurationMinutes, minDurationMinutes,
                maxElevationGain, null, sortBy, limit ?? 10, offset ?? 0),
            cancellationToken);
    }

    [McpServerTool(Name = "tourism_get_route_detail", Title = "Get Route Detail", ReadOnly = true, Idempotent = true)]
    [Description(
        "Get full details for a specific route: waypoints, GPX file path, distance, duration, elevation gain, view count, save count. " +
        "Provide routeId OR routeName — never both. " +
        "If you only know the route name (e.g. 'Crno jezero krug'), provide routeName and the ID is resolved automatically. " +
        "Returns null if the route is not found or not published.")]
    public static async Task<RouteDetail?> GetRouteDetail(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Numeric ID of the route (use if already known).")] uint? routeId = null,
        [Description("Route name or partial name (e.g. 'Crno jezero', 'Durmitor krug'). Used when routeId is not provided.")] string? routeName = null)
    {
        var resolvedId = await ResolveRouteId(routeId, routeName, tourismService, cancellationToken);
        if (resolvedId is null) return null;

        return await tourismService.GetRouteDetailAsync(new RouteDetailRequest(resolvedId.Value), cancellationToken);
    }

    // ════════════════════════════════════════════════════════════════════════
    // RECENZIJE
    // ════════════════════════════════════════════════════════════════════════

    [McpServerTool(Name = "tourism_get_reviews", Title = "Get Location Reviews", ReadOnly = true, Idempotent = true)]
    [Description(
        "Get visitor reviews for a specific location. " +
        "Provide postId OR postName — never both. " +
        "If you only know the location name (e.g. 'Hotel Jezero'), provide postName and the ID is resolved automatically. " +
        "Returns empty list if the location is not found.")]
    public static async Task<PagedResult<ReviewSummary>> GetReviews(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Numeric ID of the location (use if already known).")] uint? postId = null,
        [Description("Location name or partial name. Used when postId is not provided.")] string? postName = null,
        [Description("If true, returns only approved reviews (default true).")] bool? onlyApproved = null,
        [Description("Optional minimum rating filter (1-5).")] int? minRating = null,
        [Description("Optional maximum rating filter (1-5).")] int? maxRating = null,
        [Description("Sort order: rating_asc, rating_desc, or newest (default).")] string? sortBy = null,
        [Description("Maximum number of results (default 20).")] int? limit = null,
        [Description("Number of results to skip for pagination (default 0).")] int? offset = null)
    {
        var resolvedId = await ResolvePostId(postId, postName, tourismService, cancellationToken);
        if (resolvedId is null) return new PagedResult<ReviewSummary>([], 0, false);

        return await tourismService.GetReviewsAsync(
            new GetReviewsRequest(resolvedId.Value, onlyApproved ?? true, minRating, maxRating, sortBy, limit ?? 20, offset ?? 0),
            cancellationToken);
    }

    [McpServerTool(Name = "tourism_get_route_reviews", Title = "Get Route Reviews", ReadOnly = true, Idempotent = true)]
    [Description(
        "Get visitor reviews for a specific route. " +
        "Provide routeId OR routeName — never both. " +
        "If you only know the route name (e.g. 'Crno jezero'), provide routeName and the ID is resolved automatically. " +
        "Returns empty list if the route is not found.")]
    public static async Task<PagedResult<ReviewSummary>> GetRouteReviews(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Numeric ID of the route (use if already known).")] uint? routeId = null,
        [Description("Route name or partial name. Used when routeId is not provided.")] string? routeName = null,
        [Description("If true, returns only approved reviews (default true).")] bool? onlyApproved = null,
        [Description("Optional minimum rating filter (1-5).")] int? minRating = null,
        [Description("Optional maximum rating filter (1-5).")] int? maxRating = null,
        [Description("Sort order: rating_asc, rating_desc, or newest (default).")] string? sortBy = null,
        [Description("Maximum number of results (default 20).")] int? limit = null,
        [Description("Number of results to skip for pagination (default 0).")] int? offset = null)
    {
        var resolvedId = await ResolveRouteId(routeId, routeName, tourismService, cancellationToken);
        if (resolvedId is null) return new PagedResult<ReviewSummary>([], 0, false);

        return await tourismService.GetRouteReviewsAsync(
            new GetRouteReviewsRequest(resolvedId.Value, onlyApproved ?? true, minRating, maxRating, sortBy, limit ?? 20, offset ?? 0),
            cancellationToken);
    }

    // ════════════════════════════════════════════════════════════════════════
    // TAGOVI / AKTIVNOSTI
    // ════════════════════════════════════════════════════════════════════════

    [McpServerTool(Name = "tourism_search_tags", Title = "Search Tags and Activities", ReadOnly = true, Idempotent = true)]
    [Description(
        "Search available tags by category. " +
        "Tag categories stored in database: aktivnost (activities), amenity, stil (style/vibe), cijena (price range), tip (type), oznaka (label). " +
        "Tip: to find activity tags specifically, prefer tourism_search_activities which supports filtering by difficulty and group capacity.")]
    public static Task<IReadOnlyList<TagSummary>> SearchTags(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Optional free-text search on tag name or description.")] string? query = null,
        [Description("Optional category filter: aktivnost (activities), amenity, stil (style/vibe), cijena (price), tip (type), oznaka (label).")] string? category = null,
        [Description("Optional difficulty filter for activity tags: EASY, MEDIUM, HARD.")] string? difficulty = null,
        [Description("If true, only returns activity tags with a defined max capacity.")] bool? hasCapacity = null,
        [Description("Maximum number of results (default 50).")] int? limit = null)
    {
        return tourismService.SearchTagsAsync(
            new SearchTagsRequest(query, category, difficulty, hasCapacity, limit ?? 50),
            cancellationToken);
    }

    [McpServerTool(Name = "tourism_search_activities", Title = "Search Activities", ReadOnly = true, Idempotent = true)]
    [Description(
        "Search activities and things to do. " +
        "Category options: SPORT, ADVENTURE, WELLNESS, SHOPPING, DINING, NIGHTLIFE, SIGHTSEEING, CULTURE, OTHER. " +
        "Omit category to get all activities. " +
        "Use minCapacity/maxCapacity to find activities suitable for a specific group size.")]
    public static Task<IReadOnlyList<TagSummary>> SearchActivities(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Optional free-text search on activity name or description.")] string? query = null,
        [Description("Optional category: SPORT, ADVENTURE, WELLNESS, SHOPPING, DINING, NIGHTLIFE, SIGHTSEEING, CULTURE, OTHER.")] string? category = null,
        [Description("Optional difficulty: EASY, MEDIUM, HARD.")] string? difficulty = null,
        [Description("Minimum group capacity (e.g. 10 for group activities).")] int? minCapacity = null,
        [Description("Maximum group capacity.")] int? maxCapacity = null,
        [Description("Maximum number of results (default 50).")] int? limit = null)
    {
        return tourismService.SearchActivitiesAsync(
            new SearchActivitiesRequest(query, category, difficulty, minCapacity, maxCapacity, limit ?? 50),
            cancellationToken);
    }

    // ════════════════════════════════════════════════════════════════════════
    // EVENTI
    // ════════════════════════════════════════════════════════════════════════

    [McpServerTool(Name = "tourism_search_events", Title = "Search Events", ReadOnly = true, Idempotent = true)]
    [Description(
        "Search published events (concerts, festivals, sports, theatre, tours...). " +
        "Returns all upcoming and past events when no date filter is applied. " +
        "Categories: CONCERT, SPORT, THEATER, FESTIVAL, OTHER. " +
        "Tip: use regionName instead of regionId when you only know the destination name. " +
        "For upcoming events this week use startFrom=today and startTo=end-of-week.")]
    public static async Task<PagedResult<EventSummary>> SearchEvents(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Optional region ID to scope the search (use regionName if ID is unknown).")] uint? regionId = null,
        [Description("Region name or partial name (e.g. 'Zabljak'). Resolved automatically when regionId is not provided.")] string? regionName = null,
        [Description("Optional free-text query matching event title or description.")] string? query = null,
        [Description("Optional start of date range (ISO 8601, e.g. '2025-07-01T00:00:00').")] DateTime? startFrom = null,
        [Description("Optional end of date range (ISO 8601, e.g. '2025-07-31T23:59:59').")] DateTime? startTo = null,
        [Description("Optional category filter: CONCERT, SPORT, THEATER, FESTIVAL, OTHER.")] string? category = null,
        [Description("If true, returns only events with an online ticket purchase URL.")] bool? hasTicketUrl = null,
        [Description("Sort order: start_date_asc (default), start_date_desc, rating, title.")] string? sortBy = null,
        [Description("Maximum number of results (default 10).")] int? limit = null,
        [Description("Number of results to skip for pagination (default 0).")] int? offset = null)
    {
        var resolvedRegionId = await ResolveRegionId(regionId, regionName, tourismService, cancellationToken);

        return await tourismService.SearchEventsAsync(
            new SearchEventsRequest(resolvedRegionId, query, startFrom, startTo,
                category, hasTicketUrl, sortBy, limit ?? 10, offset ?? 0),
            cancellationToken);
    }

    // ════════════════════════════════════════════════════════════════════════
    // PROXIMITY / PREPORUKE
    // ════════════════════════════════════════════════════════════════════════

    [McpServerTool(Name = "tourism_get_nearby", Title = "Get Nearby Locations", ReadOnly = true, Idempotent = true)]
    [Description(
        "Find locations near a specific GPS coordinate within a given radius. Results are sorted by distance. " +
        "Use postTypes to filter by category (e.g. ['accommodation'] for nearby hotels). " +
        "Default radius is 5 km.")]
    public static Task<IReadOnlyList<PostSummary>> GetNearby(
        [Description("Latitude of the center point.")] double latitude,
        [Description("Longitude of the center point.")] double longitude,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Search radius in kilometers (default 5).")] double? radiusKm = null,
        [Description("Optional post type filter: accommodation, restaurant, attraction, etc.")] IReadOnlyList<string>? postTypes = null,
        [Description("Optional minimum rating filter (0-5).")] double? minRating = null,
        [Description("Maximum number of results (default 10).")] int? limit = null)
    {
        return tourismService.GetNearbyAsync(
            new GetNearbyRequest(latitude, longitude, radiusKm ?? 5.0, postTypes, minRating, limit ?? 10),
            cancellationToken);
    }

    [McpServerTool(Name = "tourism_get_similar_posts", Title = "Get Similar Locations", ReadOnly = true, Idempotent = true)]
    [Description(
        "Get locations similar to a given location, matched by shared tags, same type, and same region. " +
        "Provide postId OR postName — never both. " +
        "If you only know the location name, provide postName and the ID is resolved automatically.")]
    public static async Task<IReadOnlyList<PostSummary>> GetSimilarPosts(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Numeric ID of the reference location (use if already known).")] uint? postId = null,
        [Description("Location name or partial name. Used when postId is not provided.")] string? postName = null,
        [Description("Maximum number of similar results (default 5).")] int? limit = null)
    {
        var resolvedId = await ResolvePostId(postId, postName, tourismService, cancellationToken);
        if (resolvedId is null) return [];

        return await tourismService.GetSimilarPostsAsync(
            new GetSimilarPostsRequest(resolvedId.Value, limit ?? 5),
            cancellationToken);
    }

    [McpServerTool(Name = "tourism_get_recommendations", Title = "Get Personalized Recommendations", ReadOnly = true, Idempotent = true)]
    [Description(
        "Get personalized content recommendations for a specific region. " +
        "Provide regionId OR regionName — never both. " +
        "If you only know the region name (e.g. 'Zabljak'), provide regionName. " +
        "contextMode: onsite (default, excludes accommodation) or planning (includes accommodation). " +
        "When touristId is not provided, returns popular content for anonymous users.")]
    public static async Task<IReadOnlyList<RecommendationItem>> GetRecommendations(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Numeric region ID (use if already known).")] uint? regionId = null,
        [Description("Region name or partial name (e.g. 'Zabljak', 'Durmitor'). Used when regionId is not provided.")] string? regionName = null,
        [Description("Optional tourist ID for personalized recommendations. Omit for anonymous/popular-based results.")] uint? touristId = null,
        [Description("Context mode: onsite (default, excludes accommodation) or planning (includes accommodation).")] string? contextMode = null,
        [Description("Maximum number of results (default 10, max 20).")] int? limit = null)
    {
        var resolvedId = await ResolveRegionId(regionId, regionName, tourismService, cancellationToken);
        if (resolvedId is null) return [];

        return await tourismService.GetRecommendationsAsync(
            new GetRecommendationsRequest(resolvedId.Value, touristId, contextMode ?? "onsite", Math.Clamp(limit ?? 10, 1, 20)),
            cancellationToken);
    }

    // ════════════════════════════════════════════════════════════════════════
    // POPULARNOST / SADRŽAJ
    // ════════════════════════════════════════════════════════════════════════

    [McpServerTool(Name = "tourism_get_top_content", Title = "Get Top / Most Popular Content", ReadOnly = true, Idempotent = true)]
    [Description(
        "Get the most popular locations and routes ranked by a specific metric. " +
        "SortBy values: views (default), likes, shares, rating, review_count. " +
        "By default includes both locations and routes (includeRoutes=true). " +
        "Use postType to filter only a specific type of location (e.g. 'restaurant'). " +
        "Tip: use regionName instead of regionId when you only know the destination name.")]
    public static async Task<IReadOnlyList<TopContentItem>> GetTopContent(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Sort metric: views (default), likes, shares, rating, review_count.")] string sortBy = "views",
        [Description("Optional post type filter: accommodation, restaurant, attraction, etc. When set, routes are excluded automatically.")] string? postType = null,
        [Description("If true, includes routes in results alongside locations (default true).")] bool includeRoutes = true,
        [Description("Optional region ID (use regionName if ID is unknown).")] uint? regionId = null,
        [Description("Region name or partial name (e.g. 'Zabljak'). Resolved automatically when regionId is not provided.")] string? regionName = null,
        [Description("Maximum number of results (default 10).")] int? limit = null)
    {
        var resolvedRegionId = await ResolveRegionId(regionId, regionName, tourismService, cancellationToken);

        return await tourismService.GetTopContentUnifiedAsync(
            new GetTopContentUnifiedRequest(sortBy, postType, includeRoutes, resolvedRegionId, limit ?? 10),
            cancellationToken);
    }

    [McpServerTool(Name = "tourism_get_new_content", Title = "Get Recently Published Content", ReadOnly = true, Idempotent = true)]
    [Description(
        "Get recently published locations and routes, ordered by publish date. " +
        "Tip: use regionName instead of regionId when you only know the destination name.")]
    public static async Task<IReadOnlyList<NewContentItem>> GetNewContent(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Optional region ID (use regionName if ID is unknown).")] uint? regionId = null,
        [Description("Region name or partial name (e.g. 'Zabljak'). Resolved automatically when regionId is not provided.")] string? regionName = null,
        [Description("How many days back to look for new content (default 30).")] int? daysBack = null,
        [Description("Maximum number of results (default 20).")] int? limit = null)
    {
        var resolvedRegionId = await ResolveRegionId(regionId, regionName, tourismService, cancellationToken);

        return await tourismService.GetNewContentAsync(
            new GetNewContentRequest(resolvedRegionId, daysBack ?? 30, limit ?? 20),
            cancellationToken);
    }

    // ════════════════════════════════════════════════════════════════════════
    // ANALITIKA
    // ════════════════════════════════════════════════════════════════════════

    [McpServerTool(Name = "tourism_get_visit_trends", Title = "Get Visit Trends", ReadOnly = true, Idempotent = true)]
    [Description(
        "Get daily visit counts over a time period to identify peak tourist seasons. " +
        "Tip: use regionName instead of regionId when you only know the destination name. " +
        "Omit date range to get trends for the last 30 days.")]
    public static async Task<IReadOnlyList<VisitTrendPoint>> GetVisitTrends(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Optional region ID (use regionName if ID is unknown).")] uint? regionId = null,
        [Description("Region name or partial name (e.g. 'Zabljak'). Resolved automatically when regionId is not provided.")] string? regionName = null,
        [Description("Start of date range (ISO 8601). Defaults to 30 days ago.")] DateTime? fromDate = null,
        [Description("End of date range (ISO 8601). Defaults to now.")] DateTime? toDate = null)
    {
        var resolvedRegionId = await ResolveRegionId(regionId, regionName, tourismService, cancellationToken);

        return await tourismService.GetVisitTrendsAsync(
            new GetVisitTrendsRequest(resolvedRegionId, fromDate, toDate),
            cancellationToken);
    }

    [McpServerTool(Name = "tourism_get_external_click_stats", Title = "Get External Click Statistics", ReadOnly = true, Idempotent = true)]
    [Description(
        "Get statistics on how many times tourists clicked external booking/info links for locations. " +
        "Useful for understanding which locations drive the most booking interest. " +
        "Results are ordered by click count descending. " +
        "Tip: use regionName instead of regionId when you only know the destination name.")]
    public static async Task<IReadOnlyList<ExternalClickSummary>> GetExternalClickStats(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Optional: filter by a specific location's ID.")] uint? postId = null,
        [Description("Optional: filter by a specific location's name (e.g. 'Hotel Jezero'). Used when postId is not provided.")] string? postName = null,
        [Description("Optional region ID (use regionName if ID is unknown).")] uint? regionId = null,
        [Description("Region name or partial name. Resolved automatically when regionId is not provided.")] string? regionName = null,
        [Description("Maximum number of results (default 20).")] int? limit = null)
    {
        var resolvedPostId   = postId.HasValue ? postId : (await ResolvePostId(null, postName, tourismService, cancellationToken));
        var resolvedRegionId = await ResolveRegionId(regionId, regionName, tourismService, cancellationToken);

        return await tourismService.GetExternalClickStatsAsync(
            new GetExternalClickStatsRequest(resolvedPostId, resolvedRegionId, limit ?? 20),
            cancellationToken);
    }

    [McpServerTool(Name = "tourism_get_direction_stats", Title = "Get Direction Request Statistics", ReadOnly = true, Idempotent = true)]
    [Description(
        "Get statistics on how many times tourists requested directions to specific locations. " +
        "Useful for identifying which locations tourists most want to navigate to. " +
        "Results are ordered by request count descending. " +
        "Tip: use regionName instead of regionId when you only know the destination name.")]
    public static async Task<IReadOnlyList<DirectionRequestSummary>> GetDirectionStats(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Optional region ID (use regionName if ID is unknown).")] uint? regionId = null,
        [Description("Region name or partial name (e.g. 'Zabljak'). Resolved automatically when regionId is not provided.")] string? regionName = null,
        [Description("Maximum number of results (default 20).")] int? limit = null)
    {
        var resolvedRegionId = await ResolveRegionId(regionId, regionName, tourismService, cancellationToken);

        return await tourismService.GetDirectionStatsAsync(
            new GetDirectionStatsRequest(resolvedRegionId, limit ?? 20),
            cancellationToken);
    }

    // ════════════════════════════════════════════════════════════════════════
    // LIČNI PODACI TURISTE (authenticated)
    // ════════════════════════════════════════════════════════════════════════

    [McpServerTool(Name = "tourism_get_my_saved", Title = "Get My Saved Locations", ReadOnly = true, Idempotent = true)]
    [Description(
        "Get the locations bookmarked/saved by the currently logged-in tourist. Requires authentication. " +
        "Returns empty list if the tourist is not logged in.")]
    public static Task<PagedResult<SavedPostSummary>> GetMySaved(
        ICurrentTouristContext currentTourist,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Maximum number of results (default 20).")] int? limit = null,
        [Description("Number of results to skip for pagination (default 0).")] int? offset = null)
    {
        if (!currentTourist.IsAuthenticated)
            return Task.FromResult(new PagedResult<SavedPostSummary>([], 0, false));

        return tourismService.GetSavedPostsAsync(
            new GetSavedPostsRequest(currentTourist.TouristId, limit ?? 20, offset ?? 0),
            cancellationToken);
    }

    [McpServerTool(Name = "tourism_get_my_planner", Title = "Get My Visit Planner", ReadOnly = true, Idempotent = true)]
    [Description(
        "Get the visit planners of the currently logged-in tourist — multi-day itineraries with locations and routes organized by day. " +
        "Requires authentication. Returns empty list if the tourist is not logged in.")]
    public static Task<IReadOnlyList<PlannerSummary>> GetMyPlanner(
        ICurrentTouristContext currentTourist,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("If true, returns only publicly shared planners (default false).")] bool? onlyPublic = null)
    {
        if (!currentTourist.IsAuthenticated)
            return Task.FromResult<IReadOnlyList<PlannerSummary>>([]);

        return tourismService.GetTouristPlannersAsync(
            new GetTouristPlannerRequest(currentTourist.TouristId!.Value, onlyPublic ?? false),
            cancellationToken);
    }

    [McpServerTool(Name = "tourism_get_my_favorites", Title = "Get My Favorite Locations and Routes", ReadOnly = true, Idempotent = true)]
    [Description(
        "Get the locations and routes marked as favorites by the currently logged-in tourist. Requires authentication. " +
        "entityType: 'post' for locations only, 'route' for routes only, omit for both. " +
        "Returns empty list if the tourist is not logged in.")]
    public static Task<PagedResult<TouristFavoriteSummary>> GetMyFavorites(
        ICurrentTouristContext currentTourist,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Optional entity type filter: 'post' for locations only, 'route' for routes only.")] string? entityType = null,
        [Description("Maximum number of results (default 20).")] int? limit = null,
        [Description("Number of results to skip for pagination (default 0).")] int? offset = null)
    {
        if (!currentTourist.IsAuthenticated)
            return Task.FromResult(new PagedResult<TouristFavoriteSummary>([], 0, false));

        return tourismService.GetTouristFavoritesAsync(
            new GetTouristFavoritesRequest(currentTourist.TouristId, entityType, limit ?? 20, offset ?? 0),
            cancellationToken);
    }

    // ════════════════════════════════════════════════════════════════════════
    // PRIVATNI HELPERI – Name Resolution
    // ════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Vraća regionId: koristi direktni ID ako je dat, inače resolve po imenu.
    /// Vraća null ako nije ni dato ni nađeno.
    /// </summary>
    private static async Task<uint?> ResolveRegionId(
        uint? regionId,
        string? regionName,
        ITourismQueryService svc,
        CancellationToken ct)
    {
        if (regionId.HasValue) return regionId.Value;
        if (string.IsNullOrWhiteSpace(regionName)) return null;
        return await svc.ResolveRegionIdAsync(regionName, ct);
    }

    /// <summary>
    /// Vraća postId: koristi direktni ID ako je dat, inače resolve po imenu.
    /// Vraća null ako nije ni dato ni nađeno.
    /// </summary>
    private static async Task<uint?> ResolvePostId(
        uint? postId,
        string? postName,
        ITourismQueryService svc,
        CancellationToken ct)
    {
        if (postId.HasValue) return postId.Value;
        if (string.IsNullOrWhiteSpace(postName)) return null;
        var result = await svc.ResolvePostAsync(postName, ct);
        return result.Found ? result.Id : null;
    }

    /// <summary>
    /// Vraća routeId: koristi direktni ID ako je dat, inače resolve po imenu.
    /// Vraća null ako nije ni dato ni nađeno.
    /// </summary>
    private static async Task<uint?> ResolveRouteId(
        uint? routeId,
        string? routeName,
        ITourismQueryService svc,
        CancellationToken ct)
    {
        if (routeId.HasValue) return routeId.Value;
        if (string.IsNullOrWhiteSpace(routeName)) return null;
        var result = await svc.ResolveRouteAsync(routeName, ct);
        return result.Found ? result.Id : null;
    }
}
