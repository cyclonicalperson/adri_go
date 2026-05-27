using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TouristGuide.Ai.Contracts;
using TouristGuide.Api.Services.Ai;

namespace TouristGuide.Api.Controllers;

[ApiController]
[Route("api/ai")]
public sealed class AiCapabilitiesController : ControllerBase
{
    private readonly IAiTourismQueryService _tourism;

    public AiCapabilitiesController(IAiTourismQueryService tourism)
    {
        _tourism = tourism;
    }

    [HttpPost("search-regions")]
    public Task<PagedResult<RegionSummary>> SearchRegions(
        [FromBody] SearchRegionsRequest request,
        CancellationToken ct) =>
        _tourism.SearchRegionsAsync(request, ct);

    [HttpPost("get-region-summary")]
    public Task<RegionFullSummary?> GetRegionSummary(
        [FromBody] GetRegionSummaryRequest request,
        CancellationToken ct) =>
        _tourism.GetRegionSummaryAsync(request, ct);

    [HttpPost("search-posts")]
    public Task<PagedResult<PostSummary>> SearchPosts(
        [FromBody] SearchPostsRequest request,
        CancellationToken ct) =>
        _tourism.SearchPostsAsync(request, ct);

    [HttpPost("get-post-detail")]
    public Task<PostDetail?> GetPostDetail(
        [FromBody] PostDetailRequest request,
        CancellationToken ct) =>
        _tourism.GetPostDetailAsync(request, ct);

    [HttpPost("search-routes")]
    public Task<PagedResult<RouteSummary>> SearchRoutes(
        [FromBody] SearchRoutesRequest request,
        CancellationToken ct) =>
        _tourism.SearchRoutesAsync(request, ct);

    [HttpPost("get-route-detail")]
    public Task<RouteDetail?> GetRouteDetail(
        [FromBody] RouteDetailRequest request,
        CancellationToken ct) =>
        _tourism.GetRouteDetailAsync(request, ct);

    [HttpPost("get-reviews")]
    public Task<PagedResult<ReviewSummary>> GetReviews(
        [FromBody] GetReviewsRequest request,
        CancellationToken ct) =>
        _tourism.GetReviewsAsync(request, ct);

    [HttpPost("get-route-reviews")]
    public Task<PagedResult<ReviewSummary>> GetRouteReviews(
        [FromBody] GetRouteReviewsRequest request,
        CancellationToken ct) =>
        _tourism.GetRouteReviewsAsync(request, ct);

    [HttpPost("search-tags")]
    public Task<IReadOnlyList<TagSummary>> SearchTags(
        [FromBody] SearchTagsRequest request,
        CancellationToken ct) =>
        _tourism.SearchTagsAsync(request, ct);

    [HttpPost("search-activities")]
    public Task<IReadOnlyList<TagSummary>> SearchActivities(
        [FromBody] SearchActivitiesRequest request,
        CancellationToken ct) =>
        _tourism.SearchActivitiesAsync(request, ct);

    [HttpPost("get-nearby")]
    public Task<PagedResult<PostSummary>> GetNearby(
        [FromBody] GetNearbyRequest request,
        CancellationToken ct) =>
        _tourism.GetNearbyAsync(request, ct);

    [HttpPost("get-similar-posts")]
    public Task<IReadOnlyList<PostSummary>> GetSimilarPosts(
        [FromBody] GetSimilarPostsRequest request,
        CancellationToken ct) =>
        _tourism.GetSimilarPostsAsync(request, ct);

    [HttpPost("search-events")]
    public Task<PagedResult<EventSummary>> SearchEvents(
        [FromBody] SearchEventsRequest request,
        CancellationToken ct) =>
        _tourism.SearchEventsAsync(request, ct);

    [HttpPost("get-recommendations")]
    public Task<PagedResult<RecommendationItem>> GetRecommendations(
        [FromBody] GetRecommendationsRequest request,
        CancellationToken ct)
    {
        var securedRequest = request with { TouristId = GetTouristId() };
        return _tourism.GetRecommendationsAsync(securedRequest, ct);
    }

    [HttpPost("get-top-content")]
    public Task<PagedResult<TopContentItem>> GetTopContent(
        [FromBody] GetTopContentUnifiedRequest request,
        CancellationToken ct) =>
        _tourism.GetTopContentUnifiedAsync(request, ct);

    [HttpPost("get-new-content")]
    public Task<PagedResult<NewContentItem>> GetNewContent(
        [FromBody] GetNewContentRequest request,
        CancellationToken ct) =>
        _tourism.GetNewContentAsync(request, ct);

    [HttpPost("get-visit-trends")]
    public Task<IReadOnlyList<VisitTrendPoint>> GetVisitTrends(
        [FromBody] GetVisitTrendsRequest request,
        CancellationToken ct) =>
        _tourism.GetVisitTrendsAsync(request, ct);

    [HttpPost("get-external-click-stats")]
    public Task<IReadOnlyList<ExternalClickSummary>> GetExternalClickStats(
        [FromBody] GetExternalClickStatsRequest request,
        CancellationToken ct) =>
        _tourism.GetExternalClickStatsAsync(request, ct);

    [HttpPost("get-direction-stats")]
    public Task<IReadOnlyList<DirectionRequestSummary>> GetDirectionStats(
        [FromBody] GetDirectionStatsRequest request,
        CancellationToken ct) =>
        _tourism.GetDirectionStatsAsync(request, ct);

    [Authorize]
    [HttpPost("get-my-saved")]
    public Task<PagedResult<SavedPostSummary>> GetMySaved(
        [FromBody] GetSavedPostsRequest request,
        CancellationToken ct) =>
        _tourism.GetSavedPostsAsync(request with { TouristId = RequireTouristId() }, ct);

    [Authorize]
    [HttpPost("get-my-planner")]
    public Task<IReadOnlyList<PlannerSummary>> GetMyPlanner(
        [FromBody] GetTouristPlannerRequest request,
        CancellationToken ct) =>
        _tourism.GetTouristPlannersAsync(request with { TouristId = RequireTouristId() }, ct);

    [Authorize]
    [HttpPost("get-my-favorites")]
    public Task<PagedResult<TouristFavoriteSummary>> GetMyFavorites(
        [FromBody] GetTouristFavoritesRequest request,
        CancellationToken ct) =>
        _tourism.GetTouristFavoritesAsync(request with { TouristId = RequireTouristId() }, ct);

    [HttpPost("resolve-region")]
    public Task<uint?> ResolveRegion(
        [FromBody] ResolveNameRequest request,
        CancellationToken ct) =>
        _tourism.ResolveRegionIdAsync(request.Name, ct);

    [HttpPost("resolve-post")]
    public Task<ResolveEntityResult> ResolvePost(
        [FromBody] ResolveNameRequest request,
        CancellationToken ct) =>
        _tourism.ResolvePostAsync(request.Name, ct);

    [HttpPost("resolve-route")]
    public Task<ResolveEntityResult> ResolveRoute(
        [FromBody] ResolveNameRequest request,
        CancellationToken ct) =>
        _tourism.ResolveRouteAsync(request.Name, ct);

    private uint RequireTouristId() =>
        GetTouristId() ?? throw new UnauthorizedAccessException("Tourist identity is required.");

    private uint? GetTouristId()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
               ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        return uint.TryParse(sub, out var id) ? id : null;
    }
}

public sealed record ResolveNameRequest(string Name);
