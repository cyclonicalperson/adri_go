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

    public async Task<IReadOnlyList<RegionSummary>> SearchRegionsAsync(
        SearchRegionsRequest request, CancellationToken cancellationToken)
    {
        var query = _db.Regions.AsNoTracking().Where(x => x.IsActive);

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            var s = request.Query.Trim();
            query = query.Where(x => x.Name.Contains(s) || (x.Description != null && x.Description.Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(request.Type))
            query = query.Where(x => x.Type == request.Type);

        return await query
            .OrderBy(x => x.Name)
            .Take(request.Limit)
            .Select(x => new RegionSummary(x.Id, x.Name, x.Type, x.Description, x.Country, x.Lat, x.Lng))
            .ToListAsync(cancellationToken);
    }

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
                x.Title.Contains(s) ||
                (x.Description != null && x.Description.Contains(s)) ||
                (x.Address != null && x.Address.Contains(s)));
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

    public async Task<IReadOnlyList<RouteSummary>> SearchRoutesAsync(
        SearchRoutesRequest request, CancellationToken cancellationToken)
    {
        var query = _db.Routes.AsNoTracking().Where(x => x.Status == "published");

        if (request.RegionId.HasValue)
            query = query.Where(x => x.RegionId == request.RegionId.Value);

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            var s = request.Query.Trim();
            query = query.Where(x => x.Name.Contains(s) || (x.Description != null && x.Description.Contains(s)));
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