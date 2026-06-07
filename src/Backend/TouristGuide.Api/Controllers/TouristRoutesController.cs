using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.DTOs;
using TouristGuide.Api.Models;
using TouristGuide.Api.Services;
using RouteModel = TouristGuide.Api.Models.Route;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/tourist-routes")]
    [Authorize(Roles = "tourist")]
    public class TouristRoutesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly RouteSafetyService _routeSafetyService;

        public TouristRoutesController(AppDbContext db, RouteSafetyService routeSafetyService)
        {
            _db = db;
            _routeSafetyService = routeSafetyService;
        }

        [HttpGet]
        public async Task<IActionResult> GetMine()
        {
            var touristId = GetCurrentTouristId();
            if (touristId is null)
                return Unauthorized();

            var routes = await _db.TouristRoutes
                .AsNoTracking()
                .Where(route => route.TouristId == touristId.Value)
                .OrderByDescending(route => route.UpdatedAt)
                .ThenByDescending(route => route.CreatedAt)
                .ToListAsync();

            return Ok(new
            {
                total = routes.Count,
                data = routes.Select(MapToDto),
            });
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(uint id)
        {
            var touristId = GetCurrentTouristId();
            if (touristId is null)
                return Unauthorized();

            var route = await _db.TouristRoutes
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == id && item.TouristId == touristId.Value);

            if (route is null)
                return NotFound(new { message = "Private route not found." });

            return Ok(new { data = MapToDto(route), success = true });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TouristRouteUpsertDto? request)
        {
            var touristId = GetCurrentTouristId();
            if (touristId is null)
                return Unauthorized();

            if (request is null)
                return BadRequest(new { message = "Route details are required." });

            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(new { message = "Route title is required." });

            var routeValidation = await _routeSafetyService.ValidateWaypointsJsonAsync(request.Waypoints, HttpContext.RequestAborted);
            if (!routeValidation.IsValid)
                return BadRequest(new { message = routeValidation.Message });

            var sourceRoute = await ResolveSourceRouteAsync(request.SourceRouteId);
            if (request.SourceRouteId.HasValue && sourceRoute is null)
                return NotFound(new { message = "Source route not found." });

            var now = DateTime.UtcNow;
            var route = new TouristRoute
            {
                TouristId = touristId.Value,
                SourceRouteId = sourceRoute?.Id,
                Title = request.Title.Trim(),
                Waypoints = request.Waypoints,
                ImageUrl = await ResolveCoverImageAsync(request.Waypoints, sourceRoute),
                TravelMode = NormalizeTravelMode(request.TravelMode),
                ScenicMode = request.ScenicMode,
                DistanceKm = request.DistanceKm,
                DurationMin = request.DurationMin,
                CreatedAt = now,
                UpdatedAt = now,
            };

            _db.TouristRoutes.Add(route);
            await _db.SaveChangesAsync();

            return Ok(new { data = MapToDto(route), success = true });
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(uint id, [FromBody] TouristRouteUpsertDto? request)
        {
            var touristId = GetCurrentTouristId();
            if (touristId is null)
                return Unauthorized();

            if (request is null)
                return BadRequest(new { message = "Route details are required." });

            var route = await _db.TouristRoutes
                .FirstOrDefaultAsync(item => item.Id == id && item.TouristId == touristId.Value);

            if (route is null)
                return NotFound(new { message = "Private route not found." });

            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(new { message = "Route title is required." });

            var routeValidation = await _routeSafetyService.ValidateWaypointsJsonAsync(request.Waypoints, HttpContext.RequestAborted);
            if (!routeValidation.IsValid)
                return BadRequest(new { message = routeValidation.Message });

            var sourceRoute = await ResolveSourceRouteAsync(request.SourceRouteId);
            if (request.SourceRouteId.HasValue && sourceRoute is null)
                return NotFound(new { message = "Source route not found." });

            route.SourceRouteId = sourceRoute?.Id;
            route.Title = request.Title.Trim();
            route.Waypoints = request.Waypoints;
            route.ImageUrl = await ResolveCoverImageAsync(request.Waypoints, sourceRoute);
            route.TravelMode = NormalizeTravelMode(request.TravelMode);
            route.ScenicMode = request.ScenicMode;
            route.DistanceKm = request.DistanceKm;
            route.DurationMin = request.DurationMin;
            route.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new { data = MapToDto(route), success = true });
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(uint id)
        {
            var touristId = GetCurrentTouristId();
            if (touristId is null)
                return Unauthorized();

            var route = await _db.TouristRoutes
                .FirstOrDefaultAsync(item => item.Id == id && item.TouristId == touristId.Value);

            if (route is null)
                return NotFound(new { message = "Private route not found." });

            _db.TouristRoutes.Remove(route);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Route removed from your saved routes." });
        }

        private uint? GetCurrentTouristId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return uint.TryParse(raw, out var id) ? id : null;
        }

        private async Task<RouteModel?> ResolveSourceRouteAsync(uint? sourceRouteId)
        {
            if (!sourceRouteId.HasValue)
                return null;

            return await _db.Routes
                .AsNoTracking()
                .FirstOrDefaultAsync(route => route.Id == sourceRouteId.Value && route.Status == "published");
        }

        private async Task<string?> ResolveCoverImageAsync(string? waypointsJson, RouteModel? sourceRoute)
        {
            if (sourceRoute is not null)
                return ExtractFirstImage(sourceRoute.Images);

            var coverPostId = ExtractFirstWaypointPostId(waypointsJson);
            if (coverPostId is null)
                return null;

            var coverPost = await _db.Posts
                .AsNoTracking()
                .FirstOrDefaultAsync(post => post.Id == coverPostId.Value);

            return ExtractFirstImage(coverPost?.Images);
        }

        private static TouristRouteResponseDto MapToDto(TouristRoute route) => new()
        {
            TouristRouteId = route.Id,
            TouristId = route.TouristId,
            SourceRouteId = route.SourceRouteId,
            Title = route.Title,
            Waypoints = route.Waypoints,
            ImageUrl = route.ImageUrl,
            TravelMode = route.TravelMode,
            ScenicMode = route.ScenicMode,
            DistanceKm = route.DistanceKm,
            DurationMin = route.DurationMin,
            CreatedAt = route.CreatedAt,
            UpdatedAt = route.UpdatedAt,
        };

        private static string NormalizeTravelMode(string? mode)
        {
            var normalized = (mode ?? "driving").Trim().ToLowerInvariant();
            return normalized switch
            {
                "walking" => "walking",
                "cycling" => "cycling",
                _ => "driving",
            };
        }

        private static string? ExtractFirstImage(string? imagesJson)
        {
            try
            {
                var arr = JsonSerializer.Deserialize<string[]>(imagesJson ?? "[]") ?? Array.Empty<string>();
                return arr.FirstOrDefault();
            }
            catch
            {
                return null;
            }
        }

        private static uint? ExtractFirstWaypointPostId(string? waypointsJson)
        {
            if (string.IsNullOrWhiteSpace(waypointsJson))
                return null;

            try
            {
                using var document = JsonDocument.Parse(waypointsJson);
                if (document.RootElement.ValueKind != JsonValueKind.Array)
                    return null;

                foreach (var item in document.RootElement.EnumerateArray())
                {
                    if (!item.TryGetProperty("id", out var idProperty))
                        continue;

                    if (!idProperty.TryGetInt64(out var rawId) || rawId <= 0)
                        continue;

                    return (uint)rawId;
                }
            }
            catch
            {
            }

            return null;
        }
    }
}
