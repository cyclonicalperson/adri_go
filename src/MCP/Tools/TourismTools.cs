using Mcp.Dtos;
using Mcp.Services;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace Mcp.Tools;

[McpServerToolType]
internal static class TourismTools
{
    // ── Regije ────────────────────────────────────────────────────────────────

    [McpServerTool(Name = "tourism_search_regions", Title = "Search Regions", ReadOnly = true, Idempotent = true)]
    [Description("Search tourist regions and destinations such as cities, mountains, lakes, and national parks. Returns paged results with total count.")]
    public static Task<PagedResult<RegionSummary>> SearchRegions(
        [Description("Optional free-text query, e.g. Zabljak, Budva, Durmitor.")] string? query,
        [Description("Optional type filter: city, mountain, lake, national_park, coast, village, other.")] string? type,
        [Description("Optional country filter, e.g. Montenegro.")] string? country,
        [Description("If true, returns only regions with GPS coordinates.")] bool? hasCoordinates,
        [Description("Maximum number of results (default 10).")] int? limit,
        [Description("Number of results to skip for pagination (default 0).")] int? offset,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.SearchRegionsAsync(
            new SearchRegionsRequest(query, type, country, hasCoordinates, limit ?? 10, offset ?? 0),
            cancellationToken);
    }

    [McpServerTool(Name = "tourism_get_region_summary", Title = "Get Region Summary", ReadOnly = true, Idempotent = true)]
    [Description("""
        Get a full overview of a specific region including total post count, total route count,
        average rating, and breakdown of posts by type (accommodation, restaurant, etc.).
        Use this when the user asks 'what does region X offer' or 'tell me about destination Y'.
        Requires a region ID — use tourism_search_regions first if you don't have one.
        """)]
    public static Task<RegionFullSummary?> GetRegionSummary(
        [Description("The ID of the region to summarize.")] uint regionId,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.GetRegionSummaryAsync(new GetRegionSummaryRequest(regionId), cancellationToken);
    }

    // ── Objekti / Lokacije ────────────────────────────────────────────────────

    [McpServerTool(Name = "tourism_search_posts", Title = "Search Locations", ReadOnly = true, Idempotent = true)]
    [Description("""
        Search published locations and points of interest. Returns paged results with total count.
        Post types: accommodation, restaurant, club, cultural_site, monument, sports_facility, event, attraction, shop, other.
        Use tags[] to filter by activity or amenity (e.g. 'hiking', 'wifi', 'pool').
        Provide userLatitude + userLongitude + radiusKm to restrict results by proximity.
        SortBy options: rating (default), distance (requires coordinates), title.
        Workflow: for detailed info on a result, call tourism_get_post_detail with the returned ID.
        """)]
    public static Task<PagedResult<PostSummary>> SearchPosts(
        [Description("Optional region ID to scope the search.")] uint? regionId,
        [Description("Optional free-text query matching title, description, or address.")] string? query,
        [Description("Optional post type list: accommodation, restaurant, club, cultural_site, monument, sports_facility, event, attraction, shop, other.")] IReadOnlyList<string>? postTypes,
        [Description("Optional minimum average rating (0–5).")] double? minRating,
        [Description("Optional maximum average rating (0–5).")] double? maxRating,
        [Description("Optional tag names to filter by (e.g. 'hiking', 'pool', 'family_friendly').")] IReadOnlyList<string>? tags,
        [Description("If true, only returns locations that have an external booking/info URL.")] bool? hasExternalUrl,
        [Description("If true, only returns locations with opening hours defined.")] bool? hasOpeningHours,
        [Description("User latitude for proximity sorting and radius filtering.")] double? userLatitude,
        [Description("User longitude for proximity sorting and radius filtering.")] double? userLongitude,
        [Description("Only return results within this many km from the user location.")] double? radiusKm,
        [Description("Sort order: rating, distance, title.")] string? sortBy,
        [Description("Maximum number of results (default 10).")] int? limit,
        [Description("Number of results to skip for pagination (default 0).")] int? offset,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.SearchPostsAsync(
            new SearchPostsRequest(regionId, query, postTypes, minRating, maxRating,
                userLatitude, userLongitude, radiusKm, tags,
                hasExternalUrl, hasOpeningHours, sortBy, limit ?? 10, offset ?? 0),
            cancellationToken);
    }

    [McpServerTool(Name = "tourism_get_post_detail", Title = "Get Location Detail", ReadOnly = true, Idempotent = true)]
    [Description("""
        Get full details for a specific location by ID: description, opening hours, rating,
        view count, likes, review count, all tags, and external booking URL.
        Use after tourism_search_posts when the user wants more information about a specific result.
        """)]
    public static Task<PostDetail?> GetPostDetail(
        [Description("The ID of the location to retrieve (from tourism_search_posts results).")] uint postId,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.GetPostDetailAsync(new PostDetailRequest(postId), cancellationToken);
    }

    // ── Rute ──────────────────────────────────────────────────────────────────

    [McpServerTool(Name = "tourism_search_routes", Title = "Search Routes", ReadOnly = true, Idempotent = true)]
    [Description("""
        Search published tourist routes (hiking, cycling, walking...). Returns paged results with total count.
        Difficulty levels: easy, moderate, hard, expert.
        SortBy options: distance_asc, distance_desc, duration_asc, duration_desc, elevation_asc, elevation_desc.
        Use maxElevationGain to find flat routes suitable for beginners or families.
        Workflow: for full route info (waypoints, GPX), call tourism_get_route_detail with the returned ID.
        """)]
    public static Task<PagedResult<RouteSummary>> SearchRoutes(
        [Description("Optional region ID.")] uint? regionId,
        [Description("Optional free-text query matching route name or description.")] string? query,
        [Description("Optional difficulty list: easy, moderate, hard, expert.")] IReadOnlyList<string>? difficulties,
        [Description("Optional maximum route distance in kilometers.")] decimal? maxDistanceKm,
        [Description("Optional minimum route distance in kilometers.")] decimal? minDistanceKm,
        [Description("Optional maximum duration in minutes.")] int? maxDurationMinutes,
        [Description("Optional minimum duration in minutes.")] int? minDurationMinutes,
        [Description("Optional maximum elevation gain in meters — use to find flat routes.")] uint? maxElevationGain,
        [Description("Sort order: distance_asc, distance_desc, duration_asc, duration_desc, elevation_asc, elevation_desc.")] string? sortBy,
        [Description("Maximum number of results (default 10).")] int? limit,
        [Description("Number of results to skip for pagination (default 0).")] int? offset,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.SearchRoutesAsync(
            new SearchRoutesRequest(regionId, query, difficulties,
                maxDistanceKm, minDistanceKm,
                maxDurationMinutes, minDurationMinutes,
                maxElevationGain, null, sortBy, limit ?? 10, offset ?? 0),
            cancellationToken);
    }

    [McpServerTool(Name = "tourism_get_route_detail", Title = "Get Route Detail", ReadOnly = true, Idempotent = true)]
    [Description("""
        Get full details for a specific route by ID: waypoints, GPX file path, view count, and save count.
        Use after tourism_search_routes when the user wants more information about a specific route.
        """)]
    public static Task<RouteDetail?> GetRouteDetail(
        [Description("The ID of the route to retrieve (from tourism_search_routes results).")] uint routeId,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.GetRouteDetailAsync(new RouteDetailRequest(routeId), cancellationToken);
    }

    // ── Recenzije ─────────────────────────────────────────────────────────────

    [McpServerTool(Name = "tourism_get_reviews", Title = "Get Location Reviews", ReadOnly = true, Idempotent = true)]
    [Description("Get visitor reviews for a specific location by post ID. Returns paged results. Filter by rating range or sort by date or rating to understand visitor experiences.")]
    public static Task<PagedResult<ReviewSummary>> GetReviews(
        [Description("The ID of the location to get reviews for (from tourism_search_posts results).")] uint postId,
        [Description("If true, returns only approved reviews (default true).")] bool? onlyApproved,
        [Description("Optional minimum rating filter (1–5).")] int? minRating,
        [Description("Optional maximum rating filter (1–5).")] int? maxRating,
        [Description("Sort order: rating_asc, rating_desc, or newest (default).")] string? sortBy,
        [Description("Maximum number of results (default 20).")] int? limit,
        [Description("Number of results to skip for pagination (default 0).")] int? offset,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.GetReviewsAsync(
            new GetReviewsRequest(postId, onlyApproved ?? true, minRating, maxRating, sortBy, limit ?? 20, offset ?? 0),
            cancellationToken);
    }

    // ── Tagovi / Aktivnosti ───────────────────────────────────────────────────

    [McpServerTool(Name = "tourism_search_tags", Title = "Search Tags and Activities", ReadOnly = true, Idempotent = true)]
    [Description("""
        Search available tags and activity categories.
        Useful to discover what activities or amenities exist before filtering tourism_search_posts.
        Categories: aktivnost (activity), amenity, stil (style), cijena (price), tip (type), oznaka (label).
        Difficulty (for activities only): EASY, MEDIUM, HARD.
        """)]
    public static Task<IReadOnlyList<TagSummary>> SearchTags(
        [Description("Optional free-text search on tag name or description.")] string? query,
        [Description("Optional category filter: aktivnost, amenity, stil, cijena, tip, oznaka.")] string? category,
        [Description("Optional difficulty filter for activity tags: EASY, MEDIUM, HARD.")] string? difficulty,
        [Description("If true, only returns activity tags with a defined max capacity.")] bool? hasCapacity,
        [Description("Maximum number of results (default 50).")] int? limit,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.SearchTagsAsync(
            new SearchTagsRequest(query, category, difficulty, hasCapacity, limit ?? 50),
            cancellationToken);
    }

    // ── Proximity / Preporuke ─────────────────────────────────────────────────

    [McpServerTool(Name = "tourism_get_nearby", Title = "Get Nearby Locations", ReadOnly = true, Idempotent = true)]
    [Description("""
        Find locations near a specific GPS coordinate within a given radius.
        Results are sorted by distance (closest first).
        Ideal for: 'what is near me', 'what can I visit near this hotel', 'restaurants within 2km'.
        """)]
    public static Task<IReadOnlyList<PostSummary>> GetNearby(
        [Description("Latitude of the center point.")] double latitude,
        [Description("Longitude of the center point.")] double longitude,
        [Description("Search radius in kilometers (default 5).")] double? radiusKm,
        [Description("Optional post type filter: accommodation, restaurant, attraction, etc.")] IReadOnlyList<string>? postTypes,
        [Description("Optional minimum rating filter.")] double? minRating,
        [Description("Maximum number of results (default 10).")] int? limit,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.GetNearbyAsync(
            new GetNearbyRequest(latitude, longitude, radiusKm ?? 5.0, postTypes, minRating, limit ?? 10),
            cancellationToken);
    }

    [McpServerTool(Name = "tourism_get_similar_posts", Title = "Get Similar Locations", ReadOnly = true, Idempotent = true)]
    [Description("""
        Get locations similar to a given location, matched by shared tags, same type, and same region.
        Ranked by number of shared tags, then by rating.
        Use for: 'show me more like this', 'are there alternatives', 'similar accommodation'.
        """)]
    public static Task<IReadOnlyList<PostSummary>> GetSimilarPosts(
        [Description("The ID of the reference location (from tourism_search_posts results).")] uint postId,
        [Description("Maximum number of similar results (default 5).")] int? limit,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.GetSimilarPostsAsync(
            new GetSimilarPostsRequest(postId, limit ?? 5),
            cancellationToken);
    }

    // ── Analitika ─────────────────────────────────────────────────────────────

    [McpServerTool(Name = "tourism_get_post_analytics", Title = "Get Location Analytics", ReadOnly = true, Idempotent = true)]
    [Description("Get engagement analytics for one or more locations: total views, unique views, likes, shares, and review count. Use for questions about popularity or engagement.")]
    public static Task<IReadOnlyList<PostAnalyticsSummary>> GetPostAnalytics(
        [Description("Optional specific post ID to get analytics for.")] uint? postId,
        [Description("Optional region ID to get analytics for all posts in a region.")] uint? regionId,
        [Description("Maximum number of results (default 10).")] int? limit,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.GetPostAnalyticsAsync(
            new GetPostAnalyticsRequest(postId, regionId, limit ?? 10),
            cancellationToken);
    }

    [McpServerTool(Name = "tourism_get_top_content", Title = "Get Top / Most Popular Locations", ReadOnly = true, Idempotent = true)]
    [Description("""
        Get the most popular locations ranked by a specific metric.
        SortBy values: views (default), likes, shares, rating, review_count.
        Use for: 'most visited restaurants', 'top rated attractions in region X', 'what do tourists like most'.
        """)]
    public static Task<IReadOnlyList<PostAnalyticsSummary>> GetTopContent(
        [Description("Sort metric: views, likes, shares, rating, review_count.")] string sortBy,
        [Description("Optional post type filter: accommodation, restaurant, attraction, etc.")] string? postType,
        [Description("Optional region ID to narrow results.")] uint? regionId,
        [Description("Maximum number of results (default 10).")] int? limit,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.GetTopContentAsync(
            new GetTopContentRequest(sortBy, postType, regionId, limit ?? 10),
            cancellationToken);
    }

    // ── Turisti ───────────────────────────────────────────────────────────────

    [McpServerTool(Name = "tourism_get_tourist_stats", Title = "Get Tourist Statistics", ReadOnly = true, Idempotent = true)]
    [Description("Get aggregate statistics about registered tourists: total count, active users, email verification rate, new registrations in last 30 days, and breakdown by language.")]
    public static Task<TouristStats> GetTouristStats(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.GetTouristStatsAsync(new GetTouristStatsRequest(), cancellationToken);
    }

    [McpServerTool(Name = "tourism_search_tourists", Title = "Search Tourists", ReadOnly = true, Idempotent = true)]
    [Description("Search registered tourists by name, email, or language. Returns paged results with basic profile info (no sensitive data). Filter by active status or email verification.")]
    public static Task<PagedResult<TouristSummary>> SearchTourists(
        [Description("Optional free-text search on name or email.")] string? query,
        [Description("Optional filter for active/inactive tourists.")] bool? isActive,
        [Description("Optional filter for email-verified tourists.")] bool? isEmailVerified,
        [Description("Optional language filter, e.g. 'en', 'sr', 'de'.")] string? language,
        [Description("Maximum number of results (default 20).")] int? limit,
        [Description("Number of results to skip for pagination (default 0).")] int? offset,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.SearchTouristsAsync(
            new SearchTouristsRequest(query, isActive, isEmailVerified, language, limit ?? 20, offset ?? 0),
            cancellationToken);
    }
}