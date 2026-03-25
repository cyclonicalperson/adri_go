using Mcp.Data;
using Mcp.Dtos;
using Microsoft.EntityFrameworkCore;

namespace Mcp.Services;

internal sealed class TourismQueryService : ITourismQueryService
{
    private readonly McpDbContext _dbContext;

    public TourismQueryService(McpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<DestinationSummary>> SearchDestinationsAsync(SearchDestinationsRequest request, CancellationToken cancellationToken)
    {
        var query = _dbContext.Destinations
            .AsNoTracking()
            .Where(x => x.IsActive && x.Status == "published");

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            var search = request.Query.Trim();
            query = query.Where(x =>
                x.Name.Contains(search) ||
                x.Description.Contains(search) ||
                (x.City != null && x.City.Contains(search)) ||
                (x.Region != null && x.Region.Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(request.City))
        {
            var city = request.City.Trim();
            query = query.Where(x => x.City != null && x.City.Contains(city));
        }

        if (!string.IsNullOrWhiteSpace(request.Region))
        {
            var region = request.Region.Trim();
            query = query.Where(x => x.Region != null && x.Region.Contains(region));
        }

        if (request.Types is { Count: > 0 })
        {
            query = query.Where(x => request.Types.Contains(x.Type));
        }

        return await query
            .OrderBy(x => x.Name)
            .Take(request.Limit)
            .Select(x => new DestinationSummary(
                x.DestinationId,
                x.Name,
                x.Type,
                x.City,
                x.Region,
                x.Latitude,
                x.Longitude,
                x.Description))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<RouteSummary>> SearchRoutesAsync(SearchRoutesRequest request, CancellationToken cancellationToken)
    {
        var query = _dbContext.Routes
            .AsNoTracking()
            .Where(x => x.IsActive && x.Status == "published");

        if (request.DestinationId.HasValue)
        {
            query = query.Where(x => x.DestinationId == request.DestinationId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            var search = request.Query.Trim();
            query = query.Where(x => x.Name.Contains(search) || x.Description.Contains(search));
        }

        if (request.RouteTypes is { Count: > 0 })
        {
            query = query.Where(x => request.RouteTypes.Contains(x.RouteType));
        }

        if (request.Difficulties is { Count: > 0 })
        {
            query = query.Where(x => request.Difficulties.Contains(x.Difficulty));
        }

        if (request.MaxDistanceKm.HasValue)
        {
            query = query.Where(x => x.DistanceKm <= request.MaxDistanceKm.Value);
        }

        if (request.MaxDurationMinutes.HasValue)
        {
            query = query.Where(x => x.DurationMin <= request.MaxDurationMinutes.Value);
        }

        if (request.MaxElevationGainM.HasValue)
        {
            query = query.Where(x => x.ElevationGainM <= request.MaxElevationGainM.Value);
        }

        if (request.MinRating.HasValue)
        {
            var minRating = (decimal)request.MinRating.Value;
            query = query.Where(x => x.AvgRating >= minRating);
        }

        return await query
            .OrderByDescending(x => x.AvgRating)
            .ThenBy(x => x.DistanceKm)
            .Take(request.Limit)
            .Select(x => new RouteSummary(
                x.RouteId,
                x.DestinationId,
                x.Name,
                x.RouteType,
                x.Difficulty,
                x.DistanceKm,
                x.DurationMin,
                x.ElevationGainM,
                x.AvgRating.HasValue ? (double?)x.AvgRating.Value : null,
                x.Description))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<EventSummary>> SearchEventsAsync(SearchEventsRequest request, CancellationToken cancellationToken)
    {
        var query =
            from evt in _dbContext.Events.AsNoTracking()
            join obj in _dbContext.Objects.AsNoTracking() on evt.ObjectId equals obj.ObjectId into objectJoin
            from venueObject in objectJoin.DefaultIfEmpty()
            where evt.IsActive && evt.Status == "published"
            select new
            {
                Event = evt,
                VenueName = venueObject != null ? venueObject.Name : null
            };

        if (request.DestinationId.HasValue)
        {
            query = query.Where(x => x.Event.DestinationId == request.DestinationId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            var search = request.Query.Trim();
            query = query.Where(x =>
                x.Event.Name.Contains(search) ||
                x.Event.Description.Contains(search));
        }

        if (request.Categories is { Count: > 0 })
        {
            query = query.Where(x => request.Categories.Contains(x.Event.Category));
        }

        if (request.FromDate.HasValue)
        {
            var from = request.FromDate.Value.ToDateTime(TimeOnly.MinValue);
            query = query.Where(x => x.Event.EndAt >= from);
        }

        if (request.ToDate.HasValue)
        {
            var to = request.ToDate.Value.ToDateTime(TimeOnly.MaxValue);
            query = query.Where(x => x.Event.StartAt <= to);
        }

        if (request.MinRating.HasValue)
        {
            var minRating = (decimal)request.MinRating.Value;
            query = query.Where(x => x.Event.AvgRating >= minRating);
        }

        return await query
            .OrderBy(x => x.Event.StartAt)
            .Take(request.Limit)
            .Select(x => new EventSummary(
                x.Event.EventId,
                x.Event.DestinationId,
                x.Event.Name,
                x.Event.Category,
                x.VenueName,
                x.Event.StartAt,
                x.Event.EndAt,
                x.Event.Description,
                x.Event.TicketUrl,
                x.Event.Latitude,
                x.Event.Longitude,
                x.Event.AvgRating.HasValue ? (double?)x.Event.AvgRating.Value : null))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AccommodationSummary>> SearchAccommodationAsync(SearchAccommodationRequest request, CancellationToken cancellationToken)
    {
        var accommodationQuery =
            from obj in _dbContext.Objects.AsNoTracking()
            join details in _dbContext.AccommodationDetails.AsNoTracking() on obj.ObjectId equals details.ObjectId
            where obj.IsActive && obj.Status == "published" && obj.Category == "Accommodation"
            select new
            {
                Object = obj,
                Details = details
            };

        if (request.DestinationId.HasValue)
        {
            accommodationQuery = accommodationQuery.Where(x => x.Object.DestinationId == request.DestinationId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            var search = request.Query.Trim();
            accommodationQuery = accommodationQuery.Where(x =>
                x.Object.Name.Contains(search) ||
                x.Object.Description.Contains(search) ||
                (x.Object.Address != null && x.Object.Address.Contains(search)));
        }

        if (request.AccommodationTypes is { Count: > 0 })
        {
            accommodationQuery = accommodationQuery.Where(x => request.AccommodationTypes.Contains(x.Details.AccommodationType));
        }

        if (request.GuestCount.HasValue)
        {
            accommodationQuery = accommodationQuery.Where(x => x.Details.GuestCapacity >= request.GuestCount.Value);
        }

        if (request.PriceMin.HasValue)
        {
            accommodationQuery = accommodationQuery.Where(x => x.Details.PricePerNight >= request.PriceMin.Value);
        }

        if (request.PriceMax.HasValue)
        {
            accommodationQuery = accommodationQuery.Where(x => x.Details.PricePerNight <= request.PriceMax.Value);
        }

        if (request.MinRating.HasValue)
        {
            var minRating = (decimal)request.MinRating.Value;
            accommodationQuery = accommodationQuery.Where(x => x.Object.AvgRating >= minRating);
        }

        var baseResults = await accommodationQuery
            .OrderByDescending(x => x.Object.AvgRating)
            .ThenBy(x => x.Details.PricePerNight)
            .ToListAsync(cancellationToken);

        var objectIds = baseResults.Select(x => x.Object.ObjectId).ToList();

        var amenityRows = await (
            from link in _dbContext.ObjectAmenities.AsNoTracking()
            join amenity in _dbContext.Amenities.AsNoTracking() on link.AmenityId equals amenity.AmenityId
            where objectIds.Contains(link.ObjectId)
            select new
            {
                link.ObjectId,
                AmenityName = amenity.Name
            })
            .ToListAsync(cancellationToken);

        var amenitiesByObjectId = amenityRows
            .GroupBy(x => x.ObjectId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<string>)group
                    .Select(x => x.AmenityName)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(x => x)
                    .ToList());

        return baseResults
            .Where(x => MatchesAllValues(
                amenitiesByObjectId.TryGetValue(x.Object.ObjectId, out var amenities) ? amenities : [],
                request.Amenities))
            .Take(request.Limit)
            .Select(x => new AccommodationSummary(
                x.Object.ObjectId,
                x.Object.DestinationId,
                x.Object.Name,
                x.Details.AccommodationType,
                x.Object.Address,
                x.Details.PricePerNight,
                x.Details.Currency,
                x.Details.GuestCapacity,
                x.Object.AvgRating.HasValue ? (double?)x.Object.AvgRating.Value : null,
                amenitiesByObjectId.TryGetValue(x.Object.ObjectId, out var amenities) ? amenities : [],
                x.Object.Description,
                x.Details.BookingUrl,
                x.Details.AirbnbUrl))
            .ToList();
    }

    private static bool MatchesAllValues(IReadOnlyList<string> availableValues, IReadOnlyList<string>? requiredValues)
    {
        if (requiredValues is not { Count: > 0 })
        {
            return true;
        }

        return requiredValues.All(value => availableValues.Contains(value, StringComparer.OrdinalIgnoreCase));
    }
}
