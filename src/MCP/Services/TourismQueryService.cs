using Mcp.Data;
using Mcp.Data.Entities;
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

        if (request.UserLatitude.HasValue && request.UserLongitude.HasValue && request.RadiusKm.HasValue)
        {
            var deltaLat = (decimal)(request.RadiusKm.Value / 111.0);
            var deltaLng = (decimal)(request.RadiusKm.Value / (111.0 * Math.Cos(request.UserLatitude.Value * Math.PI / 180.0)));
            var minLat = (decimal)request.UserLatitude.Value - deltaLat;
            var maxLat = (decimal)request.UserLatitude.Value + deltaLat;
            var minLng = (decimal)request.UserLongitude.Value - deltaLng;
            var maxLng = (decimal)request.UserLongitude.Value + deltaLng;
            query = query.Where(x =>
                x.Lat != null && x.Lng != null &&
                x.Lat >= minLat && x.Lat <= maxLat &&
                x.Lng >= minLng && x.Lng <= maxLng);
        }

        // ── GPS radius path: učitaj sve kandidate u memoriju, filtriraj precizno, paginiraj ──
        // Bbox pre-filter u SQL-u je već primijenjen; ovdje radimo tačno Haversine filtriranje.
        if (request.UserLatitude.HasValue && request.UserLongitude.HasValue && request.RadiusKm.HasValue)
        {
            List<PostEntity> gpsResults;
            try
            {
                gpsResults = await query.ToListAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "tourism_search_posts (GPS): database query failed");
                throw new InvalidOperationException(
                    "Failed to search locations. Please try again or narrow your search criteria.", ex);
            }

            // Precizno Haversine filtriranje u memoriji
            var withDist = gpsResults
                .Where(x => x.Lat.HasValue && x.Lng.HasValue)
                .Select(x =>
                {
                    var dist = CalculateDistanceKm(
                        request.UserLatitude.Value, request.UserLongitude.Value,
                        (double)x.Lat!.Value, (double)x.Lng!.Value);
                    return (post: x, dist);
                })
                .Where(t => t.dist <= request.RadiusKm.Value)
                .ToList();

            // Sortiranje u memoriji
            var geoSorted = (request.SortBy switch
            {
                "rating"  => withDist.OrderByDescending(t => t.post.AvgRating ?? 0),
                "title"   => withDist.OrderBy(t => t.post.Title),
                "newest"  => withDist.OrderByDescending(t => t.post.PublishedAt ?? DateTime.MinValue),
                _         => withDist.OrderBy(t => t.dist)   // distance (default za GPS)
            }).ToList();

            var geoTotal = geoSorted.Count;
            var geoPage  = geoSorted
                .Skip(request.Offset)
                .Take(request.Limit)
                .Select(t => new PostSummary(
                    t.post.Id, t.post.RegionId, t.post.Title, t.post.PostType,
                    t.post.Description, t.post.Address, t.post.ExternalUrl, null,
                    t.post.OpeningHours,
                    t.post.AvgRating.HasValue ? (double?)t.post.AvgRating.Value : null,
                    t.post.ReviewCount,
                    t.post.Lat, t.post.Lng, t.dist,
                    t.post.PostTags.Select(pt => pt.Tag.Name).ToList()))
                .ToList();

            return new PagedResult<PostSummary>(geoPage, geoTotal, request.Offset + geoPage.Count < geoTotal);
        }

        // ── Standardni path: paginacija i sortiranje ostaju u SQL-u ───────────
        // Sortiranje
        query = request.SortBy switch
        {
            "rating"  => query.OrderByDescending(x => x.AvgRating ?? 0),
            "title"   => query.OrderBy(x => x.Title),
            "newest"  => query.OrderByDescending(x => x.PublishedAt ?? DateTime.MinValue),
            _         => query.OrderByDescending(x => x.AvgRating ?? 0)  // default: rating
        };

        var total = await query.CountAsync(cancellationToken);

        List<PostEntity> pageResults;
        try
        {
            pageResults = await query
                .Skip(request.Offset)
                .Take(request.Limit)
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "tourism_search_posts: database query failed");
            throw new InvalidOperationException(
                "Failed to search locations. Please try again or narrow your search criteria.", ex);
        }

        var pageItems = pageResults.Select(x => new PostSummary(
            x.Id, x.RegionId, x.Title, x.PostType,
            x.Description, x.Address, x.ExternalUrl, null,
            x.OpeningHours,
            x.AvgRating.HasValue ? (double?)x.AvgRating.Value : null,
            x.ReviewCount,
            x.Lat, x.Lng, null,
            x.PostTags.Select(pt => pt.Tag.Name).ToList())).ToList();

        return new PagedResult<PostSummary>(pageItems, total, request.Offset + pageItems.Count < total);
    }

    public async Task<PostDetail?> GetPostDetailAsync(
        PostDetailRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_post_detail: postId={PostId}", request.PostId);

        // Jedan upit: post + tagovi
        var post = await _db.Posts.AsNoTracking()
            .Include(x => x.PostTags).ThenInclude(pt => pt.Tag)
            .FirstOrDefaultAsync(x => x.Id == request.PostId && x.Status == "published", cancellationToken);

        if (post is null)
        {
            _logger.LogWarning("tourism_get_post_detail: post {PostId} not found", request.PostId);
            return null;
        }

        // Ime regije + tri COUNT-a — sve paralelno (4 upita umjesto 4 sekvencijalna)
        var regionTask = post.RegionId.HasValue
            ? _db.Regions.AsNoTracking()
                  .Where(x => x.Id == post.RegionId.Value)
                  .Select(x => x.Name)
                  .FirstOrDefaultAsync(cancellationToken)
            : Task.FromResult<string?>(null);

        var viewTask   = _db.PostViews.AsNoTracking().CountAsync(x => x.PostId == post.Id, cancellationToken);
        var likeTask   = _db.PostLikes.AsNoTracking().CountAsync(x => x.PostId == post.Id, cancellationToken);
        var reviewTask = _db.Reviews.AsNoTracking()
                            .CountAsync(x => x.PostId == post.Id && x.IsApproved, cancellationToken);

        await Task.WhenAll(regionTask, viewTask, likeTask, reviewTask);

        return new PostDetail(
            post.Id, post.RegionId, await regionTask,
            post.Title, post.PostType, post.Description,
            post.Address, post.ExternalUrl, null,
            post.OpeningHours, post.Details,
            post.AvgRating.HasValue ? (double?)post.AvgRating.Value : null,
            (uint)await reviewTask, (uint)await viewTask, (uint)await likeTask,
            post.Lat, post.Lng,
            post.PostTags.Select(pt => pt.Tag.Name).ToList(),
            ParseJsonStringArray(post.Images));
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
        {
            _logger.LogWarning("tourism_get_reviews: post {PostId} not found", request.PostId);
            return new PagedResult<ReviewSummary>([], 0, false);
        }

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
                x.Id, x.PostId, null,
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

        var raw = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip(request.Offset)
            .Take(request.Limit)
            .ToListAsync(cancellationToken);

        var items = raw
            .Select(x => new TouristSummary(
                x.Id, x.Name, MaskEmail(x.Email), x.Language,
                x.IsActive, x.IsEmailVerified, x.CreatedAt))
            .ToList();

        return new PagedResult<TouristSummary>(items, total, request.Offset + items.Count < total);
    }

    // ── Proximity / Preporuke ─────────────────────────────────────────────────

    public async Task<IReadOnlyList<PostSummary>> GetNearbyAsync(
        GetNearbyRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_nearby: lat={Lat} lng={Lng} radius={Radius}",
            request.Latitude, request.Longitude, request.RadiusKm);

        // Bbox pre-filter u SQL-u — isti pattern kao SearchPostsAsync
        var deltaLat = (decimal)(request.RadiusKm / 111.0);
        var deltaLng = (decimal)(request.RadiusKm / (111.0 * Math.Cos(request.Latitude * Math.PI / 180.0)));
        var minLat = (decimal)request.Latitude - deltaLat;
        var maxLat = (decimal)request.Latitude + deltaLat;
        var minLng = (decimal)request.Longitude - deltaLng;
        var maxLng = (decimal)request.Longitude + deltaLng;

        var query = _db.Posts.AsNoTracking()
            .Include(x => x.PostTags).ThenInclude(pt => pt.Tag)
            .Where(x => x.Status == "published"
                && x.Lat != null && x.Lng != null
                && x.Lat >= minLat && x.Lat <= maxLat
                && x.Lng >= minLng && x.Lng <= maxLng);

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
        {
            _logger.LogWarning("tourism_get_similar_posts: post {PostId} not found", request.PostId);
            return [];
        }

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

    private static string? MaskEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return null;

        var atIndex = email.IndexOf('@');
        if (atIndex <= 0) return "***";

        // Prikazujemo prvo slovo + *** + @domen
        // Npr. john.doe@gmail.com → j***@gmail.com
        return email[0] + "***" + email[atIndex..];
    }

    /// <summary>
    /// Parsira JSON niz stringova (npr. Images kolona: ["url1","url2"]).
    /// Vraća prazan niz ako je json null, prazan ili nevalidan.
    /// </summary>
    private static IReadOnlyList<string> ParseJsonStringArray(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            var result = System.Text.Json.JsonSerializer.Deserialize<List<string>>(json);
            return result?.Where(x => !string.IsNullOrWhiteSpace(x)).ToList() ?? [];
        }
        catch
        {
            return [];
        }
    }

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

    // ── Događaji ──────────────────────────────────────────────────────────────

    public async Task<PagedResult<EventSummary>> SearchEventsAsync(
        SearchEventsRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "tourism_search_events: regionId={RegionId} startFrom={StartFrom} startTo={StartTo} category={Category} limit={Limit}",
            request.RegionId, request.StartFrom, request.StartTo, request.Category, request.Limit);

        // Učitavamo sve objavljene postove tipa "event" iz baze
        var query = _db.Posts.AsNoTracking()
            .Include(x => x.PostTags).ThenInclude(pt => pt.Tag)
            .Where(x => x.Status == "published" && x.PostType == "event");

        if (request.RegionId.HasValue)
            query = query.Where(x => x.RegionId == request.RegionId.Value);

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            var s = request.Query.Trim();
            query = query.Where(x =>
                EF.Functions.ILike(x.Title, $"%{s}%") ||
                (x.Description != null && EF.Functions.ILike(x.Description, $"%{s}%")));
        }

        var posts = await query.ToListAsync(cancellationToken);

        var events = posts
            .Select(x =>
            {
                var details = ParseEventDetails(x.Details);
                if (details is null)
                    _logger.LogWarning("tourism_search_events: post {PostId} has unparseable Details JSON", x.Id);
                return (post: x, details);
            })
            .Where(t =>
            {
                // Datumski filteri se primjenjuju samo ako Details ima StartAt
                if (request.StartFrom.HasValue)
                {
                    if (t.details?.StartAt == null || t.details.StartAt < request.StartFrom.Value)
                        return false;
                }

                if (request.StartTo.HasValue)
                {
                    if (t.details?.StartAt == null || t.details.StartAt > request.StartTo.Value)
                        return false;
                }

                if (!string.IsNullOrWhiteSpace(request.Category) &&
                    !string.Equals(t.details?.Category, request.Category, StringComparison.OrdinalIgnoreCase))
                    return false;

                if (request.HasTicketUrl == true &&
                    string.IsNullOrWhiteSpace(t.details?.TicketUrl))
                    return false;

                return true;
            })
            .ToList();

        // Sortiranje
        var sorted = request.SortBy switch
        {
            "start_date_desc" => events.OrderByDescending(t => t.details?.StartAt ?? DateTime.MinValue),
            "rating" => events.OrderByDescending(t => t.post.AvgRating ?? 0),
            "title" => events.OrderBy(t => t.post.Title),
            _ => events.OrderBy(t => t.details?.StartAt ?? DateTime.MaxValue) // start_date_asc (default)
        };

        var list = sorted.ToList();
        var total = list.Count;
        var page = list
            .Skip(request.Offset)
            .Take(request.Limit)
            .Select(t => new EventSummary(
                t.post.Id,
                t.post.RegionId,
                t.post.Title,
                t.post.Description,
                t.post.Address,
                t.post.Lat,
                t.post.Lng,
                t.details?.StartAt,
                t.details?.EndAt,
                t.details?.Category ?? "OTHER",
                t.details?.TicketUrl,
                t.post.AvgRating.HasValue ? (double?)t.post.AvgRating.Value : null,
                t.post.PostTags.Select(pt => pt.Tag.Name).ToList()))
            .ToList();

        return new PagedResult<EventSummary>(page, total, request.Offset + page.Count < total);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static EventDetailsJson? ParseEventDetails(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            var options = new System.Text.Json.JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };
            var result = System.Text.Json.JsonSerializer.Deserialize<EventDetailsJson>(json, options);
            if (result is null) return null;

            // Normalize DateTime kinds: seed upisuje bez 'Z' (Unspecified kind)
            // Pretvaramo sve u UTC da bi poređenja s request filtrima bili ispravni
            if (result.StartAt.HasValue && result.StartAt.Value.Kind == DateTimeKind.Unspecified)
                result.StartAt = DateTime.SpecifyKind(result.StartAt.Value, DateTimeKind.Utc);

            if (result.EndAt.HasValue && result.EndAt.Value.Kind == DateTimeKind.Unspecified)
                result.EndAt = DateTime.SpecifyKind(result.EndAt.Value, DateTimeKind.Utc);

            return result;
        }
        catch
        {
            return null;
        }
    }

    private sealed class EventDetailsJson
    {
        public DateTime? StartAt { get; set; }
        public DateTime? EndAt { get; set; }
        public string? TicketUrl { get; set; }
        public string Category { get; set; } = "OTHER";
    }

    // ── Personalizovane preporuke ──────────────────────────────────────────────

    public async Task<IReadOnlyList<RecommendationItem>> GetRecommendationsAsync(
        GetRecommendationsRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "tourism_get_recommendations: regionId={RegionId} touristId={TouristId} mode={Mode} limit={Limit}",
            request.RegionId, request.TouristId, request.ContextMode, request.Limit);

        var mode = request.ContextMode.Trim().ToLowerInvariant() == "planning" ? "planning" : "onsite";

        // Učitaj postove za datu regiju
        var postQuery = _db.Posts.AsNoTracking()
            .Include(x => x.PostTags).ThenInclude(pt => pt.Tag)
            .Where(x => x.RegionId == request.RegionId && x.Status == "published");

        if (mode == "onsite")
            postQuery = postQuery.Where(x => x.PostType != "accommodation");

        var posts = await postQuery
            .OrderByDescending(x => x.AvgRating ?? 0)
            .Take(200)
            .ToListAsync(cancellationToken);

        var routes = await _db.Routes.AsNoTracking()
            .Where(x => x.RegionId == request.RegionId && x.Status == "published")
            .OrderByDescending(x => x.SaveCount)
            .ThenByDescending(x => x.ViewCount)
            .Take(60)
            .ToListAsync(cancellationToken);

        if (!request.TouristId.HasValue)
        {
            var anonymous = posts
                .Select(p => ScoreAnonymousPost(p, mode))
                .Concat(routes.Select(ScoreAnonymousRoute))
                .Where(x => x.Score > 0)
                .OrderByDescending(x => x.Score)
                .ToList();

            return DiversifyAndTake(anonymous, request.Limit);
        }

        // Personalizovano — izgradi profil turiste
        var profile = await BuildPreferenceProfileAsync(request.TouristId.Value, cancellationToken);

        var ranked = profile.HasSignals
            ? posts.Select(p => ScorePersonalizedPost(profile, p, mode))
                .Concat(routes.Select(r => ScorePersonalizedRoute(profile, r)))
            : posts.Select(p => ScoreAnonymousPost(p, mode))
                .Concat(routes.Select(ScoreAnonymousRoute));

        return DiversifyAndTake(
            ranked.Where(x => x.Score > 0).OrderByDescending(x => x.Score).ToList(),
            request.Limit);
    }

    // ── Recommendation helpers ─────────────────────────────────────────────────

    private async Task<PreferenceProfile> BuildPreferenceProfileAsync(
        uint touristId, CancellationToken cancellationToken)
    {
        var profile = new PreferenceProfile();

        var tourist = await _db.Tourists.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == touristId && t.IsActive, cancellationToken);

        if (tourist is null) return profile;

        AddInterestSignals(profile, tourist.Interests);

        // Signali iz lajkova (težina 4)
        var likedPostIds = await _db.PostLikes.AsNoTracking()
            .Where(x => x.TouristId == touristId)
            .OrderByDescending(x => x.LikedAt)
            .Take(60)
            .Select(x => x.PostId)
            .ToListAsync(cancellationToken);

        if (likedPostIds.Count > 0)
        {
            var likedPosts = await _db.Posts.AsNoTracking()
                .Include(x => x.PostTags).ThenInclude(pt => pt.Tag)
                .Where(x => likedPostIds.Contains(x.Id))
                .ToListAsync(cancellationToken);
            foreach (var p in likedPosts)
                AddPostSignal(profile, p, 4m);
        }

        // Signali iz recenzija (težina = ocena turiste)
        var reviews = await _db.Reviews.AsNoTracking()
            .Where(x => x.TouristId == touristId && x.IsApproved)
            .OrderByDescending(x => x.CreatedAt)
            .Take(40)
            .ToListAsync(cancellationToken);

        if (reviews.Count > 0)
        {
            var reviewedPostIds = reviews.Select(x => x.PostId).ToList();
            var reviewedPosts = await _db.Posts.AsNoTracking()
                .Include(x => x.PostTags).ThenInclude(pt => pt.Tag)
                .Where(x => reviewedPostIds.Contains(x.Id))
                .ToListAsync(cancellationToken);
            var reviewsByPostId = reviews.ToDictionary(r => r.PostId);
            foreach (var p in reviewedPosts)
            {
                var weight = reviewsByPostId.TryGetValue(p.Id, out var r) ? Math.Max(r.Rating, 1) : 1;
                AddPostSignal(profile, p, weight);
            }
        }

        // Signali iz pregleda (težina 1)
        var viewedPostIds = await _db.PostViews.AsNoTracking()
            .Where(x => x.TouristId == touristId)
            .OrderByDescending(x => x.ViewedAt)
            .Take(80)
            .Select(x => x.PostId)
            .ToListAsync(cancellationToken);

        if (viewedPostIds.Count > 0)
        {
            var viewedPosts = await _db.Posts.AsNoTracking()
                .Include(x => x.PostTags).ThenInclude(pt => pt.Tag)
                .Where(x => viewedPostIds.Contains(x.Id))
                .ToListAsync(cancellationToken);
            foreach (var p in viewedPosts)
                AddPostSignal(profile, p, 1m);
        }

        return profile;
    }

    private static void AddPostSignal(PreferenceProfile profile, PostEntity post, decimal weight)
    {
        if (post.Status != "published") return;
        profile.SignalCount++;
        AddWeight(profile.PostTypeWeights, post.PostType, weight);
        if (post.RegionId.HasValue)
            AddWeight(profile.RegionWeights, post.RegionId.Value, weight);
        foreach (var tag in post.PostTags.Select(pt => pt.Tag.Name).Where(n => !string.IsNullOrWhiteSpace(n)))
            AddWeight(profile.TagWeights, tag, weight);
    }

    private static void AddInterestSignals(PreferenceProfile profile, string? interestsJson)
    {
        if (string.IsNullOrWhiteSpace(interestsJson)) return;
        IEnumerable<string> interests;
        try
        {
            interests = System.Text.Json.JsonSerializer.Deserialize<List<string>>(interestsJson)
                ?.Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim())
                ?? Enumerable.Empty<string>();
        }
        catch { interests = Enumerable.Empty<string>(); }

        foreach (var interest in interests)
        {
            profile.SignalCount++;
            foreach (var alias in ExpandInterestAliases(interest))
                AddWeight(profile.TagWeights, alias, 3m);
            foreach (var postType in MapInterestToPostTypes(interest))
                AddWeight(profile.PostTypeWeights, postType, 2.5m);
        }
    }

    private static IEnumerable<string> ExpandInterestAliases(string interest)
    {
        var n = interest.Trim().ToLowerInvariant();
        var aliases = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { n };
        switch (n)
        {
            case "hiking" or "planinarenje":
                aliases.UnionWith(new[] { "trail", "nature", "mountain", "adventure", "hike" }); break;
            case "food" or "hrana" or "gastronomy":
                aliases.UnionWith(new[] { "restaurant", "cuisine", "cafe", "traditional" }); break;
            case "culture" or "kultura":
                aliases.UnionWith(new[] { "museum", "heritage", "cultural", "monument", "history" }); break;
            case "nightlife" or "nocni zivot":
                aliases.UnionWith(new[] { "club", "bar", "music", "party" }); break;
            case "wellness" or "spa":
                aliases.UnionWith(new[] { "spa", "wellness", "relax", "massage" }); break;
            case "shopping":
                aliases.UnionWith(new[] { "shop", "market", "local products" }); break;
            case "family" or "porodica":
                aliases.UnionWith(new[] { "family", "kids", "park", "easy" }); break;
        }
        return aliases;
    }

    private static IEnumerable<string> MapInterestToPostTypes(string interest) =>
        interest.Trim().ToLowerInvariant() switch
        {
            "food" or "hrana" or "gastronomy" => new[] { "restaurant" },
            "culture" or "kultura" => new[] { "cultural_site", "monument", "attraction" },
            "nightlife" or "nocni zivot" => new[] { "club" },
            "shopping" => new[] { "shop" },
            _ => Array.Empty<string>()
        };

    private static RecommendationItem ScoreAnonymousPost(PostEntity post, string mode)
    {
        var boost = post.PostType == "accommodation" ? (mode == "planning" ? 4m : -100m) : 2m;
        var score = CalculatePostPopularity(post) + boost;
        var tags = post.PostTags.Select(pt => pt.Tag.Name).ToList();
        return new RecommendationItem(post.Id, "post", post.Title, post.PostType, post.RegionId, null,
            Math.Round((double)score, 2), "Popularan sadržaj za ovu destinaciju", tags);
    }

    private static RecommendationItem ScoreAnonymousRoute(RouteEntity route)
    {
        var score = CalculateRoutePopularity(route);
        return new RecommendationItem(route.Id, "route", route.Name, "route", route.RegionId, null,
            Math.Round((double)score, 2), "Popularna ruta za ovu destinaciju", Array.Empty<string>());
    }

    private static RecommendationItem ScorePersonalizedPost(PreferenceProfile profile, PostEntity post, string mode)
    {
        var tagNames = post.PostTags.Select(pt => pt.Tag.Name)
            .Where(n => !string.IsNullOrWhiteSpace(n)).ToList();

        var matchedTags = tagNames
            .Where(profile.TagWeights.ContainsKey)
            .OrderByDescending(t => profile.TagWeights[t])
            .Take(5).ToList();

        var tagScore = Math.Min(matchedTags.Sum(t => profile.TagWeights[t]) * 4m, 30m);
        var typeScore = profile.PostTypeWeights.TryGetValue(post.PostType, out var tw)
            ? Math.Min(tw * 3m, 20m) : 0m;
        var regionScore = post.RegionId.HasValue && profile.RegionWeights.TryGetValue(post.RegionId.Value, out var rw)
            ? Math.Min(rw * 2m, 10m) : 0m;
        var contextBoost = post.PostType == "accommodation"
            ? (mode == "planning" ? 6m : -100m) : 3m;

        var score = tagScore + typeScore + regionScore + CalculatePostPopularity(post) + contextBoost;

        var reason = matchedTags.Count > 0
            ? $"Prema tvojim interesovanjima: {string.Join(", ", matchedTags.Take(3))}"
            : profile.PostTypeWeights.ContainsKey(post.PostType)
                ? $"Često gledaš {post.PostType.Replace('_', ' ')}"
                : "Preporučeno prema tvojim signalima";

        return new RecommendationItem(post.Id, "post", post.Title, post.PostType, post.RegionId, null,
            Math.Round((double)score, 2), reason, matchedTags);
    }

    private static RecommendationItem ScorePersonalizedRoute(PreferenceProfile profile, RouteEntity route)
    {
        var hasOutdoor = profile.TagWeights.ContainsKey("hiking")
            || profile.TagWeights.ContainsKey("planinarenje")
            || profile.TagWeights.ContainsKey("nature")
            || profile.TagWeights.ContainsKey("adventure");

        var regionScore = route.RegionId.HasValue && profile.RegionWeights.TryGetValue(route.RegionId.Value, out var rw)
            ? Math.Min(rw * 2m, 10m) : 0m;
        var outdoorBoost = hasOutdoor ? 8m : 0m;
        var score = regionScore + outdoorBoost + CalculateRoutePopularity(route);

        var reason = hasOutdoor ? "Ruta odgovara tvojim outdoor interesovanjima"
            : $"Ruta za ovu destinaciju, težina: {route.Difficulty}";

        return new RecommendationItem(route.Id, "route", route.Name, "route", route.RegionId, null,
            Math.Round((double)score, 2), reason, Array.Empty<string>());
    }

    private static IReadOnlyList<RecommendationItem> DiversifyAndTake(
        IReadOnlyList<RecommendationItem> ranked, int take)
    {
        var groups = ranked
            .GroupBy(x => x.PostType)
            .ToDictionary(g => g.Key, g => new Queue<RecommendationItem>(g));

        var order = groups.OrderByDescending(g => g.Value.Count).Select(g => g.Key).ToList();
        var result = new List<RecommendationItem>();
        var cap = Math.Clamp(take, 1, 20);

        while (result.Count < cap && order.Count > 0)
        {
            foreach (var key in order.ToList())
            {
                if (result.Count >= cap) break;
                if (groups.TryGetValue(key, out var q) && q.Count > 0)
                    result.Add(q.Dequeue());
            }
            order = order.Where(k => groups.TryGetValue(k, out var q) && q.Count > 0).ToList();
        }

        return result;
    }

    private static decimal CalculatePostPopularity(PostEntity post)
    {
        var rating = Math.Min(post.AvgRating ?? 0m, 5m) / 5m;
        return rating;
    }

    private static decimal CalculateRoutePopularity(RouteEntity route)
    {
        var views = Math.Min((decimal)route.ViewCount, 200m) / 200m * 4m;
        var saves = Math.Min((decimal)route.SaveCount, 80m) / 80m * 6m;
        return views + saves;
    }

    private static void AddWeight<TKey>(Dictionary<TKey, decimal> weights, TKey key, decimal weight)
        where TKey : notnull
    {
        weights[key] = weights.TryGetValue(key, out var current) ? current + weight : weight;
    }

    private sealed class PreferenceProfile
    {
    public int SignalCount { get; set; }
    public bool HasSignals => SignalCount > 0;
    public Dictionary<string, decimal> TagWeights { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, decimal> PostTypeWeights { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<uint, decimal> RegionWeights { get; } = new();
    }

    // ── Recenzije ruta ───────────────────────────────────────────────────

    public async Task<PagedResult<ReviewSummary>> GetRouteReviewsAsync(
        GetRouteReviewsRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_route_reviews: routeId={RouteId} limit={Limit}", request.RouteId, request.Limit);

        var routeExists = await _db.Routes.AsNoTracking()
            .AnyAsync(x => x.Id == request.RouteId && x.Status == "published", cancellationToken);

        if (!routeExists)
        {
            _logger.LogWarning("tourism_get_route_reviews: route {RouteId} not found", request.RouteId);
            return new PagedResult<ReviewSummary>([], 0, false);
        }

        var query = _db.Reviews.AsNoTracking()
            .Include(x => x.Tourist)
            .Where(x => x.RouteId == request.RouteId);

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
                x.Id, null, x.RouteId,
                x.Tourist != null ? x.Tourist.Name : null,
                x.Rating, x.Comment, x.IsApproved, x.CreatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResult<ReviewSummary>(items, total, request.Offset + items.Count < total);
    }

    // ── Analitika regija ───────────────────────────────────────────────

    public async Task<RegionAnalyticsSummary?> GetRegionAnalyticsAsync(
        GetRegionAnalyticsRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_region_analytics: regionId={RegionId}", request.RegionId);

        var region = await _db.Regions.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.RegionId && x.IsActive, cancellationToken);

        if (region is null) return null;

        var posts = await _db.Posts.AsNoTracking()
            .Where(x => x.RegionId == request.RegionId && x.Status == "published")
            .ToListAsync(cancellationToken);

        var postIds = posts.Select(x => x.Id).ToList();

        var totalRoutes = await _db.Routes.AsNoTracking()
            .CountAsync(x => x.RegionId == request.RegionId && x.Status == "published", cancellationToken);

        var viewsTask = _db.PostViews.AsNoTracking()
            .CountAsync(x => postIds.Contains(x.PostId), cancellationToken);
        var likesTask = _db.PostLikes.AsNoTracking()
            .CountAsync(x => postIds.Contains(x.PostId), cancellationToken);
        var sharesTask = _db.ContentShares.AsNoTracking()
            .CountAsync(x => x.PostId.HasValue && postIds.Contains(x.PostId.Value), cancellationToken);

        await Task.WhenAll(viewsTask, likesTask, sharesTask);

        var postsByType = posts
            .GroupBy(x => x.PostType)
            .ToDictionary(g => g.Key, g => g.Count());

        var avgRating = posts.Where(x => x.AvgRating.HasValue).Any()
            ? (double?)posts.Where(x => x.AvgRating.HasValue).Average(x => (double)x.AvgRating!.Value)
            : null;

        return new RegionAnalyticsSummary(
            region.Id, region.Name, region.Type,
            posts.Count, totalRoutes,
            viewsTask.Result, likesTask.Result, sharesTask.Result,
            avgRating, postsByType);
    }

    // ── Novi sadržaj ─────────────────────────────────────────────────────

    public async Task<IReadOnlyList<NewContentItem>> GetNewContentAsync(
        GetNewContentRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_new_content: regionId={RegionId} daysBack={DaysBack}",
            request.RegionId, request.DaysBack);

        var cutoff = DateTime.UtcNow.AddDays(-Math.Abs(request.DaysBack));

        var postQuery = _db.Posts.AsNoTracking()
            .Where(x => x.Status == "published" && x.PublishedAt != null && x.PublishedAt >= cutoff);

        if (request.RegionId.HasValue)
            postQuery = postQuery.Where(x => x.RegionId == request.RegionId.Value);

        var newPosts = await postQuery
            .OrderByDescending(x => x.PublishedAt)
            .Take(request.Limit)
            .Select(x => new NewContentItem(
                x.Id, "post", x.Title, x.PostType, x.RegionId, null,
                x.PublishedAt!.Value,
                x.AvgRating.HasValue ? (double?)x.AvgRating.Value : null))
            .ToListAsync(cancellationToken);

        var routeQuery = _db.Routes.AsNoTracking()
            .Where(x => x.Status == "published" && x.CreatedAt >= cutoff);

        if (request.RegionId.HasValue)
            routeQuery = routeQuery.Where(x => x.RegionId == request.RegionId.Value);

        var newRoutes = await routeQuery
            .OrderByDescending(x => x.CreatedAt)
            .Take(request.Limit)
            .Select(x => new NewContentItem(
                x.Id, "route", x.Name, "route", x.RegionId, null,
                x.CreatedAt, null))
            .ToListAsync(cancellationToken);

        return newPosts
            .Concat(newRoutes)
            .OrderByDescending(x => x.PublishedAt)
            .Take(request.Limit)
            .ToList();
    }

    // ── Trend poseta ───────────────────────────────────────────────────

    public async Task<IReadOnlyList<VisitTrendPoint>> GetVisitTrendsAsync(
        GetVisitTrendsRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_visit_trends: regionId={RegionId} from={From} to={To}",
            request.RegionId, request.FromDate, request.ToDate);

        var fromDate = request.FromDate ?? DateTime.UtcNow.AddDays(-30);
        var toDate = request.ToDate ?? DateTime.UtcNow;

        var query = _db.PostViews.AsNoTracking()
            .Where(x => x.ViewedAt >= fromDate && x.ViewedAt <= toDate);

        if (request.RegionId.HasValue)
        {
            var postIds = await _db.Posts.AsNoTracking()
                .Where(p => p.RegionId == request.RegionId.Value && p.Status == "published")
                .Select(p => p.Id)
                .ToListAsync(cancellationToken);

            query = query.Where(x => postIds.Contains(x.PostId));
        }

        var grouped = await query
            .GroupBy(x => x.ViewedAt.Date.Year * 10000 + x.ViewedAt.Date.Month * 100 + x.ViewedAt.Date.Day)
            .Select(g => new { DateKey = g.Key, Count = g.Count() })
            .OrderBy(x => x.DateKey)
            .ToListAsync(cancellationToken);

        return grouped
            .Select(x =>
            {
                var year  = x.DateKey / 10000;
                var month = (x.DateKey % 10000) / 100;
                var day   = x.DateKey % 100;
                return new VisitTrendPoint($"{year:D4}-{month:D2}-{day:D2}", x.Count);
            })
            .ToList();
    }

    // ── Sačuvane lokacije ───────────────────────────────────────────────

    public async Task<PagedResult<SavedPostSummary>> GetSavedPostsAsync(
        GetSavedPostsRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_saved_posts: touristId={TouristId}", request.TouristId);

        var query = _db.SavedPosts.AsNoTracking()
            .Include(x => x.Post)
            .Where(x => x.Post != null && x.Post.Status == "published");

        if (request.TouristId.HasValue)
            query = query.Where(x => x.TouristId == request.TouristId.Value);

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Skip(request.Offset)
            .Take(request.Limit)
            .ToListAsync(cancellationToken);

        var summaries = items
            .Select(x => new SavedPostSummary(
                x.Id, x.PostId, x.TouristId,
                x.Post!.Title, x.Post.PostType, x.Post.RegionId,
                x.Post.AvgRating.HasValue ? (double?)x.Post.AvgRating.Value : null,
                x.CreatedAt))
            .ToList();

        return new PagedResult<SavedPostSummary>(summaries, total, request.Offset + summaries.Count < total);
    }

    // ── Planeri putovanja ─────────────────────────────────────────────

    public async Task<IReadOnlyList<PlannerSummary>> GetTouristPlannersAsync(
        GetTouristPlannerRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_tourist_planner: touristId={TouristId}", request.TouristId);

        var query = _db.VisitPlanners.AsNoTracking()
            .Include(x => x.Items)
                .ThenInclude(i => i.Post)
            .Include(x => x.Items)
                .ThenInclude(i => i.Route)
            .Where(x => x.TouristId == request.TouristId);

        if (request.OnlyPublic)
            query = query.Where(x => x.IsPublic);

        var planners = await query
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        return planners.Select(p => new PlannerSummary(
            p.Id, p.TouristId, p.Title,
            p.StartDate, p.EndDate, p.Notes, p.IsPublic,
            p.Items
                .GroupBy(i => i.DayNumber)
                .OrderBy(g => g.Key)
                .Select(g => new PlannerDaySummary(
                    g.Key,
                    g.OrderBy(i => i.OrderInDay)
                        .Select(i => new PlannerItemSummary(
                            i.Id, i.DayNumber, i.OrderInDay,
                            i.PostId.HasValue ? "post" : "route",
                            i.PostId, i.RouteId,
                            i.Post?.Title ?? i.Route?.Name,
                            i.Notes, i.ScheduledTime))
                        .ToList()))
                .ToList())
        ).ToList();
    }

    // ── Aktivnosti sa kapacitetom ───────────────────────────────────────────

    public async Task<IReadOnlyList<TagSummary>> SearchActivitiesAsync(
        SearchActivitiesRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_search_activities: query={Query} category={Category} minCap={Min} maxCap={Max}",
            request.Query, request.Category, request.MinCapacity, request.MaxCapacity);

        var query = _db.Tags.AsNoTracking()
            .Include(x => x.PostTags)
            .Where(x => x.Category == "aktivnost");

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            var s = request.Query.Trim();
            query = query.Where(x =>
                EF.Functions.ILike(x.Name, $"%{s}%") ||
                (x.Description != null && EF.Functions.ILike(x.Description, $"%{s}%")));
        }

        // Kategorija aktivnosti je u Category koloni (ne u Color) — filtriramo direktno
        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            // AI šalje SPORT, ADVENTURE itd. — mapiramo na Category = "aktivnost"
            // i filtriramo po Color prefiksu samo za subkategorije
            var cat = request.Category.Trim().ToUpper();

            // Ako korisnik traži po subkategoriji aktivnosti (SPORT, ADVENTURE, WELLNESS...)
            // Category je uvijek "aktivnost", a subkategorija je enkodovana u Color
            query = query.Where(x => x.Color != null && x.Color.ToUpper().StartsWith(cat + "|"));
        }

        if (!string.IsNullOrWhiteSpace(request.Difficulty))
            query = query.Where(x => x.Difficulty == request.Difficulty.Trim().ToUpper());

        if (request.MinCapacity.HasValue)
            query = query.Where(x => x.MaxCapacity != null && x.MaxCapacity >= request.MinCapacity.Value);

        if (request.MaxCapacity.HasValue)
            query = query.Where(x => x.MaxCapacity != null && x.MaxCapacity <= request.MaxCapacity.Value);

        var tags = await query
            .OrderBy(x => x.Name)
            .Take(request.Limit)
            .ToListAsync(cancellationToken);

        return tags.Select(x => new TagSummary(
            x.Id, x.Name, x.Category, x.Description,
            x.Difficulty, x.Duration, x.MaxCapacity,
            x.PostTags.Count)).ToList();
    }

    // Omiljene lokacije i rute (TouristFavorite) ────────────────────

    public async Task<PagedResult<TouristFavoriteSummary>> GetTouristFavoritesAsync(
        GetTouristFavoritesRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_tourist_favorites: touristId={TouristId} entityType={EntityType}",
            request.TouristId, request.EntityType);

        var query = _db.TouristFavorites.AsNoTracking()
            .Include(x => x.Post)
            .Include(x => x.Route)
            .AsQueryable();

        if (request.TouristId.HasValue)
            query = query.Where(x => x.TouristId == request.TouristId.Value);

        // Filter po tipu: post ili route
        if (!string.IsNullOrWhiteSpace(request.EntityType))
        {
            if (request.EntityType.ToLower() == "post")
                query = query.Where(x => x.PostId != null);
            else if (request.EntityType.ToLower() == "route")
                query = query.Where(x => x.RouteId != null);
        }

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.SavedAt)
            .Skip(request.Offset)
            .Take(request.Limit)
            .ToListAsync(cancellationToken);

        var summaries = items.Select(x => new TouristFavoriteSummary(
            x.Id,
            x.TouristId,
            x.PostId != null ? "post" : "route",
            x.PostId,
            x.RouteId,
            x.Post?.Title ?? x.Route?.Name,
            x.Post?.PostType,
            x.Post?.RegionId ?? x.Route?.RegionId,
            x.SavedAt)).ToList();

        return new PagedResult<TouristFavoriteSummary>(summaries, total, request.Offset + summaries.Count < total);
    }

    // Klikovi na external URL ─────────────────────────────────────

    public async Task<IReadOnlyList<ExternalClickSummary>> GetExternalClickStatsAsync(
        GetExternalClickStatsRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_external_click_stats: postId={PostId} regionId={RegionId}",
            request.PostId, request.RegionId);

        var postQuery = _db.Posts.AsNoTracking()
            .Where(x => x.Status == "published" && x.ExternalUrl != null && x.ExternalUrl != "");

        if (request.PostId.HasValue)
            postQuery = postQuery.Where(x => x.Id == request.PostId.Value);

        if (request.RegionId.HasValue)
            postQuery = postQuery.Where(x => x.RegionId == request.RegionId.Value);

        var posts = await postQuery.ToListAsync(cancellationToken);
        var postIds = posts.Select(x => x.Id).ToList();

        var clickCounts = await _db.ExternalClicks.AsNoTracking()
            .Where(x => postIds.Contains(x.PostId))
            .GroupBy(x => x.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var clickDict = clickCounts.ToDictionary(x => x.PostId, x => x.Count);

        return posts
            .Select(p => new ExternalClickSummary(
                p.Id, p.Title, p.PostType, p.RegionId,
                p.ExternalUrl,
                clickDict.TryGetValue(p.Id, out var c) ? c : 0))
            .OrderByDescending(x => x.TotalClicks)
            .Take(request.Limit)
            .ToList();
    }

    // ── Zahtevi za pravac ─────────────────────────────────────────

    public async Task<IReadOnlyList<DirectionRequestSummary>> GetDirectionStatsAsync(
        GetDirectionStatsRequest request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("tourism_get_direction_stats: regionId={RegionId}", request.RegionId);

        var postQuery = _db.Posts.AsNoTracking()
            .Where(x => x.Status == "published");

        if (request.RegionId.HasValue)
            postQuery = postQuery.Where(x => x.RegionId == request.RegionId.Value);

        var posts = await postQuery.ToListAsync(cancellationToken);
        var postIds = posts.Select(x => x.Id).ToList();

        var directionCounts = await _db.DirectionRequests.AsNoTracking()
            .Where(x => postIds.Contains(x.PostId))
            .GroupBy(x => x.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var dirDict = directionCounts.ToDictionary(x => x.PostId, x => x.Count);

        return posts
            .Select(p => new DirectionRequestSummary(
                p.Id, p.Title, p.PostType, p.RegionId,
                p.Lat, p.Lng,
                dirDict.TryGetValue(p.Id, out var c) ? c : 0))
            .OrderByDescending(x => x.TotalRequests)
            .Take(request.Limit)
            .ToList();
    }
}
