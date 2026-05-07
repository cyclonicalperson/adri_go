using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.Models;

namespace TouristGuide.Api.Controllers
{
    /// <summary>
    /// Admin pregled turista — lista korisnika turističke aplikacije.
    /// Dostupno adminima i super-adminima (read), modifikacije zahtijevaju superadmin.
    /// </summary>
    [ApiController]
    [Route("api/tourists")]
    [Authorize(Roles = "admin,superadmin")]
    public class AdminTouristsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AdminTouristsController(AppDbContext db)
        {
            _db = db;
        }

        // ── GET /api/tourists ─────────────────────────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? search,
            [FromQuery] string? accountStatus,
            [FromQuery] string? sortBy,
            [FromQuery] string? sortDir,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _db.Tourists.AsNoTracking().AsQueryable();

            // ── Filteri ───────────────────────────────────────────────────────
            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(t =>
                    (t.Name != null && t.Name.Contains(search)) ||
                    (t.Email != null && t.Email.Contains(search)));

            switch (accountStatus?.ToLower())
            {
                case "active":
                    query = query.Where(t => t.IsActive && t.IsEmailVerified);
                    break;
                case "inactive":
                    query = query.Where(t => !t.IsActive);
                    break;
                case "unverified":
                    query = query.Where(t => !t.IsEmailVerified);
                    break;
            }

            // ── Sortiranje ────────────────────────────────────────────────────
            query = (sortBy?.ToLower(), sortDir?.ToLower()) switch
            {
                ("email", "asc")      => query.OrderBy(t => t.Email),
                ("email", "desc")     => query.OrderByDescending(t => t.Email),
                ("name", "asc")       => query.OrderBy(t => t.Name),
                ("name", "desc")      => query.OrderByDescending(t => t.Name),
                ("createdat", "asc")  => query.OrderBy(t => t.CreatedAt),
                _                     => query.OrderByDescending(t => t.CreatedAt),
            };

            // ── Paginacija ────────────────────────────────────────────────────
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var total = await query.CountAsync();

            var tourists = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)total / pageSize),
                data = tourists.Select(MapToDto)
            });
        }

        // ── GET /api/tourists/{id} ────────────────────────────────────────────
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(uint id)
        {
            var tourist = await _db.Tourists
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == id);

            if (tourist is null)
                return NotFound(new { message = $"Turista sa ID={id} nije pronađen." });

            // Aktivnostni podaci — broje se bez učitavanja entiteta u memoriju
            var reviewsCount   = await _db.Reviews.CountAsync(r => r.TouristId == id);
            var viewsCount     = await _db.PostViews.CountAsync(v => v.TouristId == id);
            var likesCount     = await _db.PostLikes.CountAsync(l => l.TouristId == id);
            var savedCount     = await _db.SavedPosts.CountAsync(s => s.TouristId == id);
            var favoritesCount = await _db.TouristFavorites.CountAsync(f => f.TouristId == id);

            var dto = new
            {
                id               = tourist.Id,
                name             = tourist.Name,
                email            = tourist.Email,
                language         = tourist.Language,
                location         = tourist.Location,
                bio              = tourist.Bio,
                interests        = tourist.Interests,
                homeLat          = tourist.HomeLat,
                homeLng          = tourist.HomeLng,
                profileImage     = tourist.ProfileImage,
                isActive         = tourist.IsActive,
                isEmailVerified  = tourist.IsEmailVerified,
                createdAt        = tourist.CreatedAt,
                updatedAt        = tourist.UpdatedAt,
                // Statistike aktivnosti
                reviewsCount,
                viewsCount,
                likesCount,
                savedCount,
                favoritesCount,
            };

            return Ok(new { data = dto, success = true });
        }

        // ── GET /api/tourists/{id}/activity ──────────────────────────────────
        /// <summary>
        /// Aktivnost turista: pregledi, lajkovi, sačuvano, recenzije i kategorijska preferencija.
        /// Koristi se za "recommender profil" na stranici detalja turiste.
        /// </summary>
        [HttpGet("{id}/activity")]
        public async Task<IActionResult> GetActivity(uint id)
        {
            var exists = await _db.Tourists.AsNoTracking().AnyAsync(t => t.Id == id);
            if (!exists)
                return NotFound(new { message = $"Turista sa ID={id} nije pronađen." });

            // ── Recent views (last 10) ────────────────────────────────────────
            var recentViews = await _db.PostViews
                .AsNoTracking()
                .Where(v => v.TouristId == id)
                .OrderByDescending(v => v.CreatedAt)
                .Take(10)
                .Select(v => new
                {
                    postId      = v.PostId,
                    title       = v.Post.Title,
                    postType    = v.Post.PostType,
                    viewedAt    = v.CreatedAt,
                    durationSec = (int?)v.DurationSec,
                })
                .ToListAsync();

            // ── Recent likes (last 10) ────────────────────────────────────────
            var recentLikes = await _db.PostLikes
                .AsNoTracking()
                .Where(l => l.TouristId == id)
                .OrderByDescending(l => l.CreatedAt)
                .Take(10)
                .Select(l => new
                {
                    postId   = l.PostId,
                    title    = l.Post.Title,
                    postType = l.Post.PostType,
                    likedAt  = l.CreatedAt,
                })
                .ToListAsync();

            // ── Recent saved posts (last 10) ──────────────────────────────────
            var recentSaved = await _db.SavedPosts
                .AsNoTracking()
                .Where(s => s.TouristId == id)
                .OrderByDescending(s => s.CreatedAt)
                .Take(10)
                .Select(s => new
                {
                    postId   = s.PostId,
                    title    = s.Post.Title,
                    postType = s.Post.PostType,
                    savedAt  = s.CreatedAt,
                })
                .ToListAsync();

            // ── Recent reviews (last 5) ───────────────────────────────────────
            var recentReviews = await _db.Reviews
                .AsNoTracking()
                .Where(r => r.TouristId == id)
                .OrderByDescending(r => r.CreatedAt)
                .Take(5)
                .Select(r => new
                {
                    reviewId   = r.Id,
                    postId     = r.PostId,
                    postTitle  = r.Post != null ? r.Post.Title : null,
                    rating     = (int)r.Rating,
                    comment    = r.Comment,
                    status     = r.Status,
                    reviewedAt = r.CreatedAt,
                })
                .ToListAsync();

            // ── Category preferences (view-based) — fetched flat, grouped client-side
            // to avoid EF Core GroupBy translation issues.
            var allViewTypes = await _db.PostViews
                .AsNoTracking()
                .Where(v => v.TouristId == id)
                .Select(v => v.Post.PostType)
                .ToListAsync();

            var viewPrefs = allViewTypes
                .GroupBy(pt => pt)
                .Select(g => new { postType = g.Key, count = g.Count() })
                .OrderByDescending(c => c.count)
                .ToList();

            // ── Category preferences (like-based) ────────────────────────────
            var allLikeTypes = await _db.PostLikes
                .AsNoTracking()
                .Where(l => l.TouristId == id)
                .Select(l => l.Post.PostType)
                .ToListAsync();

            var likePrefs = allLikeTypes
                .GroupBy(pt => pt)
                .Select(g => new { postType = g.Key, count = g.Count() })
                .OrderByDescending(c => c.count)
                .ToList();

            return Ok(new
            {
                data = new
                {
                    recentViews,
                    recentLikes,
                    recentSaved,
                    recentReviews,
                    viewPreferences  = viewPrefs,
                    likePreferences  = likePrefs,
                },
                success = true,
            });
        }

        // ── PATCH /api/tourists/{id}/suspend ──────────────────────────────────
        [HttpPatch("{id}/suspend")]
        [Authorize(Roles = "superadmin")]
        public async Task<IActionResult> Suspend(uint id)
        {
            var tourist = await _db.Tourists.FindAsync(id);
            if (tourist is null)
                return NotFound(new { message = $"Turista sa ID={id} nije pronađen." });

            tourist.IsActive = false;
            tourist.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { data = MapToDto(tourist), success = true });
        }

        // ── PATCH /api/tourists/{id}/activate ────────────────────────────────
        [HttpPatch("{id}/activate")]
        [Authorize(Roles = "superadmin")]
        public async Task<IActionResult> Activate(uint id)
        {
            var tourist = await _db.Tourists.FindAsync(id);
            if (tourist is null)
                return NotFound(new { message = $"Turista sa ID={id} nije pronađen." });

            tourist.IsActive = true;
            tourist.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { data = MapToDto(tourist), success = true });
        }

        // ── DELETE /api/tourists/{id} ─────────────────────────────────────────
        [HttpDelete("{id}")]
        [Authorize(Roles = "superadmin")]
        public async Task<IActionResult> Delete(uint id)
        {
            var tourist = await _db.Tourists.FindAsync(id);
            if (tourist is null)
                return NotFound(new { message = $"Turista sa ID={id} nije pronađen." });

            _db.Tourists.Remove(tourist);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = $"Nalog turiste '{tourist.Name ?? tourist.Email}' je obrisan." });
        }

        // ── Helper ────────────────────────────────────────────────────────────
        private static object MapToDto(Tourist t) => new
        {
            id          = t.Id,
            name        = t.Name,
            email       = t.Email,
            language    = t.Language,
            location    = t.Location,
            profileImage = t.ProfileImage,
            isActive    = t.IsActive,
            isEmailVerified = t.IsEmailVerified,
            createdAt   = t.CreatedAt,
            updatedAt   = t.UpdatedAt,
        };
    }
}
