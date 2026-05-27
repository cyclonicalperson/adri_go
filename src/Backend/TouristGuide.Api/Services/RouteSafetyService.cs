using System.Globalization;
using System.Text.Json;

namespace TouristGuide.Api.Services
{
    public sealed record RouteSafetyResult(bool IsValid, string? Message = null)
    {
        public static RouteSafetyResult Valid() => new(true);
        public static RouteSafetyResult Invalid(string message) => new(false, message);
    }

    public sealed class RouteSafetyService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<RouteSafetyService> _logger;

        private static readonly string[] Profiles = { "foot", "driving" };

        public RouteSafetyService(
            IHttpClientFactory httpClientFactory,
            ILogger<RouteSafetyService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<RouteSafetyResult> ValidateWaypointsJsonAsync(string? waypointsJson, CancellationToken ct = default)
        {
            var parseResult = TryParseWaypoints(waypointsJson);
            if (!parseResult.IsValid)
                return RouteSafetyResult.Invalid(parseResult.Message!);

            var waypoints = parseResult.Waypoints;
            if (waypoints.Count < 2)
                return RouteSafetyResult.Valid();

            var client = _httpClientFactory.CreateClient("RouteValidation");
            if (!await HasRoutableRouteAsync(client, waypoints, ct))
                return RouteSafetyResult.Invalid(
                    "Ruta nije routabilna. Pomerite tacke na kopno/put i izbegnite vodene povrsine.");

            return RouteSafetyResult.Valid();
        }

        private async Task<bool> HasRoutableRouteAsync(
            HttpClient client,
            IReadOnlyList<RoutePoint> points,
            CancellationToken ct)
        {
            foreach (var profile in Profiles)
            {
                try
                {
                    using var response = await client.GetAsync(BuildOsrmUrl(points, profile), ct);
                    if (!response.IsSuccessStatusCode)
                        continue;

                    await using var stream = await response.Content.ReadAsStreamAsync(ct);
                    using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("code", out var code)
                        && !string.Equals(code.GetString(), "Ok", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (root.TryGetProperty("routes", out var routes)
                        && routes.ValueKind == JsonValueKind.Array
                        && routes.GetArrayLength() > 0)
                    {
                        if (ContainsFerrySegment(routes[0]) || HasSuspiciousGeometryJump(routes[0]))
                            continue;

                        return true;
                    }
                }
                catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
                {
                    _logger.LogWarning(ex, "Route validation failed for profile {Profile}.", profile);
                }
            }

            return false;
        }

        private static string BuildOsrmUrl(IReadOnlyList<RoutePoint> points, string profile)
        {
            var baseUrl = profile == "foot"
                ? "https://routing.openstreetmap.de/routed-foot/route/v1/foot"
                : "https://routing.openstreetmap.de/routed-car/route/v1/driving";
            var coordinates = string.Join(';', points.Select(point =>
                string.Create(CultureInfo.InvariantCulture, $"{point.Lng},{point.Lat}")));

            return string.Create(CultureInfo.InvariantCulture,
                $"{baseUrl}/{coordinates}?overview=full&geometries=geojson&steps=true&alternatives=false&continue_straight=false");
        }

        private static bool ContainsFerrySegment(JsonElement element)
        {
            switch (element.ValueKind)
            {
                case JsonValueKind.String:
                    var value = element.GetString();
                    return !string.IsNullOrWhiteSpace(value)
                        && (value.Contains("ferry", StringComparison.OrdinalIgnoreCase)
                            || value.Contains("trajekt", StringComparison.OrdinalIgnoreCase)
                            || value.Contains("boat", StringComparison.OrdinalIgnoreCase)
                            || value.Contains("ship", StringComparison.OrdinalIgnoreCase));

                case JsonValueKind.Array:
                    foreach (var item in element.EnumerateArray())
                    {
                        if (ContainsFerrySegment(item))
                            return true;
                    }
                    return false;

                case JsonValueKind.Object:
                    foreach (var property in element.EnumerateObject())
                    {
                        if (ContainsFerrySegment(property.Value))
                            return true;
                    }
                    return false;

                default:
                    return false;
            }
        }

        private static bool HasSuspiciousGeometryJump(JsonElement route)
        {
            if (!route.TryGetProperty("geometry", out var geometry)
                || !geometry.TryGetProperty("coordinates", out var coordinates)
                || coordinates.ValueKind != JsonValueKind.Array
                || coordinates.GetArrayLength() < 2)
            {
                return false;
            }

            JsonElement? previous = null;
            foreach (var current in coordinates.EnumerateArray())
            {
                if (previous is { } previousValue
                    && TryReadCoordinate(previousValue, out var previousPoint)
                    && TryReadCoordinate(current, out var currentPoint)
                    && HaversineKm(previousPoint, currentPoint) > 8d)
                {
                    return true;
                }

                previous = current;
            }

            return false;
        }

        private static bool TryReadCoordinate(JsonElement coordinate, out RoutePoint point)
        {
            point = new RoutePoint(0, 0);
            if (coordinate.ValueKind != JsonValueKind.Array || coordinate.GetArrayLength() < 2)
                return false;

            var lngElement = coordinate[0];
            var latElement = coordinate[1];
            if (!lngElement.TryGetDouble(out var lng) || !latElement.TryGetDouble(out var lat))
                return false;

            if (!double.IsFinite(lat) || !double.IsFinite(lng))
                return false;

            point = new RoutePoint(lat, lng);
            return true;
        }

        private static double HaversineKm(RoutePoint start, RoutePoint end)
        {
            const double earthRadiusKm = 6371d;
            var dLat = ToRadians(end.Lat - start.Lat);
            var dLng = ToRadians(end.Lng - start.Lng);
            var startLat = ToRadians(start.Lat);
            var endLat = ToRadians(end.Lat);
            var a = Math.Pow(Math.Sin(dLat / 2d), 2d)
                + Math.Cos(startLat) * Math.Cos(endLat) * Math.Pow(Math.Sin(dLng / 2d), 2d);
            return 2d * earthRadiusKm * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1d - a));
        }

        private static double ToRadians(double value) => value * Math.PI / 180d;

        private static ParseResult TryParseWaypoints(string? waypointsJson)
        {
            if (string.IsNullOrWhiteSpace(waypointsJson))
                return ParseResult.Valid(new List<RoutePoint>());

            try
            {
                using var doc = JsonDocument.Parse(waypointsJson);
                if (doc.RootElement.ValueKind != JsonValueKind.Array)
                    return ParseResult.Invalid("Waypoint podaci moraju biti JSON niz.");

                var points = new List<RoutePoint>();
                foreach (var element in doc.RootElement.EnumerateArray())
                {
                    if (element.ValueKind != JsonValueKind.Object)
                        continue;

                    if (!TryReadNumber(element, "lat", "latitude", out var lat)
                        || !TryReadNumber(element, "lng", "longitude", out var lng))
                    {
                        return ParseResult.Invalid("Svaka tacka rute mora imati lat i lng koordinate.");
                    }

                    if (lat < -90 || lat > 90 || lng < -180 || lng > 180)
                        return ParseResult.Invalid("Koordinate rute nisu validne.");

                    points.Add(new RoutePoint(lat, lng));
                }

                return ParseResult.Valid(points);
            }
            catch (JsonException)
            {
                return ParseResult.Invalid("Waypoint podaci nisu validan JSON.");
            }
        }

        private static bool TryReadNumber(JsonElement element, string primaryName, string fallbackName, out double value)
        {
            value = 0;
            JsonElement property;
            if (!element.TryGetProperty(primaryName, out property)
                && !element.TryGetProperty(fallbackName, out property))
            {
                return false;
            }

            if (property.ValueKind == JsonValueKind.Number && property.TryGetDouble(out value))
                return double.IsFinite(value);

            return property.ValueKind == JsonValueKind.String
                && double.TryParse(property.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out value)
                && double.IsFinite(value);
        }

        private sealed record RoutePoint(double Lat, double Lng);

        private sealed record ParseResult(bool IsValid, List<RoutePoint> Waypoints, string? Message)
        {
            public static ParseResult Valid(List<RoutePoint> waypoints) => new(true, waypoints, null);
            public static ParseResult Invalid(string message) => new(false, new List<RoutePoint>(), message);
        }
    }
}
