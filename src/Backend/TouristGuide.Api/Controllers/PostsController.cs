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

        private static readonly HashSet<string> AllowedPostTypes = new()
        {
            "accommodation", "restaurant", "club", "cultural_site",
            "monument", "sports_facility", "event", "attraction", "shop", "other"
        };

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

            if (region_id.HasValue)
                query = query.Where(p => p.RegionId == region_id.Value);

            if (!string.IsNullOrWhiteSpace(type))
            {
                var typeLower = type.ToLower().Trim();
                if (!AllowedPostTypes.Contains(typeLower))
                    return BadRequest(new { message = $"Nepoznat tip '{type}'. Dozvoljeni: {string.Join(", ", AllowedPostTypes)}" });

                query = query.Where(p => p.PostType == typeLower);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var statusLower = status.ToLower().Trim();
                if (!AllowedStatuses.Contains(statusLower))
                    return BadRequest(new { message = $"Nepoznat status '{status}'. Dozvoljeni: draft, published, archived" });

                query = query.Where(p => p.Status == statusLower);
            }
            else
            {
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

        [HttpGet("{id}/reviews")]
        public async Task<IActionResult> GetReviews(uint id)
        {
            var postExists = await _context.Posts.AnyAsync(p => p.Id == id);
            if (!postExists)
                return NotFound(new { message = $"Objava sa ID={id} nije pronađena." });

            var reviews = await _context.PostReviews
                .Where(r => r.PostId == id)
                .Include(r => r.Tourist)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ReviewDto
                {
                    Id = r.Id,
                    TouristId = r.TouristId,
                    TouristName = r.Tourist.Name ?? string.Empty,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                total = reviews.Count,
                data = reviews
            });
        }

        [HttpPost("{id}/reviews")]
        public async Task<IActionResult> CreateReview(uint id, [FromBody] CreateReviewDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id);
            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronađena." });

            var tourist = await _context.Tourists.FirstOrDefaultAsync(t => t.Id == dto.TouristId);
            if (tourist is null)
                return BadRequest(new { message = $"Turista sa ID={dto.TouristId} ne postoji." });

            var reviewExists = await _context.PostReviews
                .AnyAsync(r => r.PostId == id && r.TouristId == dto.TouristId);

            if (reviewExists)
                return Conflict(new { message = "Turista je već ostavio recenziju za ovu objavu." });

            var review = new PostReview
            {
                PostId = id,
                TouristId = dto.TouristId,
                Rating = dto.Rating,
                Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _context.PostReviews.Add(review);
            await _context.SaveChangesAsync();

            await RefreshReviewStats(post);

            return CreatedAtAction(
                nameof(GetReviews),
                new { id },
                MapToReviewDto(review, tourist.Name)
            );
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePostDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var postTypeLower = dto.PostType.ToLower().Trim();
            if (!AllowedPostTypes.Contains(postTypeLower))
                return BadRequest(new { message = $"Nepoznat tip '{dto.PostType}'. Dozvoljeni: {string.Join(", ", AllowedPostTypes)}" });

            var statusLower = dto.Status.ToLower().Trim();
            if (!AllowedStatuses.Contains(statusLower))
                return BadRequest(new { message = "Status mora biti: draft, published ili archived." });

            var adminExists = await _context.AdminUsers.AnyAsync(a => a.Id == dto.AdminId);
            if (!adminExists)
                return BadRequest(new { message = $"Admin sa ID={dto.AdminId} ne postoji." });

            if (dto.RegionId.HasValue)
            {
                var regionExists = await _context.Regions.AnyAsync(r => r.Id == dto.RegionId.Value);
                if (!regionExists)
                    return BadRequest(new { message = $"Region sa ID={dto.RegionId} ne postoji." });
            }

            var now = DateTime.UtcNow;

            var post = new Post
            {
                AdminId = dto.AdminId,
                RegionId = dto.RegionId,
                Title = dto.Title.Trim(),
                PostType = postTypeLower,
                Description = dto.Description?.Trim(),
                Lat = dto.Lat,
                Lng = dto.Lng,
                Address = dto.Address?.Trim(),
                ExternalUrl = dto.ExternalUrl?.Trim(),
                ExternalUrlLabel = dto.ExternalUrlLabel?.Trim(),
                Images = dto.Images,
                OpeningHours = dto.OpeningHours,
                Details = dto.Details,
                Status = statusLower,
                PublishedAt = statusLower == "published" ? now : null,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Posts.Add(post);
            await _context.SaveChangesAsync();

            await _context.Entry(post).Reference(p => p.Admin).LoadAsync();
            await _context.Entry(post).Reference(p => p.Region).LoadAsync();

            return CreatedAtAction(
                nameof(GetById),
                new { id = post.Id },
                MapToDto(post)
            );
        }

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

                if (statusLower == "published" && post.Status != "published")
                    post.PublishedAt = DateTime.UtcNow;

                post.Status = statusLower;
            }

            post.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _context.Entry(post).Reference(p => p.Admin).LoadAsync();
            await _context.Entry(post).Reference(p => p.Region).LoadAsync();

            return Ok(MapToDto(post));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(uint id)
        {
            var post = await _context.Posts.FindAsync(id);

            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronađena." });

            _context.Posts.Remove(post);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Objava '{post.Title}' (ID={id}) je uspešno obrisana." });
        }

        [HttpPost("{id}/like")]
        public async Task<IActionResult> Like(uint id, [FromBody] PostInteractionDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id);
            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronađena." });

            var touristExists = await _context.Tourists.AnyAsync(t => t.Id == dto.TouristId);
            if (!touristExists)
                return BadRequest(new { message = $"Turista sa ID={dto.TouristId} ne postoji." });

            var likeExists = await _context.PostLikes
                .AnyAsync(x => x.PostId == id && x.TouristId == dto.TouristId);

            if (likeExists)
                return Ok(new { message = "Objava je već lajkovana.", likeCount = post.LikeCount });

            _context.PostLikes.Add(new PostLike
            {
                PostId = id,
                TouristId = dto.TouristId,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            await RefreshLikeCount(post);

            return Ok(new
            {
                message = "Objava je uspešno lajkovana.",
                likeCount = post.LikeCount
            });
        }

        [HttpPost("{id}/save")]
        public async Task<IActionResult> Save(uint id, [FromBody] PostInteractionDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id);
            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronađena." });

            var touristExists = await _context.Tourists.AnyAsync(t => t.Id == dto.TouristId);
            if (!touristExists)
                return BadRequest(new { message = $"Turista sa ID={dto.TouristId} ne postoji." });

            var saveExists = await _context.SavedPosts
                .AnyAsync(x => x.PostId == id && x.TouristId == dto.TouristId);

            if (saveExists)
                return Ok(new { message = "Objava je već sačuvana.", saveCount = post.SaveCount });

            _context.SavedPosts.Add(new SavedPost
            {
                PostId = id,
                TouristId = dto.TouristId,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            await RefreshSaveCount(post);

            return Ok(new
            {
                message = "Objava je uspešno sačuvana.",
                saveCount = post.SaveCount
            });
        }

        [HttpPost("{id}/view")]
        public async Task<IActionResult> RegisterView(uint id, [FromBody] PostInteractionDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id);
            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronađena." });

            var touristExists = await _context.Tourists.AnyAsync(t => t.Id == dto.TouristId);
            if (!touristExists)
                return BadRequest(new { message = $"Turista sa ID={dto.TouristId} ne postoji." });

            _context.PostViews.Add(new PostView
            {
                PostId = id,
                TouristId = dto.TouristId,
                CreatedAt = DateTime.UtcNow
            });

            post.ViewCount += 1;
            post.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Pregled je evidentiran.",
                viewCount = post.ViewCount
            });
        }

        private static PostDto MapToDto(Post p) => new()
        {
            Id = p.Id,
            AdminId = p.AdminId,
            AdminName = p.Admin?.FullName ?? string.Empty,
            RegionId = p.RegionId,
            RegionName = p.Region?.Name,
            Title = p.Title,
            PostType = p.PostType,
            Description = p.Description,
            Lat = p.Lat,
            Lng = p.Lng,
            Address = p.Address,
            ExternalUrl = p.ExternalUrl,
            ExternalUrlLabel = p.ExternalUrlLabel,
            Images = p.Images,
            OpeningHours = p.OpeningHours,
            Details = p.Details,
            Status = p.Status,
            ViewCount = p.ViewCount,
            LikeCount = p.LikeCount,
            SaveCount = p.SaveCount,
            ReviewCount = p.ReviewCount,
            AvgRating = p.AvgRating,
            PublishedAt = p.PublishedAt,
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt
        };

        private static ReviewDto MapToReviewDto(PostReview review, string? touristName = null) => new()
        {
            Id = review.Id,
            TouristId = review.TouristId,
            TouristName = touristName ?? review.Tourist?.Name ?? string.Empty,
            Rating = review.Rating,
            Comment = review.Comment,
            CreatedAt = review.CreatedAt
        };

        private async Task RefreshReviewStats(Post post)
        {
            post.ReviewCount = (uint)await _context.PostReviews.CountAsync(r => r.PostId == post.Id);
            post.AvgRating = await _context.PostReviews
                .Where(r => r.PostId == post.Id)
                .AverageAsync(r => (decimal?)r.Rating);
            post.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        private async Task RefreshLikeCount(Post post)
        {
            post.LikeCount = (uint)await _context.PostLikes.CountAsync(x => x.PostId == post.Id);
            post.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        private async Task RefreshSaveCount(Post post)
        {
            post.SaveCount = (uint)await _context.SavedPosts.CountAsync(x => x.PostId == post.Id);
            post.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }
    }
}
