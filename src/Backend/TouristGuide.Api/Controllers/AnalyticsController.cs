using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.Models;
using TouristGuide.Api.Services;

namespace TouristGuide.Api.Controllers
{
    /// <summary>
    /// Analytics endpointi za Admin dashboard.
    /// SuperAdmin vidi sve podatke, Admin vidi samo podatke za svoje postove/regije.
    /// </summary>
    [ApiController]
    [Route("api/analytics")]
    [Authorize(Roles = "admin,superadmin")]
    public class AnalyticsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly AdminPermissionService _permissionService;

        public AnalyticsController(AppDbContext db, AdminPermissionService permissionService)
        {
            _db = db;
            _permissionService = permissionService;
        }

        // ── GET /api/analytics/stats ──────────────────────────────────────────
        /// <summary>KPI overview — mapira na v_superadmin_overview.</summary>
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            if (!await _permissionService.CanViewAnalyticsAsync())
                return Forbid();

            var isSuperAdmin = IsSuperAdmin();

            if (isSuperAdmin)
            {
                var totalTourists = await _db.Tourists.CountAsync(t => t.IsActive);
                var totalAdmins = await _db.AdminUsers.CountAsync(); // svi admini
                var totalLocations = await _db.Posts.CountAsync(p => p.Status == "published" && p.PostType != "event");
                var totalPosts = totalLocations; // backwards compat alias
                var totalRegions = await _db.Regions.CountAsync(); // sve destinacije, konzistentno sa listom
                var totalRoutes = await _db.Routes.CountAsync(r => r.Status == "published");
                var pendingRegs = await _db.AdminRegistrationRequests.CountAsync(r => r.Status == "pending");
                var pendingReviews = await _db.Reviews.CountAsync(r => r.Status == "PENDING");
                var ticketsIssued = await _db.Tickets.CountAsync();
                var adminId = GetCurrentAdminId();
                var unreadNotifs = adminId.HasValue
                    ? await _db.AdminNotifications.CountAsync(n => n.AdminUserId == adminId.Value && !n.IsRead)
                    : 0;

                return Ok(new
                {
                    data = new
                    {
                        totalTourists,
                        totalAdmins,
                        totalLocations,
                        totalPosts,     // alias za backwards compat
                        totalRegions,
                        totalRoutes,
                        pendingRegistrations = pendingRegs,
                        pendingReviews,
                        ticketsIssued,
                        unreadNotifications = unreadNotifs
                    },
                    success = true
                });
            }
            else
            {
                var adminId = GetCurrentAdminId();
                if (adminId is null) return Unauthorized();

                var myPublishedLocations = await _db.Posts.CountAsync(p =>
                    p.AdminId == adminId.Value &&
                    p.Status == "published" &&
                    p.PostType != "event");

                var myPublishedRoutes = await _db.Routes.CountAsync(r =>
                    r.AdminId == adminId.Value &&
                    r.Status == "published");

                var myPendingReviews = await _db.Reviews
                    .Where(r =>
                        r.Status == "PENDING" &&
                        (
                            (r.Post != null && r.Post.AdminId == adminId.Value) ||
                            (r.Route != null && r.Route.AdminId == adminId.Value)
                        ))
                    .CountAsync();
                var unreadNotifs = await _db.AdminNotifications
                    .CountAsync(n => n.AdminUserId == adminId.Value && !n.IsRead);

                return Ok(new
                {
                    data = new
                    {
                        totalTourists = 0,
                        totalAdmins = 0,
                        totalLocations = myPublishedLocations,
                        totalPosts = myPublishedLocations,
                        totalRegions = 0,
                        totalRoutes = myPublishedRoutes,
                        pendingRegistrations = 0,
                        pendingReviews = myPendingReviews,
                        ticketsIssued = 0,
                        unreadNotifications = unreadNotifs
                    },
                    success = true
                });
            }
        }

        // ── GET /api/analytics/visits ─────────────────────────────────────────
        /// <summary>Agregiran post_view po danu za grafikon posjeta.</summary>
        [HttpGet("visits")]
        public async Task<IActionResult> GetDailyVisits(
            [FromQuery] string? from,
            [FromQuery] string? to)
        {
            if (!await _permissionService.CanViewAnalyticsAsync())
                return Forbid();

            var fromDate = DateTime.TryParse(from, out var fd)
                ? DateTime.SpecifyKind(fd.Date, DateTimeKind.Utc)
                : DateTime.UtcNow.Date.AddDays(-30);
            // toDate is end-of-day: parse the date string as midnight then add 1 day
            // so that views registered any time on that day are included
            var toDate = DateTime.TryParse(to, out var td)
                ? DateTime.SpecifyKind(td.Date.AddDays(1), DateTimeKind.Utc)
                : DateTime.UtcNow.AddDays(1);

            var adminId = IsSuperAdmin() ? (uint?)null : GetCurrentAdminId();

            var query = _db.PostViews
                .Where(v => v.CreatedAt >= fromDate && v.CreatedAt < toDate);

            if (adminId.HasValue)
                query = query.Where(v => v.Post != null && v.Post.AdminId == adminId.Value);

            var rawDates = await query.Select(v => v.CreatedAt).ToListAsync();

            var result = rawDates
                .GroupBy(dt => dt.Date)
                .Select(g => new { date = g.Key.ToString("yyyy-MM-dd"), count = g.Count() })
                .OrderBy(x => x.date)
                .ToList();

            return Ok(new { data = result, success = true });
        }

        // ── GET /api/analytics/popular/posts ─────────────────────────────────
        [HttpGet("popular/posts")]
        public async Task<IActionResult> GetPopularPosts([FromQuery] int limit = 10)
        {
            if (!await _permissionService.CanViewAnalyticsAsync())
                return Forbid();

            var adminId = IsSuperAdmin() ? (uint?)null : GetCurrentAdminId();

            var query = _db.Posts
                .Include(p => p.Region)
                .Include(p => p.Admin)
                .Where(p => p.Status == "published" && p.PostType != "event");

            if (adminId.HasValue)
                query = query.Where(p => p.AdminId == adminId.Value);

            var posts = await query
                .OrderByDescending(p => p.ViewCount)
                .Take(limit)
                .Select(p => new
                {
                    id = p.Id,
                    title = p.Title,
                    postType = p.PostType,
                    viewCount = p.ViewCount,
                    likeCount = p.LikeCount,
                    avgRating = p.AvgRating,
                    regionName = p.Region != null ? p.Region.Name : null,
                    adminName = p.Admin != null ? p.Admin.FullName : string.Empty
                })
                .ToListAsync();

            return Ok(new { data = posts, success = true });
        }

        // ── GET /api/analytics/popular/events ────────────────────────────────
        [HttpGet("popular/events")]
        public async Task<IActionResult> GetPopularEvents([FromQuery] int limit = 10)
        {
            if (!await _permissionService.CanViewAnalyticsAsync())
                return Forbid();

            var adminId = IsSuperAdmin() ? (uint?)null : GetCurrentAdminId();

            var query = _db.Posts
                .Include(p => p.Region)
                .Include(p => p.Admin)
                .Where(p => p.Status == "published" && p.PostType == "event");

            if (adminId.HasValue)
                query = query.Where(p => p.AdminId == adminId.Value);

            var events = await query
                .OrderByDescending(p => p.ViewCount)
                .Take(limit)
                .Select(p => new
                {
                    id = p.Id,
                    title = p.Title,
                    postType = p.PostType,
                    viewCount = p.ViewCount,
                    likeCount = p.LikeCount,
                    avgRating = p.AvgRating,
                    regionName = p.Region != null ? p.Region.Name : null,
                    adminName = p.Admin != null ? p.Admin.FullName : string.Empty
                })
                .ToListAsync();

            return Ok(new { data = events, success = true });
        }

        // ── GET /api/analytics/regions ────────────────────────────────────────
        /// <summary>Popularnost regija — agregiran pregled.</summary>
        [HttpGet("regions")]
        public async Task<IActionResult> GetRegionPopularity()
        {
            if (!await _permissionService.CanViewAnalyticsAsync())
                return Forbid();

            var isSuperAdmin = IsSuperAdmin();
            var adminId = isSuperAdmin ? (uint?)null : GetCurrentAdminId();
            if (!isSuperAdmin && adminId is null)
                return Unauthorized();

            var regionsQuery = _db.Regions
                .Where(r => r.IsActive)
                .AsQueryable();

            if (adminId.HasValue)
            {
                regionsQuery = regionsQuery.Where(r =>
                    r.Posts.Any(p => p.Status == "published" && p.AdminId == adminId.Value));
            }

            var regions = await regionsQuery
                .Select(r => new
                {
                    regionId = r.Id,
                    name = r.Name,
                    type = r.Type,
                    numPosts = r.Posts.Count(p => p.Status == "published" && (!adminId.HasValue || p.AdminId == adminId.Value)),
                    totalViews = r.Posts
                        .Where(p => p.Status == "published" && (!adminId.HasValue || p.AdminId == adminId.Value))
                        .Sum(p => (int?)p.ViewCount) ?? 0,
                    totalLikes = r.Posts
                        .Where(p => p.Status == "published" && (!adminId.HasValue || p.AdminId == adminId.Value))
                        .Sum(p => (int?)p.LikeCount) ?? 0,
                    avgRating = r.Posts
                        .Where(p => p.Status == "published" && (!adminId.HasValue || p.AdminId == adminId.Value))
                        .Average(p => (double?)p.AvgRating)
                })
                .OrderByDescending(r => r.totalViews)
                .ToListAsync();

            return Ok(new { data = regions, success = true });
        }

        // ── GET /api/analytics/movements ─────────────────────────────────────
        /// <summary>Posjete po regijama za turistička kretanja na mapi.</summary>
        [HttpGet("movements")]
        public async Task<IActionResult> GetTouristMovements()
        {
            if (!await _permissionService.CanViewAnalyticsAsync())
                return Forbid();

            var isSuperAdmin = IsSuperAdmin();
            var adminId = isSuperAdmin ? (uint?)null : GetCurrentAdminId();
            if (!isSuperAdmin && adminId is null)
                return Unauthorized();

            var query = _db.PostViews
                .Where(v => v.Post != null && v.Post.Region != null)
                .AsQueryable();

            if (adminId.HasValue)
            {
                query = query.Where(v => v.Post != null && v.Post.AdminId == adminId.Value);
            }

            // EF Core / Npgsql cannot translate GroupBy with navigation-property keys to SQL.
            // Fetch the raw projection first, then group client-side.
            var raw = await query
                .Select(v => new
                {
                    RegionId   = v.Post!.RegionId,
                    RegionName = v.Post.Region!.Name,
                    Lat        = v.Post.Region!.Lat,
                    Lng        = v.Post.Region!.Lng,
                })
                .ToListAsync();

            var movements = raw
                .GroupBy(v => new { v.RegionId, v.RegionName, v.Lat, v.Lng })
                .Select(g => new
                {
                    regionId   = g.Key.RegionId,
                    regionName = g.Key.RegionName,
                    latitude   = g.Key.Lat,
                    longitude  = g.Key.Lng,
                    visitCount = g.Count()
                })
                .OrderByDescending(m => m.visitCount)
                .ToList();

            return Ok(new { data = movements, success = true });
        }

        // ── POST /api/analytics/app-visit ────────────────────────────────────
        /// <summary>
        /// Bilježi jednu sesiju otvaranja turističke aplikacije.
        /// Endpoint je anoniman — poziva se pri pokretanju app-a bez autentikacije.
        /// Ista sesija (session_id) broji se jednom po UTC danu (upsert — ignore duplicate).
        /// </summary>
        [HttpPost("app-visit")]
        [AllowAnonymous]
        public async Task<IActionResult> RecordAppVisit([FromBody] AppVisitRequest body)
        {
            if (string.IsNullOrWhiteSpace(body?.SessionId) || body.SessionId.Length > 64)
                return BadRequest(new { message = "Neispravan sessionId." });

            try
            {
                var today = DateTime.UtcNow.Date;
                var visitDate = DateTime.SpecifyKind(today, DateTimeKind.Utc);

                // Ignore duplicate (ista sesija, isti dan)
                var exists = await _db.AppVisits.AnyAsync(v =>
                    v.SessionId == body.SessionId && v.VisitDate == visitDate);

                if (!exists)
                {
                    _db.AppVisits.Add(new AppVisit
                    {
                        SessionId = body.SessionId,
                        VisitDate = visitDate,
                        CreatedAt = DateTime.UtcNow,
                    });
                    await _db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                // Gracefully handle missing table (e.g. migration pending) — don't surface 500 to the client
                Console.Error.WriteLine($"[app-visit] Failed to record visit: {ex.Message}");
            }

            return Ok(new { success = true });
        }

        // ── GET /api/analytics/app-visits ────────────────────────────────────
        /// <summary>
        /// Dnevni broj jedinstvenih sesija (unique otvaranja aplikacije) za zadati period.
        /// Format odgovora identičan sa /api/analytics/visits radi lakšeg ponovnog korišćenja.
        /// </summary>
        [HttpGet("app-visits")]
        public async Task<IActionResult> GetAppVisits(
            [FromQuery] string? from,
            [FromQuery] string? to)
        {
            if (!await _permissionService.CanViewAnalyticsAsync())
                return Forbid();

            var fromDate = DateTime.TryParse(from, out var fd)
                ? DateTime.SpecifyKind(fd.Date, DateTimeKind.Utc)
                : DateTime.SpecifyKind(DateTime.UtcNow.Date.AddDays(-30), DateTimeKind.Utc);

            var toDate = DateTime.TryParse(to, out var td)
                ? DateTime.SpecifyKind(td.Date.AddDays(1), DateTimeKind.Utc)
                : DateTime.SpecifyKind(DateTime.UtcNow.Date.AddDays(1), DateTimeKind.Utc);

            try
            {
                var rawDates = await _db.AppVisits
                    .Where(v => v.VisitDate >= fromDate && v.VisitDate < toDate)
                    .Select(v => v.VisitDate)
                    .ToListAsync();

                var result = rawDates
                    .GroupBy(dt => dt.Date)
                    .Select(g => new { date = g.Key.ToString("yyyy-MM-dd"), count = g.Count() })
                    .OrderBy(x => x.date)
                    .ToList();

                return Ok(new { data = result, success = true });
            }
            catch (Exception ex)
            {
                // Gracefully handle missing table (migration not yet applied) — return empty data
                Console.Error.WriteLine($"[app-visits] Query failed: {ex.Message}");
                return Ok(new { data = Array.Empty<object>(), success = true });
            }
        }

        // ── Helpers ────────────────────────────────────────────────────────────
        private bool IsSuperAdmin() =>
            string.Equals(User.FindFirstValue(ClaimTypes.Role), "superadmin", StringComparison.OrdinalIgnoreCase);

        private uint? GetCurrentAdminId()
        {
            var val = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                   ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            return uint.TryParse(val, out var id) ? id : null;
        }
    }

    /// <summary>Tijelo zahtjeva za bilježenje sesije.</summary>
    public class AppVisitRequest
    {
        public string? SessionId { get; set; }
    }
}