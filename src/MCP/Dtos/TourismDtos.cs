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
    uint? PostId,
    uint? RouteId,
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

// ── Događaji ──────────────────────────────────────────────────────────────────

internal sealed record SearchEventsRequest(
    uint? RegionId = null,
    string? Query = null,
    DateTime? StartFrom = null,
    DateTime? StartTo = null,
    string? Category = null,
    bool? HasTicketUrl = null,
    string? SortBy = null,
    int Limit = 10,
    int Offset = 0);

internal sealed record EventSummary(
    uint Id,
    uint? RegionId,
    string Title,
    string? Description,
    string? Address,
    decimal? Lat,
    decimal? Lng,
    DateTime? StartAt,
    DateTime? EndAt,
    string Category,
    string? TicketUrl,
    double? AvgRating,
    IReadOnlyList<string> Tags);

// ── Preporuke ─────────────────────────────────────────────────────────────────

internal sealed record GetRecommendationsRequest(
    uint RegionId,
    uint? TouristId = null,
    string ContextMode = "onsite",
    int Limit = 10);

internal sealed record RecommendationItem(
    uint EntityId,
    string EntityType,
    string Title,
    string PostType,
    uint? RegionId,
    string? RegionName,
    double Score,
    string Reason,
    IReadOnlyList<string> MatchedTags);

// ── Recenzije ruta ────────────────────────────────────────────────────────────

internal sealed record GetRouteReviewsRequest(
    uint RouteId,
    bool? OnlyApproved = true,
    int? MinRating = null,
    int? MaxRating = null,
    string? SortBy = null,
    int Limit = 20,
    int Offset = 0);

// ── Analitika regija ─────────────────────────────────────────────────────────

internal sealed record GetRegionAnalyticsRequest(uint RegionId);

internal sealed record RegionAnalyticsSummary(
    uint RegionId,
    string RegionName,
    string RegionType,
    int TotalPosts,
    int TotalRoutes,
    int TotalViews,
    int TotalLikes,
    int TotalShares,
    double? AvgRating,
    IReadOnlyDictionary<string, int> PostsByType);

// ── Novi sadržaj ─────────────────────────────────────────────────────────────

internal sealed record GetNewContentRequest(
    uint? RegionId = null,
    int DaysBack = 30,
    int Limit = 20);

internal sealed record NewContentItem(
    uint EntityId,
    string EntityType,
    string Title,
    string? PostType,
    uint? RegionId,
    string? RegionName,
    DateTime PublishedAt,
    double? Rating);

// ── Trend poseta ─────────────────────────────────────────────────────────────

internal sealed record GetVisitTrendsRequest(
    uint? RegionId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null,
    string Granularity = "day");

internal sealed record VisitTrendPoint(
    string Date,
    int VisitCount);

// ── Sačuvane lokacije ─────────────────────────────────────────────────────────

internal sealed record GetSavedPostsRequest(
    uint? TouristId = null,
    int Limit = 20,
    int Offset = 0);

internal sealed record SavedPostSummary(
    uint SaveId,
    uint PostId,
    uint TouristId,
    string PostTitle,
    string PostType,
    uint? RegionId,
    double? Rating,
    DateTime SavedAt);

// ── Planeri putovanja ─────────────────────────────────────────────────────────

internal sealed record GetTouristPlannerRequest(
    uint TouristId,
    bool OnlyPublic = false);

// ── Aktivnosti sa kapacitetom ────────────────────────────────────────────────────────

internal sealed record SearchActivitiesRequest(
    string? Query = null,
    string? Category = null,
    string? Difficulty = null,
    int? MinCapacity = null,
    int? MaxCapacity = null,
    int Limit = 50);

// ── Omiljene lokacije i rute (TouristFavorite) ────────────────────────────────

internal sealed record GetTouristFavoritesRequest(
    uint? TouristId = null,
    string? EntityType = null,
    int Limit = 20,
    int Offset = 0);

internal sealed record TouristFavoriteSummary(
    uint Id,
    uint TouristId,
    string EntityType,
    uint? PostId,
    uint? RouteId,
    string? Title,
    string? PostType,
    uint? RegionId,
    DateTime SavedAt);

// ── Analitika klikova na external URL ──────────────────────────────────────

internal sealed record GetExternalClickStatsRequest(
    uint? PostId = null,
    uint? RegionId = null,
    int Limit = 20);

internal sealed record ExternalClickSummary(
    uint PostId,
    string PostTitle,
    string PostType,
    uint? RegionId,
    string? ExternalUrl,
    int TotalClicks);

// ── Analitika zahteva za pravac ──────────────────────────────────────────

internal sealed record GetDirectionStatsRequest(
    uint? RegionId = null,
    int Limit = 20);

internal sealed record DirectionRequestSummary(
    uint PostId,
    string PostTitle,
    string PostType,
    uint? RegionId,
    decimal? Lat,
    decimal? Lng,
    int TotalRequests);

internal sealed record PlannerSummary(
    uint Id,
    uint TouristId,
    string Title,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string? Notes,
    bool IsPublic,
    IReadOnlyList<PlannerDaySummary> Days);

internal sealed record PlannerDaySummary(
    byte DayNumber,
    IReadOnlyList<PlannerItemSummary> Items);

internal sealed record PlannerItemSummary(
    uint Id,
    byte DayNumber,
    byte OrderInDay,
    string EntityType,
    uint? PostId,
    uint? RouteId,
    string? Title,
    string? Notes,
    TimeOnly? ScheduledTime);