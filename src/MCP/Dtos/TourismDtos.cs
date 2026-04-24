namespace Mcp.Dtos;

// ── Postojeći ────────────────────────────────────────────────────────────────

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

// ── Recenzije ─────────────────────────────────────────────────────────────────

internal sealed record GetReviewsRequest(
    uint PostId,
    bool? OnlyApproved = true,
    int Limit = 20);

internal sealed record ReviewSummary(
    uint Id,
    uint PostId,
    string? TouristName,
    int Rating,
    string? Comment,
    bool IsApproved,
    DateTime CreatedAt);

// ── Tagovi ────────────────────────────────────────────────────────────────────

internal sealed record SearchTagsRequest(
    string? Query = null,
    string? Category = null,
    string? Difficulty = null,
    int Limit = 50);

internal sealed record TagSummary(
    uint Id,
    string Name,
    string? Category,
    string? Description,
    string? Difficulty,
    string? Duration,
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
    string SortBy,        // views | likes | shares | rating
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
    int Limit = 20);

internal sealed record TouristSummary(
    uint Id,
    string? Name,
    string? Email,
    string Language,
    bool IsActive,
    bool IsEmailVerified,
    DateTime CreatedAt);