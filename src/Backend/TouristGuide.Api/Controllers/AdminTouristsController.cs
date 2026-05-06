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
