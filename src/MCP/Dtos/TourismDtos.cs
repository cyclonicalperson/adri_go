namespace Mcp.Dtos;

// ── Paginacija ────────────────────────────────────────────────────────────────

internal sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int TotalCount,
    bool HasMore);

// ── Regije ────────────────────────────────────────────────────────────────────

internal sealed record SearchRegionsRequest(
    string? Query = null,
    string? Type = null,
    string? Country = null,
    bool? HasCoordinates = null,
    int Limit = 10,
    int Offset = 0);

internal sealed record RegionSummary(
    uint Id,
    string Name,
    string Type,
    string? Description,
    string Country,
    decimal? Lat,
    decimal? Lng);

internal sealed record GetRegionSummaryRequest(uint RegionId);

internal sealed record RegionFullSummary(
    uint Id,
    string Name,
    string Type,
    string Country,
    string? Description,
    decimal? Lat,
    decimal? Lng,
    int TotalPosts,
    int TotalRoutes,
    IReadOnlyDictionary<string, int> PostsByType,
    double? AvgRating);

// ── Objekti / Lokacije ────────────────────────────────────────────────────────

internal sealed record SearchPostsRequest(
    uint? RegionId = null,
    string? Query = null,
    IReadOnlyList<string>? PostTypes = null,
    double? MinRating = null,
    double? MaxRating = null,
    double? UserLatitude = null,
    double? UserLongitude = null,
    double? RadiusKm = null,
    IReadOnlyList<string>? Tags = null,
    bool? HasExternalUrl = null,
    bool? HasOpeningHours = null,
    string? SortBy = null,
    int Limit = 10,
    int Offset = 0);

internal sealed record PostSummary(
    uint Id,
    uint? RegionId,
    string Title,
    string PostType,
    string? Description,
    string? Address,
    string? ExternalUrl,
    string? ExternalUrlLabel,
    string? OpeningHours,
    double? Rating,
    uint? ReviewCount,
    decimal? Lat,
    decimal? Lng,
    double? DistanceKm,
    IReadOnlyList<string> Tags);

internal sealed record PostDetailRequest(uint PostId);

internal sealed record PostDetail(
    uint Id,
    uint? RegionId,
    string? RegionName,
    string Title,
    string PostType,
    string? Description,
    string? Address,
    string? ExternalUrl,
    string? ExternalUrlLabel,
    string? OpeningHours,
    string? Details,
    double? Rating,
    uint ReviewCount,
    uint ViewCount,
    uint LikeCount,
    decimal? Lat,
    decimal? Lng,
    IReadOnlyList<string> Tags);

// ── Rute ──────────────────────────────────────────────────────────────────────

internal sealed record SearchRoutesRequest(
    uint? RegionId = null,
    string? Query = null,
    IReadOnlyList<string>? Difficulties = null,
    decimal? MaxDistanceKm = null,
    decimal? MinDistanceKm = null,
    int? MaxDurationMinutes = null,
    int? MinDurationMinutes = null,
    uint? MaxElevationGain = null,
    double? MinRating = null,
    string? SortBy = null,
    int Limit = 10,
    int Offset = 0);

internal sealed record RouteSummary(
    uint Id,
    uint? RegionId,
    string Name,
    string Difficulty,
    decimal? DistanceKm,
    uint? DurationMinutes,
    uint? ElevationGain,
    string? Description);

internal sealed record RouteDetailRequest(uint RouteId);

internal sealed record RouteDetail(
    uint Id,
    uint? RegionId,
    string? RegionName,
    string Name,
    string Difficulty,
    decimal? DistanceKm,
    uint? DurationMinutes,
    uint? ElevationGain,
    string? Description,
    string? Waypoints,
    string? GpxFilePath,
    uint ViewCount,
    uint SaveCount);

// ── Recenzije ─────────────────────────────────────────────────────────────────

internal sealed record GetReviewsRequest(
    uint PostId,
    bool? OnlyApproved = true,
    int? MinRating = null,
    int? MaxRating = null,
    string? SortBy = null,
    int Limit = 20,
    int Offset = 0);

internal sealed record ReviewSummary(
    uint Id,
    uint PostId,
    string? TouristName,
    int Rating,
    string? Comment,
    bool IsApproved,
    DateTime CreatedAt);

// ── Tagovi / Aktivnosti ───────────────────────────────────────────────────────

internal sealed record SearchTagsRequest(
    string? Query = null,
    string? Category = null,
    string? Difficulty = null,
    bool? HasCapacity = null,
    int Limit = 50);

internal sealed record TagSummary(
    uint Id,
    string Name,
    string? Category,
    string? Description,
    string? Difficulty,
    string? Duration,
    short? MaxCapacity,
    int PostCount);

// ── Analitika ─────────────────────────────────────────────────────────────────

internal sealed record GetPostAnalyticsRequest(
    uint? PostId = null,
    uint? RegionId = null,
    int Limit = 10);

internal sealed record PostAnalyticsSummary(
    uint PostId,
    string PostTitle,
    string PostType,
    int TotalViews,
    int UniqueViews,
    int TotalLikes,
    int TotalShares,
    double? AvgRating,
    int ReviewCount);

internal sealed record GetTopContentRequest(
    string SortBy,        // views | likes | shares | rating | review_count
    string? PostType = null,
    uint? RegionId = null,
    int Limit = 10);

// ── Turisti ───────────────────────────────────────────────────────────────────

internal sealed record GetTouristStatsRequest();

internal sealed record TouristStats(
    int Total,
    int Active,
    int EmailVerified,
    int RegisteredLast30Days,
    IReadOnlyDictionary<string, int> ByLanguage);

internal sealed record SearchTouristsRequest(
    string? Query = null,
    bool? IsActive = null,
    bool? IsEmailVerified = null,
    string? Language = null,
    int Limit = 20,
    int Offset = 0);

internal sealed record TouristSummary(
    uint Id,
    string? Name,
    string? Email,
    string Language,
    bool IsActive,
    bool IsEmailVerified,
    DateTime CreatedAt);

// ── Proximity / Preporuke ─────────────────────────────────────────────────────

internal sealed record GetNearbyRequest(
    double Latitude,
    double Longitude,
    double RadiusKm = 5.0,
    IReadOnlyList<string>? PostTypes = null,
    double? MinRating = null,
    int Limit = 10);

internal sealed record GetSimilarPostsRequest(
    uint PostId,
    int Limit = 5);