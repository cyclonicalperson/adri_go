namespace Mcp.Dtos;

internal sealed record SearchRegionsRequest(
    string? Query = null,
    string? Type = null,
    int Limit = 10);

internal sealed record RegionSummary(
    uint Id,
    string Name,
    string Type,
    string? Description,
    string Country,
    decimal? Lat,
    decimal? Lng);

internal sealed record SearchPostsRequest(
    uint? RegionId = null,
    string? Query = null,
    IReadOnlyList<string>? PostTypes = null,
    double? MinRating = null,
    double? UserLatitude = null,
    double? UserLongitude = null,
    int Limit = 10);

internal sealed record PostSummary(
    uint Id,
    uint? RegionId,
    string Title,
    string PostType,
    string? Description,
    string? Address,
    string? ExternalUrl,
    string? OpeningHours,
    double? Rating,
    decimal? Lat,
    decimal? Lng,
    double? DistanceKm,
    IReadOnlyList<string> Tags);

internal sealed record SearchRoutesRequest(
    uint? RegionId = null,
    string? Query = null,
    IReadOnlyList<string>? Difficulties = null,
    decimal? MaxDistanceKm = null,
    int? MaxDurationMinutes = null,
    double? MinRating = null,
    int Limit = 10);

internal sealed record RouteSummary(
    uint Id,
    uint? RegionId,
    string Name,
    string Difficulty,
    decimal? DistanceKm,
    uint? DurationMinutes,
    uint? ElevationGain,
    string? Description);