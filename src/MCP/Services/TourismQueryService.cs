using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using TouristGuide.Ai.Contracts;

namespace Mcp.Services;

internal sealed class TourismQueryService : ITourismQueryService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ICurrentTouristContext _currentTourist;
    private readonly ILogger<TourismQueryService> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public TourismQueryService(
        IHttpClientFactory httpClientFactory,
        ICurrentTouristContext currentTourist,
        ILogger<TourismQueryService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _currentTourist = currentTourist;
        _logger = logger;
    }

    public Task<PagedResult<RegionSummary>> SearchRegionsAsync(SearchRegionsRequest request, CancellationToken cancellationToken) =>
        PostAsync<PagedResult<RegionSummary>>("api/ai/search-regions", request, cancellationToken);

    public Task<RegionFullSummary?> GetRegionSummaryAsync(GetRegionSummaryRequest request, CancellationToken cancellationToken) =>
        PostAsync<RegionFullSummary?>("api/ai/get-region-summary", request, cancellationToken);

    public Task<PagedResult<PostSummary>> SearchPostsAsync(SearchPostsRequest request, CancellationToken cancellationToken) =>
        PostAsync<PagedResult<PostSummary>>("api/ai/search-posts", request, cancellationToken);

    public Task<PostDetail?> GetPostDetailAsync(PostDetailRequest request, CancellationToken cancellationToken) =>
        PostAsync<PostDetail?>("api/ai/get-post-detail", request, cancellationToken);

    public Task<PagedResult<RouteSummary>> SearchRoutesAsync(SearchRoutesRequest request, CancellationToken cancellationToken) =>
        PostAsync<PagedResult<RouteSummary>>("api/ai/search-routes", request, cancellationToken);

    public Task<RouteDetail?> GetRouteDetailAsync(RouteDetailRequest request, CancellationToken cancellationToken) =>
        PostAsync<RouteDetail?>("api/ai/get-route-detail", request, cancellationToken);

    public Task<PagedResult<ReviewSummary>> GetReviewsAsync(GetReviewsRequest request, CancellationToken cancellationToken) =>
        PostAsync<PagedResult<ReviewSummary>>("api/ai/get-reviews", request, cancellationToken);

    public Task<PagedResult<ReviewSummary>> GetRouteReviewsAsync(GetRouteReviewsRequest request, CancellationToken cancellationToken) =>
        PostAsync<PagedResult<ReviewSummary>>("api/ai/get-route-reviews", request, cancellationToken);

    public Task<IReadOnlyList<TagSummary>> SearchTagsAsync(SearchTagsRequest request, CancellationToken cancellationToken) =>
        PostAsync<IReadOnlyList<TagSummary>>("api/ai/search-tags", request, cancellationToken);





    public Task<PagedResult<PostSummary>> GetNearbyAsync(GetNearbyRequest request, CancellationToken cancellationToken) =>
        PostAsync<PagedResult<PostSummary>>("api/ai/get-nearby", request, cancellationToken);

    public Task<IReadOnlyList<PostSummary>> GetSimilarPostsAsync(GetSimilarPostsRequest request, CancellationToken cancellationToken) =>
        PostAsync<IReadOnlyList<PostSummary>>("api/ai/get-similar-posts", request, cancellationToken);

    public Task<PagedResult<EventSummary>> SearchEventsAsync(SearchEventsRequest request, CancellationToken cancellationToken) =>
        PostAsync<PagedResult<EventSummary>>("api/ai/search-events", request, cancellationToken);

    public Task<PagedResult<RecommendationItem>> GetRecommendationsAsync(GetRecommendationsRequest request, CancellationToken cancellationToken)
    {
        var securedRequest = request with { TouristId = null };
        return PostAsync<PagedResult<RecommendationItem>>("api/ai/get-recommendations", securedRequest, cancellationToken);
    }


    public Task<PagedResult<NewContentItem>> GetNewContentAsync(GetNewContentRequest request, CancellationToken cancellationToken) =>
        PostAsync<PagedResult<NewContentItem>>("api/ai/get-new-content", request, cancellationToken);

    public Task<IReadOnlyList<VisitTrendPoint>> GetVisitTrendsAsync(GetVisitTrendsRequest request, CancellationToken cancellationToken) =>
        PostAsync<IReadOnlyList<VisitTrendPoint>>("api/ai/get-visit-trends", request, cancellationToken);

    public Task<PagedResult<SavedPostSummary>> GetSavedPostsAsync(GetSavedPostsRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_currentTourist.BearerToken))
            return Task.FromResult(new PagedResult<SavedPostSummary>([], 0, false));
        var securedRequest = request with { TouristId = null };
        return PostAsync<PagedResult<SavedPostSummary>>("api/ai/get-my-saved", securedRequest, cancellationToken);
    }

    public Task<IReadOnlyList<PlannerSummary>> GetTouristPlannersAsync(GetTouristPlannerRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_currentTourist.BearerToken))
            return Task.FromResult<IReadOnlyList<PlannerSummary>>([]);
        var securedRequest = request with { TouristId = null };
        return PostAsync<IReadOnlyList<PlannerSummary>>("api/ai/get-my-planner", securedRequest, cancellationToken);
    }

    public Task<IReadOnlyList<TagSummary>> SearchActivitiesAsync(SearchActivitiesRequest request, CancellationToken cancellationToken) =>
        PostAsync<IReadOnlyList<TagSummary>>("api/ai/search-activities", request, cancellationToken);

    public Task<PagedResult<TouristFavoriteSummary>> GetTouristFavoritesAsync(GetTouristFavoritesRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_currentTourist.BearerToken))
            return Task.FromResult(new PagedResult<TouristFavoriteSummary>([], 0, false));
        var securedRequest = request with { TouristId = null };
        return PostAsync<PagedResult<TouristFavoriteSummary>>("api/ai/get-my-favorites", securedRequest, cancellationToken);
    }

    public Task<IReadOnlyList<ExternalClickSummary>> GetExternalClickStatsAsync(GetExternalClickStatsRequest request, CancellationToken cancellationToken) =>
        PostAsync<IReadOnlyList<ExternalClickSummary>>("api/ai/get-external-click-stats", request, cancellationToken);

    public Task<IReadOnlyList<DirectionRequestSummary>> GetDirectionStatsAsync(GetDirectionStatsRequest request, CancellationToken cancellationToken) =>
        PostAsync<IReadOnlyList<DirectionRequestSummary>>("api/ai/get-direction-stats", request, cancellationToken);

    public Task<PagedResult<TopContentItem>> GetTopContentUnifiedAsync(GetTopContentUnifiedRequest request, CancellationToken cancellationToken) =>
        PostAsync<PagedResult<TopContentItem>>("api/ai/get-top-content", request, cancellationToken);

    public async Task<uint?> ResolveRegionIdAsync(string regionName, CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("BackendApi");
        using var response = await client.PostAsJsonAsync("api/ai/resolve-region", new ResolveNameRequest(regionName), JsonOpts, cancellationToken);
        if (!response.IsSuccessStatusCode) return null;
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(body) || body.Trim() == "null") return null;
        return uint.TryParse(body.Trim(), out var id) ? id : null;
    }

    public Task<ResolveEntityResult> ResolvePostAsync(string postName, CancellationToken cancellationToken) =>
        PostAsync<ResolveEntityResult>("api/ai/resolve-post", new ResolveNameRequest(postName), cancellationToken);

    public Task<ResolveEntityResult> ResolveRouteAsync(string routeName, CancellationToken cancellationToken) =>
        PostAsync<ResolveEntityResult>("api/ai/resolve-route", new ResolveNameRequest(routeName), cancellationToken);

    private async Task<T> PostAsync<T>(string path, object body, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("BackendApi");

        if (!string.IsNullOrWhiteSpace(_currentTourist.BearerToken))
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _currentTourist.BearerToken);

        using var response = await client.PostAsJsonAsync(path, body, JsonOpts, ct);

        if (response.StatusCode == HttpStatusCode.Unauthorized ||
            response.StatusCode == HttpStatusCode.Forbidden)
        {
            throw new UnauthorizedAccessException("Backend authorization failed for this AI capability.");
        }

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning(
                "Backend AI capability {Path} failed with status {Status}: {Error}",
                path,
                (int)response.StatusCode,
                error);
            throw new InvalidOperationException($"Backend AI capability failed: {path}");
        }

        var result = await response.Content.ReadFromJsonAsync<T>(JsonOpts, ct);
        // Za nullable tipove (PostDetail?, RouteDetail?, itd.) null je validan odgovor
        if (result is null && default(T) is not null)
            throw new InvalidOperationException($"Backend AI capability returned an empty response: {path}");
        return result!;
    }

    private sealed record ResolveNameRequest(string Name);
}
