using Mcp.Dtos;

namespace Mcp.Services;

internal interface ITourismQueryService
{
    // ── Regije ────────────────────────────────────────────────────────────────
    Task<PagedResult<RegionSummary>> SearchRegionsAsync(SearchRegionsRequest request, CancellationToken cancellationToken);
    Task<RegionFullSummary?> GetRegionSummaryAsync(GetRegionSummaryRequest request, CancellationToken cancellationToken);

    // ── Objekti ───────────────────────────────────────────────────────────────
    Task<PagedResult<PostSummary>> SearchPostsAsync(SearchPostsRequest request, CancellationToken cancellationToken);
    Task<PostDetail?> GetPostDetailAsync(PostDetailRequest request, CancellationToken cancellationToken);

    // ── Rute ──────────────────────────────────────────────────────────────────
    Task<PagedResult<RouteSummary>> SearchRoutesAsync(SearchRoutesRequest request, CancellationToken cancellationToken);
    Task<RouteDetail?> GetRouteDetailAsync(RouteDetailRequest request, CancellationToken cancellationToken);

    // ── Recenzije ─────────────────────────────────────────────────────────────
    Task<PagedResult<ReviewSummary>> GetReviewsAsync(GetReviewsRequest request, CancellationToken cancellationToken);

    // ── Tagovi ────────────────────────────────────────────────────────────────
    Task<IReadOnlyList<TagSummary>> SearchTagsAsync(SearchTagsRequest request, CancellationToken cancellationToken);

    // ── Analitika ─────────────────────────────────────────────────────────────
    Task<IReadOnlyList<PostAnalyticsSummary>> GetPostAnalyticsAsync(GetPostAnalyticsRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<PostAnalyticsSummary>> GetTopContentAsync(GetTopContentRequest request, CancellationToken cancellationToken);

    // ── Turisti ───────────────────────────────────────────────────────────────
    Task<TouristStats> GetTouristStatsAsync(GetTouristStatsRequest request, CancellationToken cancellationToken);
    Task<PagedResult<TouristSummary>> SearchTouristsAsync(SearchTouristsRequest request, CancellationToken cancellationToken);

    // ── Proximity / Preporuke ─────────────────────────────────────────────────
    Task<IReadOnlyList<PostSummary>> GetNearbyAsync(GetNearbyRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<PostSummary>> GetSimilarPostsAsync(GetSimilarPostsRequest request, CancellationToken cancellationToken);
}