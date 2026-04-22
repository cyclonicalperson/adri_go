using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.Models;
using RouteModel = TouristGuide.Api.Models.Route;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/routes")]
    public class RoutesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "draft", "published", "archived"
        };

        public RoutesController(AppDbContext db)
        {
            _db = db;
        }

        // ── GET /api/routes ───────────────────────────────────────────────────
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(
            [FromQuery] uint?   region_id,
            [FromQuery] string? difficulty,
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] string? sortBy,
            [FromQuery] string? sortDir,
            [FromQuery] int     page     = 1,
            [FromQuery] int     pageSize = 20)
        {
            var query = _db.Routes
                .Include(r => r.Admin)
                .Include(r => r.Region)
                .AsNoTracking()
                .AsQueryable();

            // Anonimni korisnici i turisti vide samo published
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
                    if (adminId is null) return Unauthorized();
                    query = query.Where(r => r.AdminId == adminId.Value);
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

            // Sortiranje
            query = (sortBy?.ToLower(), sortDir?.ToLower()) switch
            {
                ("name",        "asc")  => query.OrderBy(r => r.Name),
                ("name",        "desc") => query.OrderByDescending(r => r.Name),
                ("distancekm",  "asc")  => query.OrderBy(r => r.DistanceKm),
                ("distancekm",  "desc") => query.OrderByDescending(r => r.DistanceKm),
                ("durationmin", "asc")  => query.OrderBy(r => r.DurationMin),
                ("durationmin", "desc") => query.OrderByDescending(r => r.DurationMin),
                ("createdat",   "asc")  => query.OrderBy(r => r.CreatedAt),
                _                       => query.OrderByDescending(r => r.CreatedAt),
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

        // ── GET /api/routes/{id} ──────────────────────────────────────────────
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
                return NotFound(new { message = $"Ruta sa ID={id} nije pronađena." });

            var role = User.FindFirstValue(ClaimTypes.Role);
            var isAdmin = string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase)
                       || string.Equals(role, "superadmin", StringComparison.OrdinalIgnoreCase);

            if (!CanViewRoute(route))
                return NotFound(new { message = $"Ruta sa ID={id} nije pronađena." });

            return Ok(new { data = MapToDto(route), success = true });
        }

        // ── POST /api/routes ──────────────────────────────────────────────────
        [HttpPost]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> Create([FromBody] UpsertRouteDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "Naziv rute je obavezan." });

            var adminId = GetCurrentAdminId();
            if (adminId is null) return Unauthorized();

            if (dto.RegionId.HasValue)
            {
                if (!await _db.Regions.AnyAsync(r => r.Id == dto.RegionId.Value))
                    return BadRequest(new { message = $"Regija sa ID={dto.RegionId} ne postoji." });
            }

            var now = DateTime.UtcNow;
            var statusValue = NormalizeStatus(dto.Status) ?? "draft";
            var route = new RouteModel
            {
                AdminId      = adminId.Value,
                RegionId     = dto.RegionId,
                Name         = dto.Name.Trim(),
                Difficulty   = (dto.Difficulty ?? "moderate").ToLower(),
                DistanceKm   = dto.DistanceKm,
                DurationMin  = dto.DurationMin,
                ElevationGain = dto.ElevationGainM,
                Description  = dto.Description?.Trim(),
                Waypoints    = dto.Waypoints,
                Images       = dto.Images,
                Status       = statusValue,
                CreatedAt    = now,
                UpdatedAt    = now,
            };

            _db.Routes.Add(route);
            await _db.SaveChangesAsync();
            await _db.Entry(route).Reference(r => r.Admin).LoadAsync();
            await _db.Entry(route).Reference(r => r.Region).LoadAsync();

            return CreatedAtAction(nameof(GetById), new { id = route.Id },
                new { data = MapToDto(route), success = true });
        }

        // ── PUT /api/routes/{id} ──────────────────────────────────────────────
        [HttpPut("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> Update(uint id, [FromBody] UpsertRouteDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var route = await _db.Routes
                .Include(r => r.Admin)
                .Include(r => r.Region)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (route is null)
                return NotFound(new { message = $"Ruta sa ID={id} nije pronađena." });

            if (!CanManageRoute(route))
                return Forbid();

            if (dto.RegionId.HasValue)
            {
                if (!await _db.Regions.AnyAsync(r => r.Id == dto.RegionId.Value))
                    return BadRequest(new { message = $"Regija sa ID={dto.RegionId} ne postoji." });
                route.RegionId = dto.RegionId;
            }

            if (dto.Name is not null)       route.Name = dto.Name.Trim();
            if (dto.Difficulty is not null)  route.Difficulty = dto.Difficulty.ToLower();
            if (dto.DistanceKm.HasValue)     route.DistanceKm = dto.DistanceKm;
            if (dto.DurationMin.HasValue)    route.DurationMin = dto.DurationMin;
            if (dto.ElevationGainM.HasValue) route.ElevationGain = dto.ElevationGainM;
            if (dto.Description is not null) route.Description = dto.Description.Trim();
            if (dto.Waypoints is not null)   route.Waypoints = dto.Waypoints;
            if (dto.Images is not null)      route.Images = dto.Images;
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

        // ── DELETE /api/routes/{id} ───────────────────────────────────────────
        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> Delete(uint id)
        {
            var route = await _db.Routes.FindAsync(id);
            if (route is null)
                return NotFound(new { message = $"Ruta sa ID={id} nije pronađena." });

            if (!CanManageRoute(route))
                return Forbid();

            _db.Routes.Remove(route);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = $"Ruta '{route.Name}' je obrisana." });
        }

        // ── GET /api/routes/{id}/reviews ──────────────────────────────────────
        [HttpGet("{id}/reviews")]
        [AllowAnonymous]
        public async Task<IActionResult> GetReviews(uint id)
        {
            if (!await _db.Routes.AnyAsync(r => r.Id == id && r.Status == "published"))
                return NotFound(new { message = $"Ruta sa ID={id} nije pronađena." });

            var reviews = await _db.Reviews
                .Where(r => r.RouteId == id && r.Status == "APPROVED")
                .Include(r => r.Tourist)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    id          = r.Id,
                    touristId   = r.TouristId,
                    touristName = r.Tourist != null ? r.Tourist.Name ?? string.Empty : string.Empty,
                    rating      = r.Rating,
                    comment     = r.Comment,
                    createdAt   = r.CreatedAt
                })
                .ToListAsync();

            return Ok(new { total = reviews.Count, data = reviews });
        }

        // ── Helpers ────────────────────────────────────────────────────────────
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

        private bool CanViewRoute(RouteModel route)
        {
            if (route.Status == "published")
                return true;

            return CanManageRoute(route);
        }

        private bool CanManageRoute(RouteModel route)
        {
            if (IsSuperAdmin())
                return true;

            var role = User.FindFirstValue(ClaimTypes.Role);
            if (!string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase))
                return false;

            var adminId = GetCurrentAdminId();
            return adminId.HasValue && route.AdminId == adminId.Value;
        }

        private static string? NormalizeStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
                return null;

            var normalized = status.Trim().ToLowerInvariant();
            return AllowedStatuses.Contains(normalized) ? normalized : null;
        }

        private static object MapToDto(RouteModel r) => new
        {
            routeId      = r.Id,
            adminId      = r.AdminId,
            adminName    = r.Admin?.FullName ?? string.Empty,
            regionId     = r.RegionId,
            // destinationId alias — kompatibilnost sa frontendskim modelom
            destinationId = r.RegionId,
            name         = r.Name,
            difficulty   = r.Difficulty,
            distanceKm   = r.DistanceKm,
            durationMin  = r.DurationMin,
            elevationGainM = r.ElevationGain,
            description  = r.Description,
            waypoints    = r.Waypoints,
            images       = r.Images,
            status       = r.Status,
            viewCount    = r.ViewCount,
            saveCount    = r.SaveCount,
            createdAt    = r.CreatedAt,
            updatedAt    = r.UpdatedAt,
            region = r.Region == null ? null : new
            {
                regionId = r.Region.Id,
                name     = r.Region.Name,
                lat      = r.Region.Lat,
                lng      = r.Region.Lng
            }
        };
    }

    // ── DTO ───────────────────────────────────────────────────────────────────
    public class UpsertRouteDto
    {
        public uint?    RegionId      { get; set; }
        public string?  Name          { get; set; }
        public string?  Difficulty    { get; set; }
        public decimal? DistanceKm    { get; set; }
        public uint?    DurationMin   { get; set; }
        public uint?    ElevationGainM { get; set; }
        public string?  Description   { get; set; }
        public string?  Waypoints     { get; set; }
        public string?  Images        { get; set; }
        public string?  Status        { get; set; }
    }
}
