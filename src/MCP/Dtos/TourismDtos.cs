namespace Mcp.Dtos;

internal sealed record SearchDestinationsRequest(
    string? Query = null,
    string? City = null,
    string? Region = null,
    IReadOnlyList<string>? Types = null,
    int Limit = 10);

internal sealed record DestinationSummary(
    int Id,
    string Name,
    string Type,
    string? City,
    string? Region,
    decimal Latitude,
    decimal Longitude,
    string Description);

internal sealed record SearchRoutesRequest(
    int? DestinationId = null,
    string? Query = null,
    IReadOnlyList<string>? RouteTypes = null,
    IReadOnlyList<string>? Difficulties = null,
    decimal? MaxDistanceKm = null,
    int? MaxDurationMinutes = null,
    int? MaxElevationGainM = null,
    double? MinRating = null,
    int Limit = 10);

internal sealed record RouteSummary(
    int Id,
    int DestinationId,
    string Name,
    string RouteType,
    string Difficulty,
    decimal DistanceKm,
    int DurationMinutes,
    int ElevationGainMeters,
    double? Rating,
    string Description);

internal sealed record SearchEventsRequest(
    int? DestinationId = null,
    string? Query = null,
    IReadOnlyList<string>? Categories = null,
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    double? MinRating = null,
    int Limit = 10);

internal sealed record EventSummary(
    int Id,
    int? DestinationId,
    string Name,
    string Category,
    string? VenueName,
    DateTime StartAt,
    DateTime EndAt,
    string Description,
    string? TicketUrl,
    decimal Latitude,
    decimal Longitude,
    double? Rating);

internal sealed record SearchAccommodationRequest(
    int? DestinationId = null,
    string? Query = null,
    DateOnly? CheckIn = null,
    DateOnly? CheckOut = null,
    int? GuestCount = null,
    decimal? PriceMin = null,
    decimal? PriceMax = null,
    IReadOnlyList<string>? Amenities = null,
    IReadOnlyList<string>? AccommodationTypes = null,
    double? MinRating = null,
    int Limit = 10);

internal sealed record AccommodationSummary(
    int Id,
    int DestinationId,
    string Name,
    string AccommodationType,
    string? Address,
    decimal PricePerNight,
    string Currency,
    int GuestCapacity,
    double? Rating,
    IReadOnlyList<string> Amenities,
    string Description,
    string? BookingUrl,
    string? AirbnbUrl);
