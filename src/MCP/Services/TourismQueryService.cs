using Mcp.Data;
using Mcp.Dtos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Mcp.Services;

internal sealed class TourismQueryService : ITourismQueryService
{
    private readonly McpDbContext _db;
    private readonly ILogger<TourismQueryService> _logger;

    public TourismQueryService(McpDbContext db, ILogger<TourismQueryService> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ── Regije ────────────────────────────────────────────────────────────────

    public async Task<PagedResult<RegionSummary>> SearchRegionsAsync(
        SearchRegionsRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_search_regions: query={Query} type={Type} limit={Limit} offset={Offset}",
            request.Query, request.Type, request.Limit, request.Offset);

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

        if (!string.IsNullOrWhiteSpace(request.Country))
            query = query.Where(x => EF.Functions.ILike(x.Country, $"%{request.Country.Trim()}%"));

        if (request.HasCoordinates == true)
            query = query.Where(x => x.Lat != null && x.Lng != null);

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(x => x.Name)
            .Skip(request.Offset)
            .Take(request.Limit)
            .Select(x => new RegionSummary(x.Id, x.Name, x.Type, x.Description, x.Country, x.Lat, x.Lng))
            .ToListAsync(cancellationToken);

        return new PagedResult<RegionSummary>(items, total, request.Offset + items.Count < total);
    }

    public async Task<RegionFullSummary?> GetRegionSummaryAsync(
        GetRegionSummaryRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_region_summary: regionId={RegionId}", request.RegionId);

        var region = await _db.Regions.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.RegionId && x.IsActive, cancellationToken);

        if (region is null)
        {
            _logger.LogWarning("tourism_get_region_summary: region {RegionId} not found", request.RegionId);
            return null;
        }

        var posts = await _db.Posts.AsNoTracking()
            .Where(x => x.RegionId == request.RegionId && x.Status == "published")
            .ToListAsync(cancellationToken);

        var routes = await _db.Routes.AsNoTracking()
            .CountAsync(x => x.RegionId == request.RegionId && x.Status == "published", cancellationToken);

        var postsByType = posts
            .GroupBy(x => x.PostType)
            .ToDictionary(g => g.Key, g => g.Count());

        var avgRating = posts.Where(x => x.AvgRating.HasValue).Any()
            ? (double?)posts.Where(x => x.AvgRating.HasValue).Average(x => (double)x.AvgRating!.Value)
            : null;

        return new RegionFullSummary(
            region.Id, region.Name, region.Type, region.Country, region.Description,
            region.Lat, region.Lng,
            posts.Count, routes, postsByType, avgRating);
    }

    // ── Objekti ───────────────────────────────────────────────────────────────

    public async Task<PagedResult<PostSummary>> SearchPostsAsync(
        SearchPostsRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "tourism_search_posts: regionId={RegionId} query={Query} types={Types} minRating={MinRating} limit={Limit}",
            request.RegionId, request.Query, request.PostTypes, request.MinRating, request.Limit);

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
            query = query.Where(x => x.AvgRating >= (decimal)request.MinRating.Value);

        if (request.MaxRating.HasValue)
            query = query.Where(x => x.AvgRating <= (decimal)request.MaxRating.Value);

        if (request.HasExternalUrl == true)
            query = query.Where(x => x.ExternalUrl != null && x.ExternalUrl != "");

        if (request.HasOpeningHours == true)
            query = query.Where(x => x.OpeningHours != null && x.OpeningHours != "");

        if (request.Tags is { Count: > 0 })
        {
            var tagNames = request.Tags.Select(t => t.ToLower()).ToList();
            query = query.Where(x =>
                x.PostTags.Any(pt => tagNames.Contains(pt.Tag.Name.ToLower())));
        }

        var allResults = await query.ToListAsync(cancellationToken);

        // Proximity filter u memoriji (PostgreSQL nema Haversine nativno bez PostGIS)
        if (request.UserLatitude.HasValue && request.UserLongitude.HasValue && request.RadiusKm.HasValue)
        {
            allResults = allResults.Where(x =>
                x.Lat.HasValue && x.Lng.HasValue &&
                CalculateDistanceKm(
                    request.UserLatitude.Value, request.UserLongitude.Value,
                    (double)x.Lat.Value, (double)x.Lng.Value) <= request.RadiusKm.Value
            ).ToList();
        }

        var mapped = allResults.Select(x =>
        {
            double? dist = null;
            if (request.UserLatitude.HasValue && request.UserLongitude.HasValue
                && x.Lat.HasValue && x.Lng.HasValue)
            {
                dist = CalculateDistanceKm(
                    request.UserLatitude.Value, request.UserLongitude.Value,
                    (double)x.Lat.Value, (double)x.Lng.Value);
            }

            return new PostSummary(
                x.Id, x.RegionId, x.Title, x.PostType,
                x.Description, x.Address, x.ExternalUrl, null,
                x.OpeningHours,
                x.AvgRating.HasValue ? (double?)x.AvgRating.Value : null,
                null, x.Lat, x.Lng, dist,
                x.PostTags.Select(pt => pt.Tag.Name).ToList());
        });

        mapped = request.SortBy switch
        {
            "rating" => mapped.OrderByDescending(x => x.Rating ?? 0),
            "distance" => mapped.OrderBy(x => x.DistanceKm ?? double.MaxValue),
            "title" => mapped.OrderBy(x => x.Title),
            _ when request.UserLatitude.HasValue => mapped.OrderBy(x => x.DistanceKm ?? double.MaxValue),
            _ => mapped.OrderByDescending(x => x.Rating ?? 0)
        };

        var sorted = mapped.ToList();
        var total = sorted.Count;
        var page = sorted.Skip(request.Offset).Take(request.Limit).ToList();

        return new PagedResult<PostSummary>(page, total, request.Offset + page.Count < total);
    }

    public async Task<PostDetail?> GetPostDetailAsync(
        PostDetailRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_post_detail: postId={PostId}", request.PostId);

        var post = await _db.Posts.AsNoTracking()
            .Include(x => x.PostTags).ThenInclude(pt => pt.Tag)
            .FirstOrDefaultAsync(x => x.Id == request.PostId && x.Status == "published", cancellationToken);

        if (post is null)
        {
            _logger.LogWarning("tourism_get_post_detail: post {PostId} not found", request.PostId);
            throw new KeyNotFoundException(
                $"Location with ID {request.PostId} was not found or is not published. " +
                "Use tourism_search_posts to find valid IDs first.");
        }

        string? regionName = null;
        if (post.RegionId.HasValue)
        {
            var region = await _db.Regions.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == post.RegionId.Value, cancellationToken);
            regionName = region?.Name;
        }

        var viewCount = await _db.PostViews.AsNoTracking().CountAsync(x => x.PostId == post.Id, cancellationToken);
        var likeCount = await _db.PostLikes.AsNoTracking().CountAsync(x => x.PostId == post.Id, cancellationToken);
        var reviewCount = await _db.Reviews.AsNoTracking()
            .CountAsync(x => x.PostId == post.Id && x.IsApproved, cancellationToken);

        return new PostDetail(
            post.Id, post.RegionId, regionName,
            post.Title, post.PostType, post.Description,
            post.Address, post.ExternalUrl, null,
            post.OpeningHours, post.Details,
            post.AvgRating.HasValue ? (double?)post.AvgRating.Value : null,
            (uint)reviewCount, (uint)viewCount, (uint)likeCount,
            post.Lat, post.Lng,
            post.PostTags.Select(pt => pt.Tag.Name).ToList());
    }

    // ── Rute ──────────────────────────────────────────────────────────────────

    public async Task<PagedResult<RouteSummary>> SearchRoutesAsync(
        SearchRoutesRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "tourism_search_routes: regionId={RegionId} difficulties={Difficulties} maxDist={MaxDist} limit={Limit}",
            request.RegionId, request.Difficulties, request.MaxDistanceKm, request.Limit);

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

        if (request.MinDistanceKm.HasValue)
            query = query.Where(x => x.DistanceKm >= request.MinDistanceKm.Value);

        if (request.MaxDurationMinutes.HasValue)
            query = query.Where(x => x.DurationMin <= (uint)request.MaxDurationMinutes.Value);

        if (request.MinDurationMinutes.HasValue)
            query = query.Where(x => x.DurationMin >= (uint)request.MinDurationMinutes.Value);

        if (request.MaxElevationGain.HasValue)
            query = query.Where(x => x.ElevationGain <= request.MaxElevationGain.Value);

        query = request.SortBy switch
        {
            "distance_asc" => query.OrderBy(x => x.DistanceKm),
            "distance_desc" => query.OrderByDescending(x => x.DistanceKm),
            "duration_asc" => query.OrderBy(x => x.DurationMin),
            "duration_desc" => query.OrderByDescending(x => x.DurationMin),
            "elevation_asc" => query.OrderBy(x => x.ElevationGain),
            "elevation_desc" => query.OrderByDescending(x => x.ElevationGain),
            _ => query.OrderBy(x => x.DistanceKm)
        };

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip(request.Offset)
            .Take(request.Limit)
            .Select(x => new RouteSummary(
                x.Id, x.RegionId, x.Name, x.Difficulty,
                x.DistanceKm, x.DurationMin, x.ElevationGain, x.Description))
            .ToListAsync(cancellationToken);

        return new PagedResult<RouteSummary>(items, total, request.Offset + items.Count < total);
    }

    public async Task<RouteDetail?> GetRouteDetailAsync(
        RouteDetailRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_route_detail: routeId={RouteId}", request.RouteId);

        var route = await _db.Routes.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.RouteId && x.Status == "published", cancellationToken);

        if (route is null)
        {
            _logger.LogWarning("tourism_get_route_detail: route {RouteId} not found", request.RouteId);
            throw new KeyNotFoundException(
                $"Route with ID {request.RouteId} was not found or is not published. " +
                "Use tourism_search_routes to find valid IDs first.");
        }

        string? regionName = null;
        if (route.RegionId.HasValue)
        {
            var region = await _db.Regions.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == route.RegionId.Value, cancellationToken);
            regionName = region?.Name;
        }

        return new RouteDetail(
            route.Id, route.RegionId, regionName,
            route.Name, route.Difficulty,
            route.DistanceKm, route.DurationMin, route.ElevationGain,
            route.Description, route.Waypoints, route.GpxFilePath,
            route.ViewCount, route.SaveCount);
    }

    // ── Recenzije ─────────────────────────────────────────────────────────────

    public async Task<PagedResult<ReviewSummary>> GetReviewsAsync(
        GetReviewsRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_reviews: postId={PostId} limit={Limit}", request.PostId, request.Limit);

        var postExists = await _db.Posts.AsNoTracking()
            .AnyAsync(x => x.Id == request.PostId && x.Status == "published", cancellationToken);

        if (!postExists)
            throw new KeyNotFoundException(
                $"Location with ID {request.PostId} was not found. " +
                "Use tourism_search_posts to find valid post IDs first.");

        var query = _db.Reviews.AsNoTracking()
            .Include(x => x.Tourist)
            .Where(x => x.PostId == request.PostId);

        if (request.OnlyApproved == true)
            query = query.Where(x => x.IsApproved);

        if (request.MinRating.HasValue)
            query = query.Where(x => x.Rating >= request.MinRating.Value);

        if (request.MaxRating.HasValue)
            query = query.Where(x => x.Rating <= request.MaxRating.Value);

        query = request.SortBy switch
        {
            "rating_asc" => query.OrderBy(x => x.Rating),
            "rating_desc" => query.OrderByDescending(x => x.Rating),
            _ => query.OrderByDescending(x => x.CreatedAt)
        };

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip(request.Offset)
            .Take(request.Limit)
            .Select(x => new ReviewSummary(
                x.Id, x.PostId,
                x.Tourist != null ? x.Tourist.Name : null,
                x.Rating, x.Comment, x.IsApproved, x.CreatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResult<ReviewSummary>(items, total, request.Offset + items.Count < total);
    }

    // ── Tagovi ────────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<TagSummary>> SearchTagsAsync(
        SearchTagsRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_search_tags: query={Query} category={Category}", request.Query, request.Category);

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

        if (request.HasCapacity == true)
            query = query.Where(x => x.MaxCapacity != null);

        var tags = await query
            .OrderBy(x => x.Name)
            .Take(request.Limit)
            .ToListAsync(cancellationToken);

        return tags.Select(x => new TagSummary(
            x.Id, x.Name, x.Category, x.Description,
            x.Difficulty, x.Duration, x.MaxCapacity,
            x.PostTags.Count)).ToList();
    }

    // ── Analitika ─────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<PostAnalyticsSummary>> GetPostAnalyticsAsync(
        GetPostAnalyticsRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_post_analytics: postId={PostId} regionId={RegionId}",
            request.PostId, request.RegionId);

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
            p.Id, p.Title, p.PostType,
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
        _logger.LogInformation("tourism_get_top_content: sortBy={SortBy} postType={PostType} regionId={RegionId}",
            request.SortBy, request.PostType, request.RegionId);

        var analytics = await GetPostAnalyticsAsync(
            new GetPostAnalyticsRequest(null, request.RegionId, 200), cancellationToken);

        var filtered = request.PostType is not null
            ? analytics.Where(x => x.PostType == request.PostType)
            : analytics;

        return request.SortBy switch
        {
            "likes" => filtered.OrderByDescending(x => x.TotalLikes).Take(request.Limit).ToList(),
            "shares" => filtered.OrderByDescending(x => x.TotalShares).Take(request.Limit).ToList(),
            "rating" => filtered.OrderByDescending(x => x.AvgRating).Take(request.Limit).ToList(),
            "review_count" => filtered.OrderByDescending(x => x.ReviewCount).Take(request.Limit).ToList(),
            _ => filtered.OrderByDescending(x => x.TotalViews).Take(request.Limit).ToList(),
        };
    }

    // ── Turisti ───────────────────────────────────────────────────────────────

    public async Task<TouristStats> GetTouristStatsAsync(
        GetTouristStatsRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_tourist_stats");

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

    public async Task<PagedResult<TouristSummary>> SearchTouristsAsync(
        SearchTouristsRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_search_tourists: query={Query} language={Language} limit={Limit}",
            request.Query, request.Language, request.Limit);

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

        if (!string.IsNullOrWhiteSpace(request.Language))
            query = query.Where(x => x.Language == request.Language);

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip(request.Offset)
            .Take(request.Limit)
            .Select(x => new TouristSummary(
                x.Id, x.Name, x.Email, x.Language,
                x.IsActive, x.IsEmailVerified, x.CreatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResult<TouristSummary>(items, total, request.Offset + items.Count < total);
    }

    // ── Proximity / Preporuke ─────────────────────────────────────────────────

    public async Task<IReadOnlyList<PostSummary>> GetNearbyAsync(
        GetNearbyRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_nearby: lat={Lat} lng={Lng} radius={Radius}",
            request.Latitude, request.Longitude, request.RadiusKm);

        var query = _db.Posts.AsNoTracking()
            .Include(x => x.PostTags).ThenInclude(pt => pt.Tag)
            .Where(x => x.Status == "published" && x.Lat != null && x.Lng != null);

        if (request.PostTypes is { Count: > 0 })
            query = query.Where(x => request.PostTypes.Contains(x.PostType));

        if (request.MinRating.HasValue)
            query = query.Where(x => x.AvgRating >= (decimal)request.MinRating.Value);

        var all = await query.ToListAsync(cancellationToken);

        return all
            .Select(x =>
            {
                var dist = CalculateDistanceKm(
                    request.Latitude, request.Longitude,
                    (double)x.Lat!.Value, (double)x.Lng!.Value);
                return (post: x, dist);
            })
            .Where(t => t.dist <= request.RadiusKm)
            .OrderBy(t => t.dist)
            .Take(request.Limit)
            .Select(t => new PostSummary(
                t.post.Id, t.post.RegionId, t.post.Title, t.post.PostType,
                t.post.Description, t.post.Address, t.post.ExternalUrl, null,
                t.post.OpeningHours,
                t.post.AvgRating.HasValue ? (double?)t.post.AvgRating.Value : null,
                null, t.post.Lat, t.post.Lng, t.dist,
                t.post.PostTags.Select(pt => pt.Tag.Name).ToList()))
            .ToList();
    }

    public async Task<IReadOnlyList<PostSummary>> GetSimilarPostsAsync(
        GetSimilarPostsRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_similar_posts: postId={PostId}", request.PostId);

        var source = await _db.Posts.AsNoTracking()
            .Include(x => x.PostTags)
            .FirstOrDefaultAsync(x => x.Id == request.PostId && x.Status == "published", cancellationToken);

        if (source is null)
            throw new KeyNotFoundException(
                $"Location with ID {request.PostId} was not found. " +
                "Use tourism_search_posts to find valid IDs first.");

        var sourceTagIds = source.PostTags.Select(pt => pt.TagId).ToHashSet();

        var candidates = await _db.Posts.AsNoTracking()
            .Include(x => x.PostTags).ThenInclude(pt => pt.Tag)
            .Where(x => x.Status == "published"
                && x.Id != request.PostId
                && x.PostType == source.PostType
                && x.RegionId == source.RegionId)
            .ToListAsync(cancellationToken);

        return candidates
            .Select(x => (post: x, sharedTags: x.PostTags.Count(pt => sourceTagIds.Contains(pt.TagId))))
            .OrderByDescending(t => t.sharedTags)
            .ThenByDescending(t => t.post.AvgRating ?? 0)
            .Take(request.Limit)
            .Select(t => new PostSummary(
                t.post.Id, t.post.RegionId, t.post.Title, t.post.PostType,
                t.post.Description, t.post.Address, t.post.ExternalUrl, null,
                t.post.OpeningHours,
                t.post.AvgRating.HasValue ? (double?)t.post.AvgRating.Value : null,
                null, t.post.Lat, t.post.Lng, null,
                t.post.PostTags.Select(pt => pt.Tag.Name).ToList()))
            .ToList();
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