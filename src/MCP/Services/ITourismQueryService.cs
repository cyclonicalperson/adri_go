using Mcp.Dtos;

namespace Mcp.Services;

internal interface ITourismQueryService
{
    Task<IReadOnlyList<RegionSummary>> SearchRegionsAsync(SearchRegionsRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<PostSummary>> SearchPostsAsync(SearchPostsRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<RouteSummary>> SearchRoutesAsync(SearchRoutesRequest request, CancellationToken cancellationToken);
}