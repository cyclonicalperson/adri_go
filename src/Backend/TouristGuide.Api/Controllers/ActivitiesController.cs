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
                .Where(t => t.Category == "aktivnost")
                .AsQueryable();

            // ── Filtriranje po ulozi ──────────────────────────────────────────
            // SuperAdmin nema ogranicenja i vidi sve aktivnosti.
            // Obican Admin vidi iskljucivo aktivnosti koje su pridruzene
            // (post_tag) bar jednom postu ciji je on kreator (admin_id).
            if (!_adminIdentityService.IsSuperAdmin())
            {
                var adminId = _adminIdentityService.GetAdminId();
                if (adminId == null)
                    return Unauthorized(new { message = "Identitet korisnika nije moguće utvrditi." });

                // Skupljamo ID-jeve tagova vezanih za postove ovog admina
                var adminTagIds = await _context.PostTags
                    .Where(pt => pt.Post.AdminId == adminId.Value)
                    .Select(pt => pt.TagId)
                    .Distinct()
                    .ToListAsync();

                query = query.Where(t => adminTagIds.Contains(t.Id));
            }

            // Čuvamo query posle admin filtera za statistike (bez category/status filtera)
            var adminFilteredQuery = query;

            // ── Dodatni filteri ───────────────────────────────────────────────
            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(t => t.Name.Contains(search));

            // Subcategory is stored in Color field: "SUBCATEGORY|#hex|status"
            if (!string.IsNullOrWhiteSpace(category) && category != "OTHER")
                query = query.Where(t => t.Color != null && t.Color.ToUpper().StartsWith(category.ToUpper() + "|"));

            // Status filter: Color field ends with "|approved" or "|pending"
            // Podržava i uppercase (PENDING/APPROVED) iz frontenda
            if (!string.IsNullOrWhiteSpace(status))
            {
                var statusLower = status.ToLower();
                query = query.Where(t => t.Color != null && t.Color.ToLower().EndsWith("|" + statusLower));
            }

            var total = await query.CountAsync();

            // ── Sortiranje ────────────────────────────────────────────────────
            query = (sortBy?.ToLower(), sortDir?.ToLower()) switch
            {
                ("name", "asc") => query.OrderBy(t => t.Name),
                ("name", _) => query.OrderByDescending(t => t.Name),
                // Tag model nema createdAt - mapiramo na Id (redosled kreiranja)
                (_, "asc") => query.OrderBy(t => t.Id),
                _ => query.OrderByDescending(t => t.Id)
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
            // Sačuvaj originalni redosled koji je definisao sort (IN() ne garantuje redosled)
            tags = tags.OrderBy(t => tagIds.IndexOf(t.Id)).ToList();

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

                // Parse Color field: "SUBCATEGORY|#hexcolor|status"
                var colorParts = (t.Color ?? "").Split('|');
                var subcat = colorParts.Length >= 1 && colorParts[0].Length > 1 ? colorParts[0] : "OTHER";
                var hexColor = colorParts.Length >= 2 ? colorParts[1] : "#6b7280";
                var storedStatus = colorParts.Length >= 3 ? colorParts[2] : "";
                // Status: use stored status if present, otherwise infer from linked posts
                var status = storedStatus == "pending" ? "pending"
                           : storedStatus == "approved" ? "approved"
                           : veze.Count > 0 ? "approved" : "pending";

                return new
                {
                    id = t.Id,
                    activityId = t.Id,
                    name = t.Name,
                    category = subcat,  // Now returns actual subcategory not 'aktivnost'
                    color = hexColor,
                    description = "",
                    lat = prviPost?.Lat,
                    lng = prviPost?.Lng,
                    locationName = prviPost?.Region?.Name ?? prviPost?.Address ?? "",
                    viewCount = (uint)veze.Sum(pt => (long)pt.Post.ViewCount),
                    linkedPosts = veze.Count,
                    status = status
                };
            }).ToList();

            // Statistike: koristimo isti query (sa admin filterom) za tačne counts
            // query je već filtriran po admin-u ako nije superadmin
            var baseQuery = adminFilteredQuery; // samo admin filter, bez category/status/search
            var sportCount = await baseQuery.CountAsync(t => t.Color != null && t.Color.ToUpper().StartsWith("SPORT|"));
            var natureCount = await baseQuery.CountAsync(t => t.Color != null && (
                t.Color.ToUpper().StartsWith("ADVENTURE|") ||
                t.Color.ToUpper().StartsWith("NATURE|") ||
                t.Color.ToUpper().StartsWith("HIKING|")));
            var wellnessCount = await baseQuery.CountAsync(t => t.Color != null && (
                t.Color.ToUpper().StartsWith("WELLNESS|") ||
                t.Color.ToUpper().StartsWith("SPA|")));
            var pendingCount = await baseQuery.CountAsync(t => t.Color != null && t.Color.ToLower().EndsWith("|pending"));

            return Ok(new
            {
                data,
                total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)total / pageSize),
                sportCount,
                natureCount,
                wellnessCount,
                pendingCount
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
                .FirstOrDefaultAsync(t => t.Id == id && t.Category == "aktivnost");

            if (tag == null)
                return NotFound(new { message = $"Aktivnost sa ID={id} nije pronadjena." });

            // Obican admin moze videti samo aktivnosti vezane za njegov post
            if (!_adminIdentityService.IsSuperAdmin())
            {
                var adminId = _adminIdentityService.GetAdminId();
                if (adminId == null)
                    return Unauthorized(new { message = "Identitet korisnika nije moguće utvrditi." });

                bool imaVezu = tag.PostTags.Any(pt => pt.Post.AdminId == adminId.Value);
                if (!imaVezu)
                    return Forbid();
            }

            var prviPost2 = tag.PostTags.FirstOrDefault()?.Post;
            var colorParts2 = (tag.Color ?? "").Split('|');
            var subcat2 = colorParts2.Length >= 1 && colorParts2[0].Length > 1 ? colorParts2[0] : "OTHER";
            var hex2 = colorParts2.Length >= 2 ? colorParts2[1] : "#6b7280";
            var status2 = colorParts2.Length >= 3 ? colorParts2[2] : "approved";

            return Ok(new
            {
                data = new
                {
                    activityId = tag.Id,
                    id = tag.Id,
                    name = tag.Name,
                    category = subcat2,
                    color = hex2,
                    description = "",
                    status = status2,
                    lat = prviPost2?.Lat,
                    lng = prviPost2?.Lng,
                    locationName = prviPost2?.Region?.Name ?? prviPost2?.Address ?? ""
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

            // Store subcategory in Color field using a structured format: "SUBCATEGORY|#hexcolor"
            // e.g. "SPORT|#3b82f6"  or "pending|#6b7280"
            var subcat = dto.Category?.ToUpper() ?? "OTHER";
            var colorMap = new Dictionary<string, string>
            {
                ["SPORT"] = "#3b82f6",
                ["ADVENTURE"] = "#22c55e",
                ["WELLNESS"] = "#8b5cf6",
                ["SHOPPING"] = "#f59e0b",
                ["DINING"] = "#ef4444",
                ["NIGHTLIFE"] = "#1e1b4b",
                ["SIGHTSEEING"] = "#06b6d4",
                ["CULTURE"] = "#ec4899",
                ["OTHER"] = "#6b7280",
            };
            var hexColor = colorMap.GetValueOrDefault(subcat, "#6b7280");
            // Status prefix: "pending" creates with pending marker
            var statusFlag = string.Equals(dto.Status, "pending", StringComparison.OrdinalIgnoreCase) ? "pending" : "approved";

            var noviTag = new Tag
            {
                Name = dto.Name.Trim(),
                Category = "aktivnost",
                Color = $"{subcat}|{hexColor}|{statusFlag}",
            };

            _context.Tags.Add(noviTag);
            await _context.SaveChangesAsync();

            return Ok(new { data = new { activityId = noviTag.Id, id = noviTag.Id }, success = true });
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

            if (!_adminIdentityService.IsSuperAdmin())
            {
                var adminId = _adminIdentityService.GetAdminId();
                if (adminId == null)
                    return Unauthorized(new { message = "Identitet korisnika nije moguće utvrditi." });

                bool imaVezu = await _context.PostTags
                    .AnyAsync(pt => pt.TagId == id && pt.Post.AdminId == adminId.Value);

                if (!imaVezu)
                    return Forbid();
            }

            if (!string.IsNullOrWhiteSpace(dto.Name))
                tag.Name = dto.Name.Trim();

            // Update subcategory stored in Color field
            if (!string.IsNullOrWhiteSpace(dto.Category))
            {
                var subcat = dto.Category.ToUpper();
                var colorMap = new Dictionary<string, string>
                {
                    ["SPORT"] = "#3b82f6",
                    ["ADVENTURE"] = "#22c55e",
                    ["WELLNESS"] = "#8b5cf6",
                    ["SHOPPING"] = "#f59e0b",
                    ["DINING"] = "#ef4444",
                    ["NIGHTLIFE"] = "#1e1b4b",
                    ["SIGHTSEEING"] = "#06b6d4",
                    ["CULTURE"] = "#ec4899",
                    ["OTHER"] = "#6b7280",
                };
                var hexColor = colorMap.GetValueOrDefault(subcat, "#6b7280");
                // Preserve existing status flag if present
                var existingParts = (tag.Color ?? "").Split('|');
                var statusFlag = existingParts.Length >= 3 ? existingParts[2] : "approved";
                if (!string.IsNullOrWhiteSpace(dto.Status)) statusFlag = dto.Status.ToLower();
                tag.Color = $"{subcat}|{hexColor}|{statusFlag}";
            }
            else if (!string.IsNullOrWhiteSpace(dto.Status))
            {
                var parts = (tag.Color ?? "OTHER|#6b7280|approved").Split('|');
                var subcat = parts.Length >= 1 ? parts[0] : "OTHER";
                var hex = parts.Length >= 2 ? parts[1] : "#6b7280";
                tag.Color = $"{subcat}|{hex}|{dto.Status.ToLower()}";
            }

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

            if (!_adminIdentityService.IsSuperAdmin())
            {
                var adminId = _adminIdentityService.GetAdminId();
                if (adminId == null)
                    return Unauthorized(new { message = "Identitet korisnika nije moguće utvrditi." });

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
        public string? Category { get; set; }   // Subcategory: SPORT, ADVENTURE, WELLNESS etc.
        public string? Description { get; set; }
        public string? Color { get; set; }       // Hex color or subcategory code
        public string? Status { get; set; }      // pending | approved (stored in Color prefix)
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }
}