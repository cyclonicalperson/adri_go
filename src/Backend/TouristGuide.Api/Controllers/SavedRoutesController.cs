using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.DTOs;
using TouristGuide.Api.Models;
using RouteModel = TouristGuide.Api.Models.Route;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/saved-routes")]
    [Authorize(Roles = "tourist")]
    public class SavedRoutesController : ControllerBase
    {
        private readonly AppDbContext _db;

        public SavedRoutesController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetSavedRoutes()
        {
            var touristId = GetCurrentTouristId();
            if (touristId is null)
                return Unauthorized();

            var curatedFavorites = await _db.TouristFavorites
                .AsNoTracking()
                .Where(favorite => favorite.TouristId == touristId.Value && favorite.RouteId != null)
                .Include(favorite => favorite.Route!)
                    .ThenInclude(route => route.Region)
                .Where(favorite => favorite.Route != null && favorite.Route.Status == "published")
                .OrderByDescending(favorite => favorite.SavedAt)
                .ToListAsync();

            var touristRoutes = await _db.TouristRoutes
                .AsNoTracking()
                .Where(route => route.TouristId == touristId.Value)
                .Include(route => route.SourceRoute!)
                    .ThenInclude(source => source.Region)
                .OrderByDescending(route => route.UpdatedAt)
                .ThenByDescending(route => route.CreatedAt)
                .ToListAsync();

            var combined = curatedFavorites
                .Select(favorite => new SavedRouteFeedItem
                {
                    SortAt = favorite.SavedAt,
                    Item = MapCuratedFavorite(favorite.Route!),
                })
                .Concat(touristRoutes.Select(route => new SavedRouteFeedItem
                {
                    SortAt = route.UpdatedAt > route.CreatedAt ? route.UpdatedAt : route.CreatedAt,
                    Item = MapTouristRoute(route),
                }))
                .OrderByDescending(item => item.SortAt)
                .Select(item => item.Item)
                .ToList();

            return Ok(new
            {
                total = combined.Count,
                data = combined,
            });
        }

        private uint? GetCurrentTouristId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return uint.TryParse(raw, out var id) ? id : null;
        }

        private static SavedRouteLibraryItemDto MapCuratedFavorite(RouteModel route) => new()
        {
            Kind = "curatedFavorite",
            Badge = "Curated route",
            RouteId = route.Id,
            Title = route.Name,
            Description = route.Description,
            Waypoints = route.Waypoints,
            Images = route.Images,
            ImageUrl = ExtractFirstImage(route.Images),
            DistanceKm = route.DistanceKm,
            DurationMin = route.DurationMin,
            ElevationGainM = route.ElevationGain,
            Difficulty = route.Difficulty,
            RegionName = route.Region?.Name,
            CountryName = route.Region?.Country,
            CreatedAt = route.CreatedAt,
            UpdatedAt = route.UpdatedAt,
            IsSaved = true,
            SaveCount = route.SaveCount,
        };

        private static SavedRouteLibraryItemDto MapTouristRoute(TouristRoute route) => new()
        {
            Kind = "touristRoute",
            Badge = route.SourceRouteId.HasValue ? "Modified route" : "My route",
            TouristRouteId = route.Id,
            SourceRouteId = route.SourceRouteId,
            Title = route.Title,
            Waypoints = route.Waypoints,
            ImageUrl = route.ImageUrl,
            TravelMode = route.TravelMode,
            ScenicMode = route.ScenicMode,
            DistanceKm = route.DistanceKm,
            DurationMin = route.DurationMin,
            Difficulty = route.SourceRoute?.Difficulty,
            RegionName = route.SourceRoute?.Region?.Name,
            CountryName = route.SourceRoute?.Region?.Country,
            CreatedAt = route.CreatedAt,
            UpdatedAt = route.UpdatedAt,
            IsSaved = true,
        };

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

        private sealed class SavedRouteFeedItem
        {
            public DateTime SortAt { get; init; }
            public SavedRouteLibraryItemDto Item { get; init; } = new();
        }
    }
}
