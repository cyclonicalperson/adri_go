using Mcp.Dtos;
using Mcp.Services;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace Mcp.Tools;

[McpServerToolType]
internal static class TourismTools
{
    [McpServerTool(Name = "search_destinations", Title = "Search Destinations", ReadOnly = true, Idempotent = true)]
    [Description("Search published destinations that tourists can visit, such as cities, lakes, parks, and historic areas.")]
    public static Task<IReadOnlyList<DestinationSummary>> SearchDestinations(
        [Description("Optional free-text destination query, such as Zabljak, Durmitor, Budva, or Kotor.")] string? query,
        [Description("Optional city filter from the destination record.")] string? city,
        [Description("Optional region filter, such as Primorje, Sever, or Boka Kotorska.")] string? region,
        [Description("Optional destination types such as City, Lake, or NationalPark.")] IReadOnlyList<string>? types,
        [Description("Maximum number of results to return.")] int? limit,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.SearchDestinationsAsync(
            new SearchDestinationsRequest(query, city, region, types, limit ?? 10),
            cancellationToken);
    }

    [McpServerTool(Name = "search_routes", Title = "Search Routes", ReadOnly = true, Idempotent = true)]
    [Description("Search published tourist routes using destination, difficulty, distance, duration, and route-type filters.")]
    public static Task<IReadOnlyList<RouteSummary>> SearchRoutes(
        [Description("Optional destination identifier that scopes the route search.")] int? destinationId,
        [Description("Optional free-text route query.")] string? query,
        [Description("Optional route types such as Walking, Hiking, Cycling, or Driving.")] IReadOnlyList<string>? routeTypes,
        [Description("Optional route difficulties such as Easy, Medium, or Hard.")] IReadOnlyList<string>? difficulties,
        [Description("Optional maximum route distance in kilometers.")] decimal? maxDistanceKm,
        [Description("Optional maximum route duration in minutes.")] int? maxDurationMinutes,
        [Description("Optional maximum elevation gain in meters.")] int? maxElevationGainM,
        [Description("Optional minimum average rating filter.")] double? minRating,
        [Description("Maximum number of results to return.")] int? limit,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.SearchRoutesAsync(
            new SearchRoutesRequest(destinationId, query, routeTypes, difficulties, maxDistanceKm, maxDurationMinutes, maxElevationGainM, minRating, limit ?? 10),
            cancellationToken);
    }

    [McpServerTool(Name = "search_events", Title = "Search Events", ReadOnly = true, Idempotent = true)]
    [Description("Search published events using destination, category, date range, and text filters.")]
    public static Task<IReadOnlyList<EventSummary>> SearchEvents(
        [Description("Optional destination identifier that scopes the search.")] int? destinationId,
        [Description("Optional free-text query.")] string? query,
        [Description("Optional event categories such as Concert, Tour, Excursion, or Festival.")] IReadOnlyList<string>? categories,
        [Description("Optional lower date bound.")] DateOnly? fromDate,
        [Description("Optional upper date bound.")] DateOnly? toDate,
        [Description("Optional minimum rating filter.")] double? minRating,
        [Description("Maximum number of results to return.")] int? limit,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.SearchEventsAsync(
            new SearchEventsRequest(destinationId, query, categories, fromDate, toDate, minRating, limit ?? 10),
            cancellationToken);
    }

    [McpServerTool(Name = "search_accommodation", Title = "Search Accommodation", ReadOnly = true, Idempotent = true)]
    [Description("Search published accommodation offers using destination, stay size, price, type, amenity, and rating filters.")]
    public static Task<IReadOnlyList<AccommodationSummary>> SearchAccommodation(
        [Description("Optional destination identifier that scopes the accommodation search.")] int? destinationId,
        [Description("Optional free-text query that matches accommodation name, description, or address.")] string? query,
        [Description("Optional check-in date.")] DateOnly? checkIn,
        [Description("Optional check-out date.")] DateOnly? checkOut,
        [Description("Optional guest count.")] int? guestCount,
        [Description("Optional minimum price.")] decimal? priceMin,
        [Description("Optional maximum price.")] decimal? priceMax,
        [Description("Optional required amenities.")] IReadOnlyList<string>? amenities,
        [Description("Optional accommodation types such as Apartment, Hotel, Hostel, Villa, Camp, or GuestHouse.")] IReadOnlyList<string>? accommodationTypes,
        [Description("Optional minimum rating filter.")] double? minRating,
        [Description("Maximum number of results to return.")] int? limit,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken)
    {
        return tourismService.SearchAccommodationAsync(
            new SearchAccommodationRequest(destinationId, query, checkIn, checkOut, guestCount, priceMin, priceMax, amenities, accommodationTypes, minRating, limit ?? 10),
            cancellationToken);
    }
}
