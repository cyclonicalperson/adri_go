using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;

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

        public AnalyticsController(AppDbContext db)
        {
            _db = db;
        }

        // ── GET /api/analytics/stats ──────────────────────────────────────────
        /// <summary>KPI overview — mapira na v_superadmin_overview.</summary>
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var isSuperAdmin = IsSuperAdmin();

            if (isSuperAdmin)
            {
                var totalTourists = await _db.Tourists.CountAsync(t => t.IsActive);
                var totalAdmins = await _db.AdminUsers.CountAsync(u => u.AccountStatus == "active");
                var totalPosts = await _db.Posts.CountAsync(p => p.Status == "published");
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
                        totalPosts,
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

                var myPosts = await _db.Posts.CountAsync(p => p.AdminId == adminId.Value && p.Status == "published");
                var myPendingReviews = await _db.Reviews
                    .Where(r => r.Post != null && r.Post.AdminId == adminId.Value && r.Status == "PENDING")
                    .CountAsync();
                var unreadNotifs = await _db.AdminNotifications
                    .CountAsync(n => n.AdminUserId == adminId.Value && !n.IsRead);

                return Ok(new
                {
                    data = new
                    {
                        totalTourists = 0,
                        totalAdmins = 0,
                        totalPosts = myPosts,
                        totalRoutes = 0,
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
            var fromDate = DateTime.TryParse(from, out var fd) ? fd : DateTime.UtcNow.AddDays(-30);
            var toDate = DateTime.TryParse(to, out var td) ? td : DateTime.UtcNow;

            var adminId = IsSuperAdmin() ? (uint?)null : GetCurrentAdminId();

            var query = _db.PostViews
                .Where(v => v.CreatedAt >= fromDate && v.CreatedAt <= toDate);

            if (adminId.HasValue)
                query = query.Where(v => v.Post != null && v.Post.AdminId == adminId.Value);

            var grouped = await query
                .GroupBy(v => v.CreatedAt.Date)
                .Select(g => new { date = g.Key, count = g.Count() })
                .OrderBy(x => x.date)
                .ToListAsync();

            var result = grouped
                .Select(x => new { date = x.date.ToString("yyyy-MM-dd"), count = x.count })
                .ToList();

            return Ok(new { data = result, success = true });
        }

        // ── GET /api/analytics/popular/posts ─────────────────────────────────
        [HttpGet("popular/posts")]
        public async Task<IActionResult> GetPopularPosts([FromQuery] int limit = 10)
        {
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
            var regions = await _db.Regions
                .Where(r => r.IsActive)
                .Select(r => new
                {
                    regionId = r.Id,
                    name = r.Name,
                    type = r.Type,
                    numPosts = r.Posts.Count(p => p.Status == "published"),
                    totalViews = r.Posts.Sum(p => (int?)p.ViewCount) ?? 0,
                    totalLikes = r.Posts.Sum(p => (int?)p.LikeCount) ?? 0,
                    avgRating = r.Posts.Any(p => p.AvgRating != null)
                        ? r.Posts.Where(p => p.AvgRating != null).Average(p => (double?)p.AvgRating)
                        : (double?)null
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
            var movements = await _db.PostViews
                .Where(v => v.Post != null && v.Post.Region != null)
                .GroupBy(v => new
                {
                    v.Post!.RegionId,
                    RegionName = v.Post.Region!.Name,
                    Lat = v.Post.Region!.Lat,
                    Lng = v.Post.Region!.Lng
                })
                .Select(g => new
                {
                    regionId = g.Key.RegionId,
                    regionName = g.Key.RegionName,
                    latitude = g.Key.Lat,
                    longitude = g.Key.Lng,
                    visitCount = g.Count()
                })
                .OrderByDescending(m => m.visitCount)
                .ToListAsync();

            return Ok(new { data = movements, success = true });
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
}