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
            for (var index = 0; index < waypoints.Count - 1; index++)
            {
                var start = waypoints[index];
                var end = waypoints[index + 1];
                if (await HasRoutableLegAsync(client, start, end, ct))
                    continue;

                return RouteSafetyResult.Invalid(
                    $"Deonica rute izmedju tacke {index + 1} i {index + 2} nije routabilna. Pomerite tacke na kopno/put i izbegnite vodene povrsine.");
            }

            return RouteSafetyResult.Valid();
        }

        private async Task<bool> HasRoutableLegAsync(
            HttpClient client,
            RoutePoint start,
            RoutePoint end,
            CancellationToken ct)
        {
            foreach (var profile in Profiles)
            {
                try
                {
                    using var response = await client.GetAsync(BuildOsrmUrl(start, end, profile), ct);
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

        private static string BuildOsrmUrl(RoutePoint start, RoutePoint end, string profile)
        {
            var baseUrl = profile == "foot"
                ? "https://routing.openstreetmap.de/routed-foot/route/v1/foot"
                : "https://routing.openstreetmap.de/routed-car/route/v1/driving";

            return string.Create(CultureInfo.InvariantCulture,
                $"{baseUrl}/{start.Lng},{start.Lat};{end.Lng},{end.Lat}?overview=false&alternatives=false&continue_straight=false&radiuses=500;500");
        }

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
