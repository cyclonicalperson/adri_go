using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.Models;

namespace TouristGuide.Api.Controllers
{
    // =========================================================================
    // REGIONS — /api/regions
    // =========================================================================

    [ApiController]
    [Route("api/regions")]
    public class RegionsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public RegionsController(AppDbContext db) { _db = db; }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? search,
            [FromQuery] string? type,
            [FromQuery] bool? isActive,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _db.Regions.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(r => r.Name.Contains(search));
            if (!string.IsNullOrWhiteSpace(type))
                query = query.Where(r => r.Type == type);
            if (isActive.HasValue)
                query = query.Where(r => r.IsActive == isActive.Value);

            var total = await query.CountAsync();
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var regions = await query
                .OrderBy(r => r.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new
                {
                    regionId = r.Id,
                    name = r.Name,
                    type = r.Type,
                    description = r.Description,
                    country = r.Country,
                    lat = r.Lat,
                    lng = r.Lng,
                    isActive = r.IsActive,
                    createdAt = r.CreatedAt
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, totalPages = (int)Math.Ceiling((double)total / pageSize), data = regions });
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(uint id)
        {
            var r = await _db.Regions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (r is null) return NotFound(new { message = $"Regija sa ID={id} nije pronađena." });

            return Ok(new
            {
                data = new
                {
                    regionId = r.Id,
                    name = r.Name,
                    type = r.Type,
                    description = r.Description,
                    country = r.Country,
                    lat = r.Lat,
                    lng = r.Lng,
                    isActive = r.IsActive,
                    createdAt = r.CreatedAt
                },
                success = true
            });
        }

        [HttpPost]
        [Authorize(Roles = "superadmin")]
        public async Task<IActionResult> Create([FromBody] UpsertRegionDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var region = new Region
            {
                Name = dto.Name.Trim(),
                Type = dto.Type.Trim(),
                Description = dto.Description?.Trim(),
                Country = dto.Country?.Trim() ?? "Montenegro",
                Lat = dto.Lat,
                Lng = dto.Lng,
                IsActive = dto.IsActive ?? true,
                CreatedAt = DateTime.UtcNow
            };
            _db.Regions.Add(region);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = region.Id }, new { data = region, success = true });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "superadmin")]
        public async Task<IActionResult> Update(uint id, [FromBody] UpsertRegionDto dto)
        {
            var region = await _db.Regions.FindAsync(id);
            if (region is null) return NotFound(new { message = $"Regija sa ID={id} nije pronađena." });

            if (dto.Name is not null) region.Name = dto.Name.Trim();
            if (dto.Type is not null) region.Type = dto.Type.Trim();
            if (dto.Description is not null) region.Description = dto.Description.Trim();
            if (dto.Country is not null) region.Country = dto.Country.Trim();
            if (dto.Lat.HasValue) region.Lat = dto.Lat;
            if (dto.Lng.HasValue) region.Lng = dto.Lng;
            if (dto.IsActive.HasValue) region.IsActive = dto.IsActive.Value;

            await _db.SaveChangesAsync();
            return Ok(new { data = region, success = true });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "superadmin")]
        public async Task<IActionResult> Delete(uint id)
        {
            var region = await _db.Regions.FindAsync(id);
            if (region is null) return NotFound(new { message = $"Regija sa ID={id} nije pronađena." });

            _db.Regions.Remove(region);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = $"Regija '{region.Name}' je obrisana." });
        }
    }

    public class UpsertRegionDto
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Country { get; set; }
        public decimal? Lat { get; set; }
        public decimal? Lng { get; set; }
        public bool? IsActive { get; set; }
    }

    // =========================================================================
    // PERMISSIONS catalogue — /api/permissions
    // =========================================================================

    [ApiController]
    [Route("api/permissions")]
    [Authorize(Roles = "admin,superadmin")]
    public class PermissionsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public PermissionsController(AppDbContext db) { _db = db; }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var perms = await _db.AdminPermissions
                .AsNoTracking()
                .OrderBy(p => p.Category)
                .ThenBy(p => p.Label)
                .Select(p => new
                {
                    id = p.Id,
                    code = p.Code,
                    label = p.Label,
                    category = p.Category,
                    description = p.Description
                })
                .ToListAsync();

            return Ok(new { data = perms, success = true });
        }
    }

    // =========================================================================
    // ORGANIZATIONS — /api/organizations
    // =========================================================================

    [ApiController]
    [Route("api/organizations")]
    [Authorize(Roles = "admin,superadmin")]
    public class OrganizationsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public OrganizationsController(AppDbContext db) { _db = db; }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var orgs = await _db.Organizations
                .AsNoTracking()
                .OrderBy(o => o.Name)
                .Select(o => new
                {
                    organizationId = o.Id,
                    name = o.Name,
                    type = o.Type,
                    contactEmail = o.ContactEmail,
                    phone = o.Phone,
                    address = o.Address,
                    website = o.Website,
                    isVerified = o.IsVerified,
                    createdAt = o.CreatedAt
                })
                .ToListAsync();

            return Ok(new { data = orgs, success = true });
        }
    }

    // =========================================================================
    // ROLES — /api/roles  (statički — ENUM u bazi)
    // =========================================================================

    [ApiController]
    [Route("api/roles")]
    [Authorize(Roles = "admin,superadmin")]
    public class RolesController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetAll()
        {
            return Ok(new
            {
                data = new[]
                {
                    new { roleId = 1, roleName = "superadmin", description = "Pun pristup svim funkcijama platforme" },
                    new { roleId = 2, roleName = "admin",      description = "Pristup ograničen dodeljenim dozvolama" },
                },
                success = true
            });
        }
    }

    // =========================================================================
    // ADMIN NOTIFICATIONS — /api/admin-notifications
    // =========================================================================

    [ApiController]
    [Route("api/admin-notifications")]
    [Authorize(Roles = "admin,superadmin")]
    public class AdminNotificationsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public AdminNotificationsController(AppDbContext db) { _db = db; }

        // GET /api/admin-notifications?unreadOnly=true
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool unreadOnly = false)
        {
            var adminId = GetCurrentAdminId();
            if (adminId is null) return Unauthorized();

            var query = _db.AdminNotifications
                .Where(n => n.AdminUserId == adminId.Value)
                .AsNoTracking();

            if (unreadOnly)
                query = query.Where(n => !n.IsRead);

            var notifs = await query
                .OrderByDescending(n => n.CreatedAt)
                .Take(50)
                .Select(n => new
                {
                    id = n.Id,
                    adminUserId = n.AdminUserId,
                    type = n.Type,
                    title = n.Title,
                    body = n.Body,
                    payload = n.Payload,
                    isRead = n.IsRead,
                    createdAt = n.CreatedAt,
                    sentAt = n.SentAt
                })
                .ToListAsync();

            return Ok(new { data = notifs, success = true });
        }

        // PATCH /api/admin-notifications/{id}/read
        [HttpPatch("{id}/read")]
        public async Task<IActionResult> MarkRead(uint id)
        {
            var adminId = GetCurrentAdminId();
            if (adminId is null) return Unauthorized();

            var notif = await _db.AdminNotifications
                .FirstOrDefaultAsync(n => n.Id == id && n.AdminUserId == adminId.Value);
            if (notif is null) return NotFound(new { message = "Notifikacija nije pronađena." });

            notif.IsRead = true;
            await _db.SaveChangesAsync();

            return Ok(new { data = (object?)null, success = true });
        }

        // PATCH /api/admin-notifications/read-all
        [HttpPatch("read-all")]
        public async Task<IActionResult> MarkAllRead()
        {
            var adminId = GetCurrentAdminId();
            if (adminId is null) return Unauthorized();

            await _db.AdminNotifications
                .Where(n => n.AdminUserId == adminId.Value && !n.IsRead)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

            return Ok(new { data = (object?)null, success = true });
        }

        // DELETE /api/admin-notifications/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(uint id)
        {
            var adminId = GetCurrentAdminId();
            if (adminId is null) return Unauthorized();

            var notif = await _db.AdminNotifications
                .FirstOrDefaultAsync(n => n.Id == id && n.AdminUserId == adminId.Value);
            if (notif is null) return NotFound(new { message = "Notifikacija nije pronađena." });

            _db.AdminNotifications.Remove(notif);
            await _db.SaveChangesAsync();

            return Ok(new { data = (object?)null, success = true });
        }

        private uint? GetCurrentAdminId()
        {
            var val = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                   ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            return uint.TryParse(val, out var id) ? id : null;
        }
    }

    // =========================================================================
    // PUBLIC STATS — /api/public-stats
    // Anonimu dostupne platformske statistike za login stranicu
    // =========================================================================

    [ApiController]
    [Route("api/public-stats")]
    public class PublicStatsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public PublicStatsController(AppDbContext db) { _db = db; }

        // GET /api/public-stats
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicStats()
        {
            var totalLocations = await _db.Posts
                .CountAsync(p => p.Status == "published" && p.PostType != "event");

            var totalRegions = await _db.Regions.CountAsync();

            var avgRating = await _db.Reviews
                .Where(r => r.Status == "APPROVED" && r.Rating > 0)
                .AverageAsync(r => (double?)r.Rating) ?? 0.0;

            return Ok(new
            {
                totalLocations,
                totalRegions,
                avgRating = Math.Round(avgRating, 1),
                success = true
            });
        }
    }
}
