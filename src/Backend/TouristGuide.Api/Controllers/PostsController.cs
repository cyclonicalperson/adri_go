using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.DTOs;
using TouristGuide.Api.Models;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PostsController : ControllerBase
    {
        private readonly AppDbContext _context;

        // Dozvoljeni tipovi objava prema bazi
        private static readonly HashSet<string> AllowedPostTypes = new()
        {
            "accommodation", "restaurant", "club", "cultural_site",
            "monument", "sports_facility", "event", "attraction", "shop", "other"
        };

        // Dozvoljeni statusi
        private static readonly HashSet<string> AllowedStatuses = new()
        {
            "draft", "published", "archived"
        };

        public PostsController(AppDbContext context)
        {
            _context = context;
        }

        
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] uint? region_id,
            [FromQuery] string? type,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var query = _context.Posts
                .Include(p => p.Admin)
                .Include(p => p.Region)
                .AsQueryable();

            // Filter po regionu
            if (region_id.HasValue)
                query = query.Where(p => p.RegionId == region_id.Value);

            // Filter po tipu
            if (!string.IsNullOrWhiteSpace(type))
            {
                var typeLower = type.ToLower().Trim();
                if (!AllowedPostTypes.Contains(typeLower))
                    return BadRequest(new { message = $"Nepoznat tip '{type}'. Dozvoljeni: {string.Join(", ", AllowedPostTypes)}" });

                query = query.Where(p => p.PostType == typeLower);
            }

            // Filter po statusu — ako nije proslijeđen, vraćamo samo published
            if (!string.IsNullOrWhiteSpace(status))
            {
                var statusLower = status.ToLower().Trim();
                if (!AllowedStatuses.Contains(statusLower))
                    return BadRequest(new { message = $"Nepoznat status '{status}'. Dozvoljeni: draft, published, archived" });

                query = query.Where(p => p.Status == statusLower);
            }
            else
            {
                // Defaultno — publici vide samo published
                query = query.Where(p => p.Status == "published");
            }

            var total = await query.CountAsync();

            var posts = await query
                .OrderByDescending(p => p.PublishedAt)
                .ThenByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => MapToDto(p))
                .ToListAsync();

            return Ok(new
            {
                total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)total / pageSize),
                data = posts
            });
        }

        // ============================================================
        // GET /api/posts/{id}
        // Vraća jednu objavu sa svim detaljima
        // ============================================================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(uint id)
        {
            var post = await _context.Posts
                .Include(p => p.Admin)
                .Include(p => p.Region)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronađena." });

            return Ok(MapToDto(post));
        }

        // ============================================================
        // POST /api/posts
        // Kreira novu objavu — samo admin
        // ============================================================
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePostDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Validacija tipa
            var postTypeLower = dto.PostType.ToLower().Trim();
            if (!AllowedPostTypes.Contains(postTypeLower))
                return BadRequest(new { message = $"Nepoznat tip '{dto.PostType}'. Dozvoljeni: {string.Join(", ", AllowedPostTypes)}" });

            // Validacija statusa
            var statusLower = dto.Status.ToLower().Trim();
            if (!AllowedStatuses.Contains(statusLower))
                return BadRequest(new { message = "Status mora biti: draft, published ili archived." });

            // Provjera da admin postoji
            var adminExists = await _context.AdminUsers.AnyAsync(a => a.Id == dto.AdminId);
            if (!adminExists)
                return BadRequest(new { message = $"Admin sa ID={dto.AdminId} ne postoji." });

            // Provjera regiona (ako je proslijeđen)
            if (dto.RegionId.HasValue)
            {
                var regionExists = await _context.Regions.AnyAsync(r => r.Id == dto.RegionId.Value);
                if (!regionExists)
                    return BadRequest(new { message = $"Region sa ID={dto.RegionId} ne postoji." });
            }

            var now = DateTime.UtcNow;

            var post = new Post
            {
                AdminId          = dto.AdminId,
                RegionId         = dto.RegionId,
                Title            = dto.Title.Trim(),
                PostType         = postTypeLower,
                Description      = dto.Description?.Trim(),
                Lat              = dto.Lat,
                Lng              = dto.Lng,
                Address          = dto.Address?.Trim(),
                ExternalUrl      = dto.ExternalUrl?.Trim(),
                ExternalUrlLabel = dto.ExternalUrlLabel?.Trim(),
                Images           = dto.Images,
                OpeningHours     = dto.OpeningHours,
                Details          = dto.Details,
                Status           = statusLower,
                PublishedAt      = statusLower == "published" ? now : null,
                CreatedAt        = now,
                UpdatedAt        = now
            };

            _context.Posts.Add(post);
            await _context.SaveChangesAsync();

            // Učitaj navigacione propertije za response
            await _context.Entry(post).Reference(p => p.Admin).LoadAsync();
            await _context.Entry(post).Reference(p => p.Region).LoadAsync();

            return CreatedAtAction(
                nameof(GetById),
                new { id = post.Id },
                MapToDto(post)
            );
        }

        // ============================================================
        // PUT /api/posts/{id}
        // Izmena postojeće objave — samo admin
        // Šalju se samo polja koja se menjaju (partial update)
        // ============================================================
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(uint id, [FromBody] UpdatePostDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var post = await _context.Posts
                .Include(p => p.Admin)
                .Include(p => p.Region)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronađena." });

            // Ažuriraj samo polja koja su prosleđena
            if (dto.RegionId.HasValue)
            {
                var regionExists = await _context.Regions.AnyAsync(r => r.Id == dto.RegionId.Value);
                if (!regionExists)
                    return BadRequest(new { message = $"Region sa ID={dto.RegionId} ne postoji." });
                post.RegionId = dto.RegionId.Value;
            }

            if (dto.Title is not null)
                post.Title = dto.Title.Trim();

            if (dto.PostType is not null)
            {
                var typeLower = dto.PostType.ToLower().Trim();
                if (!AllowedPostTypes.Contains(typeLower))
                    return BadRequest(new { message = $"Nepoznat tip '{dto.PostType}'. Dozvoljeni: {string.Join(", ", AllowedPostTypes)}" });
                post.PostType = typeLower;
            }

            if (dto.Description is not null)
                post.Description = dto.Description.Trim();

            if (dto.Lat.HasValue)
                post.Lat = dto.Lat.Value;

            if (dto.Lng.HasValue)
                post.Lng = dto.Lng.Value;

            if (dto.Address is not null)
                post.Address = dto.Address.Trim();

            if (dto.ExternalUrl is not null)
                post.ExternalUrl = dto.ExternalUrl.Trim();

            if (dto.ExternalUrlLabel is not null)
                post.ExternalUrlLabel = dto.ExternalUrlLabel.Trim();

            if (dto.Images is not null)
                post.Images = dto.Images;

            if (dto.OpeningHours is not null)
                post.OpeningHours = dto.OpeningHours;

            if (dto.Details is not null)
                post.Details = dto.Details;

            if (dto.Status is not null)
            {
                var statusLower = dto.Status.ToLower().Trim();
                if (!AllowedStatuses.Contains(statusLower))
                    return BadRequest(new { message = "Status mora biti: draft, published ili archived." });

                // Postavi published_at kad se prvi put objavljuje
                if (statusLower == "published" && post.Status != "published")
                    post.PublishedAt = DateTime.UtcNow;

                post.Status = statusLower;
            }

            post.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Osvježi navigacione propertije
            await _context.Entry(post).Reference(p => p.Admin).LoadAsync();
            await _context.Entry(post).Reference(p => p.Region).LoadAsync();

            return Ok(MapToDto(post));
        }

        // ============================================================
        // DELETE /api/posts/{id}
        // Briše objavu — samo admin
        // ============================================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(uint id)
        {
            var post = await _context.Posts.FindAsync(id);

            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronađena." });

            _context.Posts.Remove(post);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Objava '{post.Title}' (ID={id}) je uspješno obrisana." });
        }

        // ============================================================
        // Helper — mapiranje Post entiteta na PostDto
        // ============================================================
        private static PostDto MapToDto(Post p) => new()
        {
            Id               = p.Id,
            AdminId          = p.AdminId,
            AdminName        = p.Admin?.FullName ?? string.Empty,
            RegionId         = p.RegionId,
            RegionName       = p.Region?.Name,
            Title            = p.Title,
            PostType         = p.PostType,
            Description      = p.Description,
            Lat              = p.Lat,
            Lng              = p.Lng,
            Address          = p.Address,
            ExternalUrl      = p.ExternalUrl,
            ExternalUrlLabel = p.ExternalUrlLabel,
            Images           = p.Images,
            OpeningHours     = p.OpeningHours,
            Details          = p.Details,
            Status           = p.Status,
            ViewCount        = p.ViewCount,
            LikeCount        = p.LikeCount,
            SaveCount        = p.SaveCount,
            ReviewCount      = p.ReviewCount,
            AvgRating        = p.AvgRating,
            PublishedAt      = p.PublishedAt,
            CreatedAt        = p.CreatedAt,
            UpdatedAt        = p.UpdatedAt
        };
    }
}
