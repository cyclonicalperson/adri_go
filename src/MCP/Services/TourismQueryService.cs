using Mcp.Data;
using Mcp.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Mcp.Services;

internal sealed class TourismQueryService : ITourismQueryService
{
    private readonly McpDbContext _db;

    public TourismQueryService(McpDbContext db)
    {
        _db = db;
    }

    // ── Regije ────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<RegionSummary>> SearchRegionsAsync(
        SearchRegionsRequest request, CancellationToken cancellationToken)
    {
        var query = _db.Regions.AsNoTracking().Where(x => x.IsActive);

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            var s = request.Query.Trim();
            query = query.Where(x =>
                EF.Functions.ILike(x.Name, $"%{s}%") ||
                (x.Description != null && EF.Functions.ILike(x.Description, $"%{s}%")));
        }

        if (!string.IsNullOrWhiteSpace(request.Type))
            query = query.Where(x => x.Type == request.Type);

        return await query
            .OrderBy(x => x.Name)
            .Take(request.Limit)
            .Select(x => new RegionSummary(x.Id, x.Name, x.Type, x.Description, x.Country, x.Lat, x.Lng))
            .ToListAsync(cancellationToken);
    }

    // ── Objekti ───────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<PostSummary>> SearchPostsAsync(
        SearchPostsRequest request, CancellationToken cancellationToken)
    {
        var query = _db.Posts.AsNoTracking()
            .Include(x => x.PostTags).ThenInclude(pt => pt.Tag)
            .Where(x => x.Status == "published");

        if (request.RegionId.HasValue)
            query = query.Where(x => x.RegionId == request.RegionId.Value);

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            var s = request.Query.Trim();
            query = query.Where(x =>
                EF.Functions.ILike(x.Title, $"%{s}%") ||
                (x.Description != null && EF.Functions.ILike(x.Description, $"%{s}%")) ||
                (x.Address != null && EF.Functions.ILike(x.Address, $"%{s}%")));
        }

        if (request.PostTypes is { Count: > 0 })
            query = query.Where(x => request.PostTypes.Contains(x.PostType));

        if (request.MinRating.HasValue)
        {
            var min = (decimal)request.MinRating.Value;
            query = query.Where(x => x.AvgRating >= min);
        }

        var results = await query
            .OrderByDescending(x => x.AvgRating)
            .ToListAsync(cancellationToken);

        return results
            .Select(x =>
            {
                double? dist = null;
                if (request.UserLatitude.HasValue && request.UserLongitude.HasValue
                    && x.Lat.HasValue && x.Lng.HasValue)
                {
                    dist = CalculateDistanceKm(
                        request.UserLatitude.Value, request.UserLongitude.Value,
                        (double)x.Lat.Value, (double)x.Lng.Value);
                }

                var tags = x.PostTags.Select(pt => pt.Tag.Name).ToList();

                return new PostSummary(
                    x.Id, x.RegionId, x.Title, x.PostType,
                    x.Description, x.Address, x.ExternalUrl, x.OpeningHours,
                    x.AvgRating.HasValue ? (double?)x.AvgRating.Value : null,
                    x.Lat, x.Lng, dist, tags);
            })
            .OrderBy(x => x.DistanceKm ?? double.MaxValue)
            .Take(request.Limit)
            .ToList();
    }

    // ── Rute ──────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<RouteSummary>> SearchRoutesAsync(
        SearchRoutesRequest request, CancellationToken cancellationToken)
    {
        var query = _db.Routes.AsNoTracking().Where(x => x.Status == "published");

        if (request.RegionId.HasValue)
            query = query.Where(x => x.RegionId == request.RegionId.Value);

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            var s = request.Query.Trim();
            query = query.Where(x =>
                EF.Functions.ILike(x.Name, $"%{s}%") ||
                (x.Description != null && EF.Functions.ILike(x.Description, $"%{s}%")));
        }

        if (request.Difficulties is { Count: > 0 })
            query = query.Where(x => request.Difficulties.Contains(x.Difficulty));

        if (request.MaxDistanceKm.HasValue)
            query = query.Where(x => x.DistanceKm <= request.MaxDistanceKm.Value);

        if (request.MaxDurationMinutes.HasValue)
            query = query.Where(x => x.DurationMin <= (uint)request.MaxDurationMinutes.Value);

        return await query
            .OrderBy(x => x.DistanceKm)
            .Take(request.Limit)
            .Select(x => new RouteSummary(
                x.Id, x.RegionId, x.Name, x.Difficulty,
                x.DistanceKm, x.DurationMin, x.ElevationGain, x.Description))
            .ToListAsync(cancellationToken);
    }

    // ── Recenzije ─────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<ReviewSummary>> GetReviewsAsync(
        GetReviewsRequest request, CancellationToken cancellationToken)
    {
        var query = _db.Reviews.AsNoTracking()
            .Include(x => x.Tourist)
            .Where(x => x.PostId == request.PostId);

        if (request.OnlyApproved == true)
            query = query.Where(x => x.IsApproved);

        return await query
            .OrderByDescending(x => x.CreatedAt)
            .Take(request.Limit)
            .Select(x => new ReviewSummary(
                x.Id,
                x.PostId,
                x.Tourist != null ? x.Tourist.Name : null,
                x.Rating,
                x.Comment,
                x.IsApproved,
                x.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    // ── Tagovi ────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<TagSummary>> SearchTagsAsync(
        SearchTagsRequest request, CancellationToken cancellationToken)
    {
        var query = _db.Tags.AsNoTracking()
            .Include(x => x.PostTags)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            var s = request.Query.Trim();
            query = query.Where(x =>
                EF.Functions.ILike(x.Name, $"%{s}%") ||
                (x.Description != null && EF.Functions.ILike(x.Description, $"%{s}%")));
        }

        if (!string.IsNullOrWhiteSpace(request.Category))
            query = query.Where(x => x.Category == request.Category);

        if (!string.IsNullOrWhiteSpace(request.Difficulty))
            query = query.Where(x => x.Difficulty == request.Difficulty);

        var tags = await query
            .OrderBy(x => x.Name)
            .Take(request.Limit)
            .ToListAsync(cancellationToken);

        return tags
            .Select(x => new TagSummary(
                x.Id,
                x.Name,
                x.Category,
                x.Description,
                x.Difficulty,
                x.Duration,
                x.PostTags.Count))
            .ToList();
    }

    // ── Analitika ─────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<PostAnalyticsSummary>> GetPostAnalyticsAsync(
        GetPostAnalyticsRequest request, CancellationToken cancellationToken)
    {
        var postQuery = _db.Posts.AsNoTracking().Where(x => x.Status == "published");

        if (request.PostId.HasValue)
            postQuery = postQuery.Where(x => x.Id == request.PostId.Value);

        if (request.RegionId.HasValue)
            postQuery = postQuery.Where(x => x.RegionId == request.RegionId.Value);

        var posts = await postQuery.Take(request.Limit).ToListAsync(cancellationToken);
        var postIds = posts.Select(x => x.Id).ToList();

        var views = await _db.PostViews.AsNoTracking()
            .Where(x => postIds.Contains(x.PostId))
            .GroupBy(x => x.PostId)
            .Select(g => new { PostId = g.Key, Total = g.Count(), Unique = g.Select(x => x.TouristId).Distinct().Count() })
            .ToListAsync(cancellationToken);

        var likes = await _db.PostLikes.AsNoTracking()
            .Where(x => postIds.Contains(x.PostId))
            .GroupBy(x => x.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var shares = await _db.ContentShares.AsNoTracking()
            .Where(x => x.PostId.HasValue && postIds.Contains(x.PostId.Value))
            .GroupBy(x => x.PostId!.Value)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var reviews = await _db.Reviews.AsNoTracking()
            .Where(x => postIds.Contains(x.PostId) && x.IsApproved)
            .GroupBy(x => x.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        return posts.Select(p => new PostAnalyticsSummary(
            p.Id,
            p.Title,
            p.PostType,
            views.FirstOrDefault(v => v.PostId == p.Id)?.Total ?? 0,
            views.FirstOrDefault(v => v.PostId == p.Id)?.Unique ?? 0,
            likes.FirstOrDefault(l => l.PostId == p.Id)?.Count ?? 0,
            shares.FirstOrDefault(s => s.PostId == p.Id)?.Count ?? 0,
            p.AvgRating.HasValue ? (double?)p.AvgRating.Value : null,
            reviews.FirstOrDefault(r => r.PostId == p.Id)?.Count ?? 0
        )).ToList();
    }

    public async Task<IReadOnlyList<PostAnalyticsSummary>> GetTopContentAsync(
        GetTopContentRequest request, CancellationToken cancellationToken)
    {
        var analytics = await GetPostAnalyticsAsync(
            new GetPostAnalyticsRequest(null, request.RegionId, 200),
            cancellationToken);

        var filtered = request.PostType is not null
            ? analytics.Where(x => x.PostType == request.PostType)
            : analytics;

        return request.SortBy switch
        {
            "likes" => filtered.OrderByDescending(x => x.TotalLikes).Take(request.Limit).ToList(),
            "shares" => filtered.OrderByDescending(x => x.TotalShares).Take(request.Limit).ToList(),
            "rating" => filtered.OrderByDescending(x => x.AvgRating).Take(request.Limit).ToList(),
            _ => filtered.OrderByDescending(x => x.TotalViews).Take(request.Limit).ToList(),
        };
    }

    // ── Turisti ───────────────────────────────────────────────────────────────

    public async Task<TouristStats> GetTouristStatsAsync(
        GetTouristStatsRequest request, CancellationToken cancellationToken)
    {
        var tourists = await _db.Tourists.AsNoTracking().ToListAsync(cancellationToken);

        var cutoff = DateTime.UtcNow.AddDays(-30);
        var byLanguage = tourists
            .GroupBy(x => x.Language)
            .ToDictionary(g => g.Key, g => g.Count());

        return new TouristStats(
            tourists.Count,
            tourists.Count(x => x.IsActive),
            tourists.Count(x => x.IsEmailVerified),
            tourists.Count(x => x.CreatedAt >= cutoff),
            byLanguage);
    }

    public async Task<IReadOnlyList<TouristSummary>> SearchTouristsAsync(
        SearchTouristsRequest request, CancellationToken cancellationToken)
    {
        var query = _db.Tourists.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            var s = request.Query.Trim();
            query = query.Where(x =>
                (x.Name != null && EF.Functions.ILike(x.Name, $"%{s}%")) ||
                (x.Email != null && EF.Functions.ILike(x.Email, $"%{s}%")));
        }

        if (request.IsActive.HasValue)
            query = query.Where(x => x.IsActive == request.IsActive.Value);

        if (request.IsEmailVerified.HasValue)
            query = query.Where(x => x.IsEmailVerified == request.IsEmailVerified.Value);

        return await query
            .OrderByDescending(x => x.CreatedAt)
            .Take(request.Limit)
            .Select(x => new TouristSummary(
                x.Id, x.Name, x.Email, x.Language,
                x.IsActive, x.IsEmailVerified, x.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static double CalculateDistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }
}