using Mcp.Dtos;
using Mcp.Services;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace Mcp.Tools;

[McpServerToolType]
internal static class TourismTools
{
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
}