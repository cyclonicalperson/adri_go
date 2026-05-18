using TouristGuide.Ai.Contracts;

namespace TouristGuide.Api.Services.Ai;

public interface IAiTourismQueryService
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

    // ── Turisti ───────────────────────────────────────────────────────────────

    // ── Proximity / Preporuke ─────────────────────────────────────────────────
    Task<IReadOnlyList<PostSummary>> GetNearbyAsync(GetNearbyRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<PostSummary>> GetSimilarPostsAsync(GetSimilarPostsRequest request, CancellationToken cancellationToken);

    // ── Događaji ──────────────────────────────────────────────────────────────
    Task<PagedResult<EventSummary>> SearchEventsAsync(SearchEventsRequest request, CancellationToken cancellationToken);

    // ── Personalizovane preporuke ──────────────────────────────────────────────
    Task<IReadOnlyList<RecommendationItem>> GetRecommendationsAsync(GetRecommendationsRequest request, CancellationToken cancellationToken);

    // ── Recenzije ruta ────────────────────────────────────────────────────────────
    Task<PagedResult<ReviewSummary>> GetRouteReviewsAsync(GetRouteReviewsRequest request, CancellationToken cancellationToken);

    // ── Analitika regija ─────────────────────────────────────────────────────────

    // ── Novi sadržaj ─────────────────────────────────────────────────────────────
    Task<IReadOnlyList<NewContentItem>> GetNewContentAsync(GetNewContentRequest request, CancellationToken cancellationToken);

    // ── Trend poseta ─────────────────────────────────────────────────────────────
    Task<IReadOnlyList<VisitTrendPoint>> GetVisitTrendsAsync(GetVisitTrendsRequest request, CancellationToken cancellationToken);

    // ── Sačuvane lokacije ─────────────────────────────────────────────────────────
    Task<PagedResult<SavedPostSummary>> GetSavedPostsAsync(GetSavedPostsRequest request, CancellationToken cancellationToken);

    // ── Planeri putovanja ─────────────────────────────────────────────────────────
    Task<IReadOnlyList<PlannerSummary>> GetTouristPlannersAsync(GetTouristPlannerRequest request, CancellationToken cancellationToken);

    // ── Aktivnosti ──────────────────────────────────────────────────────────────
    Task<IReadOnlyList<TagSummary>> SearchActivitiesAsync(SearchActivitiesRequest request, CancellationToken cancellationToken);

    // ── Omiljene lokacije i rute ──────────────────────────────────────────────
    Task<PagedResult<TouristFavoriteSummary>> GetTouristFavoritesAsync(GetTouristFavoritesRequest request, CancellationToken cancellationToken);

    // ── Analytics: external klikovi ─────────────────────────────────────────────
    Task<IReadOnlyList<ExternalClickSummary>> GetExternalClickStatsAsync(GetExternalClickStatsRequest request, CancellationToken cancellationToken);

    // ── Analytics: zahtevi za pravac ─────────────────────────────────────────
    Task<IReadOnlyList<DirectionRequestSummary>> GetDirectionStatsAsync(GetDirectionStatsRequest request, CancellationToken cancellationToken);

    // ── Top sadržaj (postovi + rute objedinjeno) ─────────────────────────────────
    Task<IReadOnlyList<TopContentItem>> GetTopContentUnifiedAsync(GetTopContentUnifiedRequest request, CancellationToken cancellationToken);

    // ── Name-resolution helperi (interno — koriste se u Tool sloju) ────────────────
    /// <summary>Traži prvu aktivnu regiju čije ime sadrži zadati string (case-insensitive).</summary>
    Task<uint?> ResolveRegionIdAsync(string regionName, CancellationToken cancellationToken);

    /// <summary>Traži prvi objavljeni post čiji naslov sadrži zadati string (case-insensitive).</summary>
    Task<ResolveEntityResult> ResolvePostAsync(string postName, CancellationToken cancellationToken);

    /// <summary>Traži prvu objavljenu rutu čiji naziv sadrži zadati string (case-insensitive).</summary>
    Task<ResolveEntityResult> ResolveRouteAsync(string routeName, CancellationToken cancellationToken);
}
