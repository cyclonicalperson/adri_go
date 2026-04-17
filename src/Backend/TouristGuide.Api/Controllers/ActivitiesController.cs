using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.Models;
using TouristGuide.Api.Services;

namespace TouristGuide.Api.Controllers
{
    /// <summary>
    /// GET /api/activities — lista aktivnosti za Admin UI.
    ///
    /// Aktivnosti su tagovi u tag tabeli sa category = 'aktivnost'.
    /// Posto tag tabela nema direktan admin_id, vlasnistvo se odredjuje
    /// kroz vezu post_tag: admin je vlasnik aktivnosti ako postoji
    /// bar jedan njegov post koji koristi taj tag.
    ///
    /// Pravila pristupa:
    ///   SuperAdmin — vidi sve aktivnosti u sistemu
    ///   Admin      — vidi samo aktivnosti pridruzene njegovim postovima
    /// </summary>
    [ApiController]
    [Route("api/activities")]
    [Authorize(Roles = "admin,superadmin")]
    public class ActivitiesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly AdminIdentityService _adminIdentityService;

        public ActivitiesController(AppDbContext context, AdminIdentityService adminIdentityService)
        {
            _context = context;
            _adminIdentityService = adminIdentityService;
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/activities
        // ─────────────────────────────────────────────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? category,
            [FromQuery] string? search,
            [FromQuery] string? status,
            [FromQuery] string? sortBy,
            [FromQuery] string? sortDir,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var query = _context.Tags
                .Where(t => t.Category != null && ActivityTagHelper.IsActivityTag(t.Category))
                .AsQueryable();

            // ── Filtriranje po ulozi ──────────────────────────────────────────
            // SuperAdmin nema ogranicenja i vidi sve aktivnosti.
            // Obican Admin vidi iskljucivo aktivnosti koje su pridruzene
            // (post_tag) bar jednom postu ciji je on kreator (admin_id).
            if (!_adminIdentityService.IsSuperAdmin())
            {
                var adminId = _adminIdentityService.GetAdminId();
                if (adminId == null)
                    return Unauthorized(new { message = "Identitet korisnika nije moguce utvrditi." });

                // Skupljamo ID-jeve tagova vezanih za postove ovog admina
                var adminTagIds = await _context.PostTags
                    .Where(pt => pt.Post.AdminId == adminId.Value)
                    .Select(pt => pt.TagId)
                    .Distinct()
                    .ToListAsync();

                query = query.Where(t => adminTagIds.Contains(t.Id));
            }

            // ── Dodatni filteri ───────────────────────────────────────────────
            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(t => t.Name.Contains(search));

            if (!string.IsNullOrWhiteSpace(category) && !string.Equals(category, "OTHER", StringComparison.OrdinalIgnoreCase))
            {
                var catUpper = category.Trim().ToUpperInvariant();
                query = query.Where(t => ActivityTagHelper.GetActivitySubtype(t.Category) == catUpper);
            }

            var total = await query.CountAsync();

            // ── Sortiranje ────────────────────────────────────────────────────
            query = (sortBy?.ToLower(), sortDir?.ToLower()) switch
            {
                ("name", "asc") => query.OrderBy(t => t.Name),
                ("name", _)     => query.OrderByDescending(t => t.Name),
                (_, "asc")      => query.OrderBy(t => t.Id),
                _               => query.OrderByDescending(t => t.Id)
            };

            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 200) pageSize = 10;

            // Uzimamo ID-jeve za trenutnu stranicu
            var tagIds = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => t.Id)
                .ToListAsync();

            var tags = await _context.Tags
                .Where(t => tagIds.Contains(t.Id))
                .ToListAsync();

            // Dohvatamo vezane postove za GPS i naziv lokacije
            var linkedPosts = await _context.PostTags
                .Include(pt => pt.Post)
                    .ThenInclude(p => p.Region)
                .Where(pt => tagIds.Contains(pt.TagId))
                .ToListAsync();

            var data = tags.Select(t =>
            {
                var veze = linkedPosts.Where(pt => pt.TagId == t.Id).ToList();
                var prviPost = veze.FirstOrDefault()?.Post;

                return new
                {
                    activityId   = t.Id,
                    name         = t.Name,
                    category     = ActivityTagHelper.GetActivitySubtype(t.Category),
                    description  = "",
                    imageUrl     = t.ImageUrl,
                    color        = t.Color,
                    lat          = prviPost?.Lat,
                    lng          = prviPost?.Lng,
                    locationName = prviPost?.Region?.Name ?? prviPost?.Address ?? "",
                    viewCount    = (uint)veze.Sum(pt => (long)pt.Post.ViewCount),
                    linkedPosts  = veze.Count,
                    status       = veze.Count > 0 ? "approved" : "pending"
                };
            }).ToList();

            var actBase = _context.Tags.AsQueryable()
                .Where(t => t.Category != null && ActivityTagHelper.IsActivityTag(t.Category));
            var sportCount    = await actBase.CountAsync(t => ActivityTagHelper.GetActivitySubtype(t.Category) == "SPORT");
            var natureCount   = await actBase.CountAsync(t => ActivityTagHelper.GetActivitySubtype(t.Category) == "ADVENTURE");
            var wellnessCount = await actBase.CountAsync(t => ActivityTagHelper.GetActivitySubtype(t.Category) == "WELLNESS");

            return Ok(new
            {
                data,
                total,
                page,
                pageSize,
                totalPages    = (int)Math.Ceiling((double)total / pageSize),
                sportCount,
                natureCount,
                wellnessCount
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/activities/{id}
        // ─────────────────────────────────────────────────────────────────────
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(uint id)
        {
            var tag = await _context.Tags
                .Include(t => t.PostTags)
                    .ThenInclude(pt => pt.Post)
                        .ThenInclude(p => p.Region)
                .FirstOrDefaultAsync(t => t.Id == id && t.Category != null && ActivityTagHelper.IsActivityTag(t.Category));

            if (tag == null)
                return NotFound(new { message = $"Aktivnost sa ID={id} nije pronadjena." });

            // Obican admin moze videti samo aktivnosti vezane za njegov post
            if (!_adminIdentityService.IsSuperAdmin())
            {
                var adminId = _adminIdentityService.GetAdminId();
                if (adminId == null)
                    return Unauthorized(new { message = "Identitet korisnika nije moguce utvrditi." });

                bool imaVezu = tag.PostTags.Any(pt => pt.Post.AdminId == adminId.Value);
                if (!imaVezu)
                    return Forbid();
            }

            var prviPost = tag.PostTags.FirstOrDefault()?.Post;

            return Ok(new
            {
                data = new
                {
                    activityId   = tag.Id,
                    name         = tag.Name,
                    category     = ActivityTagHelper.GetActivitySubtype(tag.Category),
                    description  = "",
                    imageUrl     = tag.ImageUrl,
                    color        = tag.Color,
                    lat          = prviPost?.Lat,
                    lng          = prviPost?.Lng,
                    locationName = prviPost?.Region?.Name ?? prviPost?.Address ?? ""
                },
                success = true
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/activities
        // ─────────────────────────────────────────────────────────────────────
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateActivityDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(new { message = "Naziv aktivnosti je obavezan." });

            var noviTag = new Tag
            {
                Name     = dto.Name.Trim(),
                Category = ActivityTagHelper.FormatActivityCategory(dto.Category),
                Color    = string.IsNullOrWhiteSpace(dto.Color) ? null : dto.Color.Trim(),
                ImageUrl = string.IsNullOrWhiteSpace(dto.ImageUrl) ? null : dto.ImageUrl.Trim()
            };

            _context.Tags.Add(noviTag);
            await _context.SaveChangesAsync();

            return Ok(new { data = new { activityId = noviTag.Id }, success = true });
        }

        // ─────────────────────────────────────────────────────────────────────
        // PUT /api/activities/{id}
        // ─────────────────────────────────────────────────────────────────────
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(uint id, [FromBody] CreateActivityDto dto)
        {
            var tag = await _context.Tags.FindAsync(id);
            if (tag == null)
                return NotFound(new { message = $"Aktivnost sa ID={id} nije pronadjena." });
            if (tag.Category == null || !ActivityTagHelper.IsActivityTag(tag.Category))
                return NotFound(new { message = $"Aktivnost sa ID={id} nije pronadjena." });

            if (!_adminIdentityService.IsSuperAdmin())
            {
                var adminId = _adminIdentityService.GetAdminId();
                if (adminId == null)
                    return Unauthorized(new { message = "Identitet korisnika nije moguce utvrditi." });

                bool imaVezu = await _context.PostTags
                    .AnyAsync(pt => pt.TagId == id && pt.Post.AdminId == adminId.Value);

                if (!imaVezu)
                    return Forbid();
            }

            if (!string.IsNullOrWhiteSpace(dto.Name))
                tag.Name = dto.Name.Trim();
            if (dto.Category != null)
                tag.Category = ActivityTagHelper.FormatActivityCategory(dto.Category);
            if (dto.Color != null)
                tag.Color = string.IsNullOrWhiteSpace(dto.Color) ? null : dto.Color.Trim();
            if (dto.ImageUrl != null)
                tag.ImageUrl = string.IsNullOrWhiteSpace(dto.ImageUrl) ? null : dto.ImageUrl.Trim();

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        // ─────────────────────────────────────────────────────────────────────
        // DELETE /api/activities/{id}
        // ─────────────────────────────────────────────────────────────────────
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(uint id)
        {
            var tag = await _context.Tags.FindAsync(id);
            if (tag == null)
                return NotFound(new { message = $"Aktivnost sa ID={id} nije pronadjena." });
            if (tag.Category == null || !ActivityTagHelper.IsActivityTag(tag.Category))
                return NotFound(new { message = $"Aktivnost sa ID={id} nije pronadjena." });

            if (!_adminIdentityService.IsSuperAdmin())
            {
                var adminId = _adminIdentityService.GetAdminId();
                if (adminId == null)
                    return Unauthorized(new { message = "Identitet korisnika nije moguce utvrditi." });

                bool imaVezu = await _context.PostTags
                    .AnyAsync(pt => pt.TagId == id && pt.Post.AdminId == adminId.Value);

                if (!imaVezu)
                    return Forbid();
            }

            _context.Tags.Remove(tag);
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }
    }

    public class CreateActivityDto
    {
        public string Name { get; set; } = "";
        public string? Category { get; set; }
        public string? Description { get; set; }
        public string? Color { get; set; }
        public string? ImageUrl { get; set; }
    }
}
