using Mcp.Dtos;
using Mcp.Services;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace Mcp.Tools;

[McpServerToolType]
internal static class TourismTools
{
    // ── Postojeći toolovi ─────────────────────────────────────────────────────

    [McpServerTool(Name = "search_regions", Title = "Search Regions", ReadOnly = true, Idempotent = true)]
    [Description("Search tourist regions and destinations such as cities, mountains, lakes, and national parks.")]
    public static Task<IReadOnlyList<RegionSummary>> SearchRegions(
        [Description("Optional free-text query, e.g. Zabljak, Budva, Durmitor.")] string? query,
        [Description("Optional type filter: city, mountain, lake, national_park, coast, village, other.")] string? type,
        [Description("Maximum number of results.")] int? limit,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.SearchRegionsAsync(
            new SearchRegionsRequest(query, type, limit ?? 10), cancellationToken);
    }

    [McpServerTool(Name = "search_posts", Title = "Search Posts", ReadOnly = true, Idempotent = true)]
    [Description("Search published locations and points of interest. Use post_types to filter: accommodation, restaurant, club, cultural_site, monument, sports_facility, event, attraction, shop, other.")]
    public static Task<IReadOnlyList<PostSummary>> SearchPosts(
        [Description("Optional region ID to scope the search.")] uint? regionId,
        [Description("Optional free-text query matching title, description, or address.")] string? query,
        [Description("Optional post types: accommodation, restaurant, club, cultural_site, monument, sports_facility, event, attraction, shop, other.")] IReadOnlyList<string>? postTypes,
        [Description("Optional minimum average rating.")] double? minRating,
        [Description("Optional user latitude for proximity sorting.")] double? userLatitude,
        [Description("Optional user longitude for proximity sorting.")] double? userLongitude,
        [Description("Maximum number of results.")] int? limit,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.SearchPostsAsync(
            new SearchPostsRequest(regionId, query, postTypes, minRating, userLatitude, userLongitude, limit ?? 10),
            cancellationToken);
    }

    [McpServerTool(Name = "search_routes", Title = "Search Routes", ReadOnly = true, Idempotent = true)]
    [Description("Search published tourist routes by difficulty, distance, and duration.")]
    public static Task<IReadOnlyList<RouteSummary>> SearchRoutes(
        [Description("Optional region ID.")] uint? regionId,
        [Description("Optional free-text query.")] string? query,
        [Description("Optional difficulties: easy, moderate, hard, expert.")] IReadOnlyList<string>? difficulties,
        [Description("Optional maximum distance in kilometers.")] decimal? maxDistanceKm,
        [Description("Optional maximum duration in minutes.")] int? maxDurationMinutes,
        [Description("Maximum number of results.")] int? limit,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.SearchRoutesAsync(
            new SearchRoutesRequest(regionId, query, difficulties, maxDistanceKm, maxDurationMinutes, null, limit ?? 10),
            cancellationToken);
    }

    // ── Recenzije ─────────────────────────────────────────────────────────────

    [McpServerTool(Name = "get_reviews", Title = "Get Reviews", ReadOnly = true, Idempotent = true)]
    [Description("Get reviews for a specific location or point of interest by its post ID.")]
    public static Task<IReadOnlyList<ReviewSummary>> GetReviews(
        [Description("The ID of the post/location to get reviews for.")] uint postId,
        [Description("If true, returns only approved reviews. Default is true.")] bool? onlyApproved,
        [Description("Maximum number of reviews to return.")] int? limit,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.GetReviewsAsync(
            new GetReviewsRequest(postId, onlyApproved ?? true, limit ?? 20),
            cancellationToken);
    }

    // ── Tagovi ────────────────────────────────────────────────────────────────

    [McpServerTool(Name = "search_tags", Title = "Search Tags", ReadOnly = true, Idempotent = true)]
    [Description("Search available tags and activity categories. Categories include: aktivnost, amenity, stil, cijena, tip, oznaka.")]
    public static Task<IReadOnlyList<TagSummary>> SearchTags(
        [Description("Optional free-text search on tag name or description.")] string? query,
        [Description("Optional category filter: aktivnost, amenity, stil, cijena, tip, oznaka.")] string? category,
        [Description("Optional difficulty filter for activity tags: EASY, MEDIUM, HARD.")] string? difficulty,
        [Description("Maximum number of results.")] int? limit,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.SearchTagsAsync(
            new SearchTagsRequest(query, category, difficulty, limit ?? 50),
            cancellationToken);
    }

    // ── Analitika ─────────────────────────────────────────────────────────────

    [McpServerTool(Name = "get_post_analytics", Title = "Get Post Analytics", ReadOnly = true, Idempotent = true)]
    [Description("Get analytics for one or more posts: total views, unique views, likes, shares, and review count.")]
    public static Task<IReadOnlyList<PostAnalyticsSummary>> GetPostAnalytics(
        [Description("Optional specific post ID to get analytics for.")] uint? postId,
        [Description("Optional region ID to get analytics for all posts in a region.")] uint? regionId,
        [Description("Maximum number of results.")] int? limit,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.GetPostAnalyticsAsync(
            new GetPostAnalyticsRequest(postId, regionId, limit ?? 10),
            cancellationToken);
    }

    [McpServerTool(Name = "get_top_content", Title = "Get Top Content", ReadOnly = true, Idempotent = true)]
    [Description("Get the most popular locations ranked by a specific metric: views, likes, shares, or rating.")]
    public static Task<IReadOnlyList<PostAnalyticsSummary>> GetTopContent(
        [Description("Sort metric: views, likes, shares, rating.")] string sortBy,
        [Description("Optional post type filter: accommodation, restaurant, attraction, etc.")] string? postType,
        [Description("Optional region ID to narrow results.")] uint? regionId,
        [Description("Maximum number of results.")] int? limit,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.GetTopContentAsync(
            new GetTopContentRequest(sortBy, postType, regionId, limit ?? 10),
            cancellationToken);
    }

    // ── Turisti ───────────────────────────────────────────────────────────────

    [McpServerTool(Name = "get_tourist_stats", Title = "Get Tourist Stats", ReadOnly = true, Idempotent = true)]
    [Description("Get aggregate statistics about registered tourists: total count, active users, email verification rate, recent registrations, and breakdown by language.")]
    public static Task<TouristStats> GetTouristStats(
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.GetTouristStatsAsync(
            new GetTouristStatsRequest(), cancellationToken);
    }

    [McpServerTool(Name = "search_tourists", Title = "Search Tourists", ReadOnly = true, Idempotent = true)]
    [Description("Search registered tourists by name or email. Returns basic profile info without sensitive data.")]
    public static Task<IReadOnlyList<TouristSummary>> SearchTourists(
        [Description("Optional free-text search on name or email.")] string? query,
        [Description("Optional filter for active/inactive tourists.")] bool? isActive,
        [Description("Optional filter for email-verified tourists.")] bool? isEmailVerified,
        [Description("Maximum number of results.")] int? limit,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.SearchTouristsAsync(
            new SearchTouristsRequest(query, isActive, isEmailVerified, limit ?? 20),
            cancellationToken);
    }
}