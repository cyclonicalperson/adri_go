using Mcp.Dtos;

namespace Mcp.Services;

internal interface ITourismQueryService
{
    // Postojeće
    Task<IReadOnlyList<RegionSummary>> SearchRegionsAsync(SearchRegionsRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<PostSummary>> SearchPostsAsync(SearchPostsRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<RouteSummary>> SearchRoutesAsync(SearchRoutesRequest request, CancellationToken cancellationToken);

    // Recenzije
    Task<IReadOnlyList<ReviewSummary>> GetReviewsAsync(GetReviewsRequest request, CancellationToken cancellationToken);

    // Tagovi
    Task<IReadOnlyList<TagSummary>> SearchTagsAsync(SearchTagsRequest request, CancellationToken cancellationToken);

    // Analitika
    Task<IReadOnlyList<PostAnalyticsSummary>> GetPostAnalyticsAsync(GetPostAnalyticsRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<PostAnalyticsSummary>> GetTopContentAsync(GetTopContentRequest request, CancellationToken cancellationToken);

    // Turisti
    Task<TouristStats> GetTouristStatsAsync(GetTouristStatsRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<TouristSummary>> SearchTouristsAsync(SearchTouristsRequest request, CancellationToken cancellationToken);
}