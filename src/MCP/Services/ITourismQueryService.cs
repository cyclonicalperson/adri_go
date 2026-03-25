using Mcp.Dtos;

namespace Mcp.Services;

internal interface ITourismQueryService
{
    Task<IReadOnlyList<DestinationSummary>> SearchDestinationsAsync(SearchDestinationsRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<RouteSummary>> SearchRoutesAsync(SearchRoutesRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<EventSummary>> SearchEventsAsync(SearchEventsRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<AccommodationSummary>> SearchAccommodationAsync(SearchAccommodationRequest request, CancellationToken cancellationToken);
}
