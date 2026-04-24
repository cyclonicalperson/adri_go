using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.Models;
using TouristGuide.Api.Services;
using RouteModel = TouristGuide.Api.Models.Route;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/routes")]
    public class RoutesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly AdminPermissionService _permissionService;
        private readonly NotificationService _notifService;

        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "draft", "published", "archived"
        };

        public RoutesController(
            AppDbContext db,
            AdminPermissionService permissionService,
            NotificationService notifService)
        {
            _db = db;
            _permissionService = permissionService;
            _notifService = notifService;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(
            [FromQuery] uint? region_id,
            [FromQuery] string? difficulty,
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] string? sortBy,
            [FromQuery] string? sortDir,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _db.Routes
                .Include(r => r.Admin)
                .Include(r => r.Region)
                .AsNoTracking()
                .AsQueryable();

            var role = User.FindFirstValue(ClaimTypes.Role);
            var isAdmin = string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase)
                       || string.Equals(role, "superadmin", StringComparison.OrdinalIgnoreCase);

            if (!isAdmin)
            {
                query = query.Where(r => r.Status == "published");
            }
            else
            {
                if (!IsSuperAdmin())
                {
                    var adminId = GetCurrentAdminId();
                    if (adminId is null)
                        return Unauthorized();

                    query = query.Where(r => r.AdminId == adminId.Value);

                    var normalizedStatus = NormalizeStatus(status);
                    if (!string.IsNullOrWhiteSpace(normalizedStatus)
                        && !string.Equals(normalizedStatus, "published", StringComparison.OrdinalIgnoreCase)
                        && !await _permissionService.HasPermissionAsync("manage_own_posts", region_id))
                    {
                        return Forbid();
                    }
                }

                if (!string.IsNullOrWhiteSpace(status))
                    query = query.Where(r => r.Status == status.ToLower());
            }

            if (region_id.HasValue)
                query = query.Where(r => r.RegionId == region_id.Value);

            if (!string.IsNullOrWhiteSpace(difficulty))
                query = query.Where(r => r.Difficulty == difficulty.ToLower());

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(r => r.Name.Contains(search));

            query = (sortBy?.ToLower(), sortDir?.ToLower()) switch
            {
                ("name", "asc") => query.OrderBy(r => r.Name),
                ("name", "desc") => query.OrderByDescending(r => r.Name),
                ("distancekm", "asc") => query.OrderBy(r => r.DistanceKm),
                ("distancekm", "desc") => query.OrderByDescending(r => r.DistanceKm),
                ("durationmin", "asc") => query.OrderBy(r => r.DurationMin),
                ("durationmin", "desc") => query.OrderByDescending(r => r.DurationMin),
                ("createdat", "asc") => query.OrderBy(r => r.CreatedAt),
                _ => query.OrderByDescending(r => r.CreatedAt),
            };

            var total = await query.CountAsync();
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var routes = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)total / pageSize),
                data = routes.Select(MapToDto)
            });
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(uint id)
        {
            var route = await _db.Routes
                .Include(r => r.Admin)
                .Include(r => r.Region)
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id);

            if (route is null)
                return NotFound(new { message = $"Ruta sa ID={id} nije pronadjena." });

            if (!await CanViewRouteAsync(route))
                return NotFound(new { message = $"Ruta sa ID={id} nije pronadjena." });

            return Ok(new { data = MapToDto(route), success = true });
        }

        [HttpPost]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> Create([FromBody] UpsertRouteDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "Naziv rute je obavezan." });

            var adminId = GetCurrentAdminId();
            if (adminId is null)
                return Unauthorized();

            if (dto.RegionId.HasValue && !await _db.Regions.AnyAsync(r => r.Id == dto.RegionId.Value))
                return BadRequest(new { message = $"Regija sa ID={dto.RegionId} ne postoji." });

            if (!await CanCreateRouteAsync(dto.RegionId))
                return Forbid();

            var now = DateTime.UtcNow;
            var statusValue = NormalizeStatus(dto.Status) ?? "draft";

            var route = new RouteModel
            {
                AdminId = adminId.Value,
                RegionId = dto.RegionId,
                Name = dto.Name.Trim(),
                Difficulty = (dto.Difficulty ?? "moderate").ToLower(),
                DistanceKm = dto.DistanceKm,
                DurationMin = dto.DurationMin,
                ElevationGain = dto.ElevationGainM,
                Description = dto.Description?.Trim(),
                Waypoints = dto.Waypoints,
                Images = dto.Images,
                Status = statusValue,
                CreatedAt = now,
                UpdatedAt = now,
            };

            _db.Routes.Add(route);
            await _db.SaveChangesAsync();
            await _db.Entry(route).Reference(r => r.Admin).LoadAsync();
            await _db.Entry(route).Reference(r => r.Region).LoadAsync();

            if (string.Equals(route.Status, "draft", StringComparison.OrdinalIgnoreCase))
            {
                await _notifService.BroadcastToSuperAdminsAsync(
                    "route_pending",
                    "Nova ruta ceka pregled",
                    $"{route.Name} je poslata na pregled.",
                    new
                    {
                        routeId = route.Id,
                        route_id = route.Id,
                        url = $"/admin/routes-management/{route.Id}"
                    });
            }

            return CreatedAtAction(nameof(GetById), new { id = route.Id },
                new { data = MapToDto(route), success = true });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> Update(uint id, [FromBody] UpsertRouteDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var route = await _db.Routes
                .Include(r => r.Admin)
                .Include(r => r.Region)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (route is null)
                return NotFound(new { message = $"Ruta sa ID={id} nije pronadjena." });

            if (!await CanManageRouteAsync(route))
                return Forbid();

            if (dto.RegionId.HasValue)
            {
                if (!await _db.Regions.AnyAsync(r => r.Id == dto.RegionId.Value))
                    return BadRequest(new { message = $"Regija sa ID={dto.RegionId} ne postoji." });

                route.RegionId = dto.RegionId;
            }

            if (dto.Name is not null) route.Name = dto.Name.Trim();
            if (dto.Difficulty is not null) route.Difficulty = dto.Difficulty.ToLower();
            if (dto.DistanceKm.HasValue) route.DistanceKm = dto.DistanceKm;
            if (dto.DurationMin.HasValue) route.DurationMin = dto.DurationMin;
            if (dto.ElevationGainM.HasValue) route.ElevationGain = dto.ElevationGainM;
            if (dto.Description is not null) route.Description = dto.Description.Trim();
            if (dto.Waypoints is not null) route.Waypoints = dto.Waypoints;
            if (dto.Images is not null) route.Images = dto.Images;

            if (dto.Status is not null)
            {
                var statusValue = NormalizeStatus(dto.Status);
                if (statusValue is null)
                    return BadRequest(new { message = "Status mora biti draft, published ili archived." });

                route.Status = statusValue;
            }

            route.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { data = MapToDto(route), success = true });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> Delete(uint id)
        {
            var route = await _db.Routes.FindAsync(id);
            if (route is null)
                return NotFound(new { message = $"Ruta sa ID={id} nije pronadjena." });

            if (!await CanManageRouteAsync(route))
                return Forbid();

            _db.Routes.Remove(route);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = $"Ruta '{route.Name}' je obrisana." });
        }

        [HttpGet("{id}/reviews")]
        [AllowAnonymous]
        public async Task<IActionResult> GetReviews(uint id)
        {
            var route = await _db.Routes
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id);

            if (route is null)
                return NotFound(new { message = $"Ruta sa ID={id} nije pronadjena." });

            if (!await CanViewRouteAsync(route))
                return NotFound(new { message = $"Ruta sa ID={id} nije pronadjena." });

            var reviews = await _db.Reviews
                .Where(r => r.RouteId == id && r.Status == "APPROVED")
                .Include(r => r.Tourist)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    id = r.Id,
                    touristId = r.TouristId,
                    touristName = r.Tourist != null ? r.Tourist.Name ?? string.Empty : string.Empty,
                    rating = r.Rating,
                    comment = r.Comment,
                    createdAt = r.CreatedAt
                })
                .ToListAsync();

            return Ok(new { total = reviews.Count, data = reviews });
        }

        private uint? GetCurrentAdminId()
        {
            var val = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                   ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            return uint.TryParse(val, out var id) ? id : null;
        }

        private bool IsSuperAdmin()
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            return string.Equals(role, "superadmin", StringComparison.OrdinalIgnoreCase);
        }

        private async Task<bool> CanViewRouteAsync(RouteModel route)
        {
            if (route.Status == "published")
                return true;

            return await CanManageRouteAsync(route);
        }

        private async Task<bool> CanManageRouteAsync(RouteModel route)
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            if (!string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase))
                return IsSuperAdmin();

            return await _permissionService.CanManageOwnContentAsync(route.AdminId, route.RegionId);
        }

        private async Task<bool> CanCreateRouteAsync(uint? regionId)
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            if (!string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(role, "superadmin", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (IsSuperAdmin())
                return true;

            return await _permissionService.HasPermissionAsync("manage_own_posts", regionId)
                   && await _permissionService.HasPermissionAsync("create_route", regionId);
        }

        private static string? NormalizeStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
                return null;

            var normalized = status.Trim().ToLowerInvariant();
            return AllowedStatuses.Contains(normalized) ? normalized : null;
        }

        private static object MapToDto(RouteModel route) => new
        {
            routeId = route.Id,
            adminId = route.AdminId,
            adminName = route.Admin?.FullName ?? string.Empty,
            regionId = route.RegionId,
            destinationId = route.RegionId,
            name = route.Name,
            difficulty = route.Difficulty,
            distanceKm = route.DistanceKm,
            durationMin = route.DurationMin,
            elevationGainM = route.ElevationGain,
            description = route.Description,
            waypoints = route.Waypoints,
            images = route.Images,
            status = route.Status,
            viewCount = route.ViewCount,
            saveCount = route.SaveCount,
            createdAt = route.CreatedAt,
            updatedAt = route.UpdatedAt,
            region = route.Region == null ? null : new
            {
                regionId = route.Region.Id,
                name = route.Region.Name,
                lat = route.Region.Lat,
                lng = route.Region.Lng
            }
        };
    }

    public class UpsertRouteDto
    {
        public uint? RegionId { get; set; }
        public string? Name { get; set; }
        public string? Difficulty { get; set; }
        public decimal? DistanceKm { get; set; }
        public uint? DurationMin { get; set; }
        public uint? ElevationGainM { get; set; }
        public string? Description { get; set; }
        public string? Waypoints { get; set; }
        public string? Images { get; set; }
        public string? Status { get; set; }
    }
}
