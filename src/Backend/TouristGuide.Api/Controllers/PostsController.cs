using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.DTOs;
using TouristGuide.Api.Interfaces;
using TouristGuide.Api.Models;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PostsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IReviewService _reviewService;

        private static readonly HashSet<string> AllowedPostTypes = new()
        {
            "accommodation", "restaurant", "club", "cultural_site",
            "monument", "sports_facility", "event", "attraction", "shop", "other"
        };

        private static readonly HashSet<string> AllowedStatuses = new()
        {
            "draft", "published", "archived"
        };

        public PostsController(AppDbContext context, IReviewService reviewService)
        {
            _context = context;
            _reviewService = reviewService;
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll(
            [FromQuery] uint? region_id,
            [FromQuery] string? type,
            [FromQuery] string? status,
            [FromQuery] string? sortBy,
            [FromQuery] string? sortDir,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = BuildFilteredPostsQuery(region_id, type, status, forcePublishedOnly: false, out var error);
            if (error is not null)
                return error;

            // Regular admins only see their own posts
            if (!IsSuperAdmin())
            {
                var adminId = GetCurrentAdminId();
                if (adminId.HasValue)
                    query = query!.Where(p => p.AdminId == adminId.Value);
            }

            // Search filter
            if (!string.IsNullOrWhiteSpace(search))
                query = query!.Where(p => p.Title.Contains(search) || (p.Description != null && p.Description.Contains(search)));

            return Ok(await BuildPagedPostsResponse(query!, page, pageSize, sortBy, sortDir));
        }

        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublic(
            [FromQuery] uint? region_id,
            [FromQuery] string? type,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = BuildFilteredPostsQuery(region_id, type, "published", forcePublishedOnly: true, out var error);
            if (error is not null)
                return error;

            return Ok(await BuildPagedPostsResponse(query!, page, pageSize));
        }

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(uint id)
        {
            var post = await _context.Posts
                .Include(p => p.Admin)
                .Include(p => p.Region)
                .Include(p => p.PostTags).ThenInclude(pt => pt.Tag)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            if (!IsAdminUser() && !string.Equals(post.Status, "published", StringComparison.OrdinalIgnoreCase))
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            return Ok(MapToDto(post));
        }

        [HttpGet("my-saved")]
        [Authorize]
        public async Task<IActionResult> GetMySavedPosts()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                return Unauthorized(new { message = "Niste ulogovani ili fali ID u tokenu." });

            if (!uint.TryParse(userIdClaim.Value, out uint touristId))
                return BadRequest(new { message = "Neispravan format ID-ja korisnika." });

            var savedItems = await _context.SavedPosts
                .Where(sp => sp.TouristId == touristId)
                .Include(sp => sp.Post)
                    .ThenInclude(p => p.Admin)
                .Include(sp => sp.Post)
                    .ThenInclude(p => p.Region)
                .ToListAsync();

            var postsDto = savedItems.Select(sp => MapToDto(sp.Post)).ToList();
            return Ok(postsDto);
        }

        [HttpGet("{id}/reviews")]
        [AllowAnonymous]
        public async Task<IActionResult> GetReviews(uint id)
        {
            var postExists = await _context.Posts.AnyAsync(p => p.Id == id && p.Status == "published");
            if (!postExists)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            var reviews = await _context.Reviews
                .Where(r => r.PostId == id && r.IsApproved)
                .Include(r => r.Tourist)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ReviewDto
                {
                    Id = r.Id,
                    TouristId = r.TouristId ?? 0,
                    TouristName = r.Tourist != null ? r.Tourist.Name ?? string.Empty : string.Empty,
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
        [Authorize(Roles = "tourist")]
        public async Task<IActionResult> CreateReview(uint id, [FromBody] CreateReviewDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var touristId = GetRequiredTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id && p.Status == "published");
            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            var tourist = await _context.Tourists.FirstOrDefaultAsync(t => t.Id == touristId.Value && t.IsActive);
            if (tourist is null)
                return Unauthorized(new { message = "Turista nije pronadjen ili nije aktivan." });

            var reviewExists = await _context.Reviews
                .AnyAsync(r => r.PostId == id && r.TouristId == touristId.Value);

            if (reviewExists)
                return Conflict(new { message = "Turista je vec ostavio recenziju za ovu objavu." });

            var review = new Review
            {
                PostId = id,
                TouristId = touristId.Value,
                Rating = (byte)dto.Rating,
                Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim(),
                IsApproved = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            await RefreshReviewStats(post);

            return CreatedAtAction(
                nameof(GetReviews),
                new { id },
                MapToReviewDto(review, tourist.Name)
            );
        }

        [HttpPost]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> Create([FromBody] CreatePostDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // AdminId se čita iz JWT tokena; ignoriši vrednost iz tela zahteva
            var jwtAdminId = GetCurrentAdminId();
            if (jwtAdminId.HasValue)
                dto.AdminId = jwtAdminId.Value;

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
                Images = dto.ImagesToString(),
                OpeningHours = dto.OpeningHoursToString(),
                Details = dto.DetailsToString(),
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

        [HttpPost("{id:int}/toggle-save")]
        [Authorize]
        public async Task<IActionResult> ToggleSavePost(uint id)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                return Unauthorized(new { message = "Niste ulogovani." });

            if (!uint.TryParse(userIdClaim.Value, out uint touristId))
                return BadRequest(new { message = "Neispravan format ID-ja." });

            var post = await _context.Posts.FindAsync(id);
            if (post == null)
                return NotFound(new { message = "Lokacija nije pronađena." });

            var existingSave = await _context.SavedPosts
                .FirstOrDefaultAsync(sp => sp.TouristId == touristId && sp.PostId == id);

            if (existingSave != null)
            {
                _context.SavedPosts.Remove(existingSave);
                await _context.SaveChangesAsync();
                return Ok(new { isSaved = false, message = "Uklonjeno iz sačuvanih." });
            }
            else
            {
                var newSave = new SavedPost { TouristId = touristId, PostId = id };
                _context.SavedPosts.Add(newSave);
                await _context.SaveChangesAsync();
                return Ok(new { isSaved = true, message = "Dodato u sačuvane." });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> Update(uint id, [FromBody] UpdatePostDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var post = await _context.Posts
                .Include(p => p.Admin)
                .Include(p => p.Region)
                .Include(p => p.PostTags).ThenInclude(pt => pt.Tag)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

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
                post.Images = dto.ImagesToString();

            if (dto.OpeningHours is not null)
                post.OpeningHours = dto.OpeningHoursToString();

            if (dto.Details is not null)
                post.Details = dto.DetailsToString();

            if (dto.Status is not null)
            {
                var statusLower = dto.Status.ToLower().Trim();
                if (!AllowedStatuses.Contains(statusLower))
                    return BadRequest(new { message = "Status mora biti: draft, published ili archived." });

                if (statusLower == "published" && post.Status != "published")
                    post.PublishedAt = DateTime.UtcNow;

                post.Status = statusLower;
            }

            // Ažuriranje tag veza
            if (dto.TagIds is not null)
            {
                var existingTags = await _context.PostTags.Where(pt => pt.PostId == id).ToListAsync();
                _context.PostTags.RemoveRange(existingTags);

                foreach (var tagId in dto.TagIds.Distinct())
                {
                    var tagExists = await _context.Tags.AnyAsync(t => t.Id == tagId);
                    if (tagExists)
                        _context.PostTags.Add(new PostTag { PostId = id, TagId = tagId });
                }
            }

            post.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _context.Entry(post).Reference(p => p.Admin).LoadAsync();
            await _context.Entry(post).Reference(p => p.Region).LoadAsync();
            await _context.Entry(post).Collection(p => p.PostTags).Query().Include(pt => pt.Tag).LoadAsync();

            return Ok(MapToDto(post));
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> Delete(uint id)
        {
            var post = await _context.Posts.FindAsync(id);
            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            _context.Posts.Remove(post);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Objava '{post.Title}' (ID={id}) je uspešno obrisana." });
        }

        [HttpPost("{id}/like")]
        [Authorize(Roles = "tourist")]
        public async Task<IActionResult> Like(uint id)
        {
            var touristId = GetRequiredTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id && p.Status == "published");
            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            var likeExists = await _context.PostLikes.AnyAsync(x => x.PostId == id && x.TouristId == touristId.Value);
            if (likeExists)
                return Ok(new { message = "Objava je vec lajkovana.", likeCount = post.LikeCount });

            _context.PostLikes.Add(new PostLike
            {
                PostId = id,
                TouristId = touristId.Value,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            await RefreshLikeCount(post);

            return Ok(new { message = "Objava je uspesno lajkovana.", likeCount = post.LikeCount });
        }

        [HttpDelete("{id}/like")]
        [Authorize(Roles = "tourist")]
        public async Task<IActionResult> Unlike(uint id)
        {
            var touristId = GetRequiredTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id && p.Status == "published");
            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            var like = await _context.PostLikes.FirstOrDefaultAsync(x => x.PostId == id && x.TouristId == touristId.Value);
            if (like is null)
                return Ok(new { message = "Objava nije bila lajkovana.", likeCount = post.LikeCount });

            _context.PostLikes.Remove(like);
            await _context.SaveChangesAsync();
            await RefreshLikeCount(post);

            return Ok(new { message = "Lajk je uklonjen.", likeCount = post.LikeCount });
        }

        [HttpPost("{id}/save")]
        [Authorize(Roles = "tourist")]
        public async Task<IActionResult> Save(uint id)
        {
            var touristId = GetRequiredTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id && p.Status == "published");
            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            var saveExists = await _context.SavedPosts.AnyAsync(x => x.PostId == id && x.TouristId == touristId.Value);
            if (saveExists)
                return Ok(new { message = "Objava je vec sacuvana.", saveCount = post.SaveCount });

            _context.SavedPosts.Add(new SavedPost
            {
                PostId = id,
                TouristId = touristId.Value,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            await RefreshSaveCount(post);

            return Ok(new { message = "Objava je uspesno sacuvana.", saveCount = post.SaveCount });
        }

        [HttpDelete("{id}/save")]
        [Authorize(Roles = "tourist")]
        public async Task<IActionResult> Unsave(uint id)
        {
            var touristId = GetRequiredTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id && p.Status == "published");
            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            var savedPost = await _context.SavedPosts.FirstOrDefaultAsync(x => x.PostId == id && x.TouristId == touristId.Value);
            if (savedPost is null)
                return Ok(new { message = "Objava nije bila sacuvana.", saveCount = post.SaveCount });

            _context.SavedPosts.Remove(savedPost);
            await _context.SaveChangesAsync();
            await RefreshSaveCount(post);

            return Ok(new { message = "Sačuvana objava je uklonjena.", saveCount = post.SaveCount });
        }

        [HttpPost("{id}/view")]
        [AllowAnonymous]
        public async Task<IActionResult> RegisterView(uint id)
        {
            var touristId = GetAuthorizedTouristId();

            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == id && p.Status == "published");
            if (post is null)
                return NotFound(new { message = $"Objava sa ID={id} nije pronadjena." });

            _context.PostViews.Add(new PostView
            {
                PostId = id,
                TouristId = touristId,
                CreatedAt = DateTime.UtcNow
            });

            post.ViewCount += 1;
            post.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Pregled je evidentiran.", viewCount = post.ViewCount });
        }

        #region Private Helpers

        private IQueryable<Post> BuildFilteredPostsQuery(
            uint? regionId,
            string? type,
            string? status,
            bool forcePublishedOnly,
            out IActionResult? error)
        {
            error = null;

            var query = _context.Posts
                .AsNoTracking()
                .Include(p => p.Admin)
                .Include(p => p.Region)
                .Include(p => p.PostTags).ThenInclude(pt => pt.Tag)
                .AsQueryable();

            if (regionId.HasValue)
                query = query.Where(p => p.RegionId == regionId.Value);

            if (!string.IsNullOrWhiteSpace(type))
            {
                var typeLower = type.ToLower().Trim();
                if (!AllowedPostTypes.Contains(typeLower))
                {
                    error = BadRequest(new { message = $"Nepoznat tip '{type}'. Dozvoljeni: {string.Join(", ", AllowedPostTypes)}" });
                    return query;
                }
                query = query.Where(p => p.PostType == typeLower);
            }

            if (forcePublishedOnly)
            {
                query = query.Where(p =>
                    p.Status == "published" &&
                    (p.RegionId == null || (p.Region != null && p.Region.IsActive)));
                return query;
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var statusLower = status.ToLower().Trim();
                if (!AllowedStatuses.Contains(statusLower))
                {
                    error = BadRequest(new { message = $"Nepoznat status '{status}'. Dozvoljeni: draft, published, archived" });
                    return query;
                }
                query = query.Where(p => p.Status == statusLower);
            }
            else
            {
                query = query.Where(p => p.Status == "published");
            }

            return query;
        }

        private async Task<object> BuildPagedPostsResponse(
            IQueryable<Post> query, int page, int pageSize,
            string? sortBy = null, string? sortDir = null)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var total = await query.CountAsync();

            // Sortiranje
            query = (sortBy?.ToLower(), sortDir?.ToLower()) switch
            {
                ("title" or "name", "asc") => query.OrderBy(p => p.Title),
                ("title" or "name", _) => query.OrderByDescending(p => p.Title),
                ("viewcount", "asc") => query.OrderBy(p => p.ViewCount),
                ("viewcount", _) => query.OrderByDescending(p => p.ViewCount),
                ("createdat", "asc") => query.OrderBy(p => p.CreatedAt),
                ("createdat", _) => query.OrderByDescending(p => p.CreatedAt),
                ("updatedat", "asc") => query.OrderBy(p => p.UpdatedAt),
                ("updatedat", _) => query.OrderByDescending(p => p.UpdatedAt),
                ("averagerating" or "rating", "asc") => query.OrderBy(p => p.AvgRating),
                ("averagerating" or "rating", _) => query.OrderByDescending(p => p.AvgRating),
                _ => query.OrderByDescending(p => p.CreatedAt),
            };

            var posts = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var data = new List<PostDto>(posts.Count);
            foreach (var post in posts)
                data.Add(MapToDto(post));

            return new
            {
                total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)total / pageSize),
                data
            };
        }

        private static PostDto MapToDto(Post post) => new()
        {
            Id = post.Id,
            AdminId = post.AdminId,
            AdminName = post.Admin?.FullName ?? string.Empty,
            RegionId = post.RegionId,
            RegionName = post.Region?.Name,
            Title = post.Title,
            PostType = post.PostType,
            Description = post.Description,
            Latitude = post.Lat,
            Longitude = post.Lng,
            Lat = post.Lat,
            Lng = post.Lng,
            Address = post.Address,
            ExternalUrl = post.ExternalUrl,
            ExternalUrlLabel = post.ExternalUrlLabel,
            Images = post.Images,
            OpeningHours = post.OpeningHours,
            Details = post.Details,
            Status = post.Status,
            ViewCount = post.ViewCount,
            LikeCount = post.LikeCount,
            SaveCount = post.SaveCount,
            ReviewCount = post.ReviewCount,
            AvgRating = post.AvgRating,
            PublishedAt = post.PublishedAt,
            CreatedAt = post.CreatedAt,
            UpdatedAt = post.UpdatedAt,
            TagIds = post.PostTags?.Select(pt => pt.TagId).ToList() ?? new List<uint>(),
            TagNames = post.PostTags?.Where(pt => pt.Tag != null).Select(pt => pt.Tag!.Name).ToList() ?? new List<string>()
        };

        private static ReviewDto MapToReviewDto(Review review, string? touristName = null) => new()
        {
            Id = review.Id,
            TouristId = review.TouristId ?? 0,
            TouristName = touristName ?? review.Tourist?.Name ?? string.Empty,
            Rating = review.Rating,
            Comment = review.Comment,
            CreatedAt = review.CreatedAt
        };

        private async Task RefreshReviewStats(Post post)
        {
            post.AvgRating = await _context.Reviews
                .Where(r => r.PostId == post.Id && r.IsApproved)
                .AverageAsync(r => (decimal?)r.Rating);
            post.ReviewCount = (uint)await _context.Reviews.CountAsync(r => r.PostId == post.Id && r.IsApproved);
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

        private uint? GetAuthorizedTouristId()
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            if (!string.Equals(role, "tourist", StringComparison.OrdinalIgnoreCase))
                return null;

            var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            return uint.TryParse(value, out var touristId) ? touristId : null;
        }

        private uint? GetRequiredTouristId() => GetAuthorizedTouristId();

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

        private bool IsAdminUser()
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase)
                || string.Equals(role, "superadmin", StringComparison.OrdinalIgnoreCase);
        }

        #endregion
    }
}