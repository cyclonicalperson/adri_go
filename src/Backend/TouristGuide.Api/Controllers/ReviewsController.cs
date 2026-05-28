using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.DTOs;
using TouristGuide.Api.Interfaces;
using TouristGuide.Api.Models;
using TouristGuide.Api.Services;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewsController : ControllerBase
    {
        private readonly IReviewService _reviewService;
        private readonly AppDbContext _db;
        private readonly AdminPermissionService _permissionService;
        private readonly TouristNotificationService _touristNotificationService;

        public ReviewsController(
            IReviewService reviewService,
            AppDbContext db,
            AdminPermissionService permissionService,
            TouristNotificationService touristNotificationService)
        {
            _reviewService = reviewService;
            _db = db;
            _permissionService = permissionService;
            _touristNotificationService = touristNotificationService;
        }

        // GET /api/reviews  — podrzava ?status=PENDING|APPROVED|REJECTED &entityType=OBJECT|EVENT|ROUTE &page= &pageSize=
        [HttpGet]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? status,
            [FromQuery] string? entityType,
            [FromQuery] string? search,
            [FromQuery] string? sortBy,
            [FromQuery] string? sortDir,
            [FromQuery] int? minRating,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            if (!await _permissionService.CanManageReviewsAsync())
                return Forbid();

            var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            var currentAdminId = GetAuthorizedAdminId();
            if (currentAdminId is null) return Unauthorized(new { message = "Admin nije autentifikovan." });

            var allReviews = await _reviewService.GetAllReviews(role, currentAdminId.Value);
            IEnumerable<AdminReviewListItemDto> filtered = allReviews;

            if (!string.IsNullOrWhiteSpace(status))
                filtered = filtered.Where(r => string.Equals(r.Status, status, StringComparison.OrdinalIgnoreCase));

            if (!string.IsNullOrWhiteSpace(entityType))
            {
                filtered = entityType.ToUpperInvariant() switch
                {
                    "ROUTE" => filtered.Where(r => r.RouteId.HasValue && !r.PostId.HasValue),
                    "EVENT" => filtered.Where(r => r.PostType == "event"),
                    "OBJECT" => filtered.Where(r => r.PostId.HasValue && r.PostType != "event"),
                    _ => filtered
                };
            }

            if (minRating.HasValue && minRating.Value >= 1)
            {
                filtered = minRating.Value switch
                {
                    5 => filtered.Where(r => r.Rating == 5),
                    _ => filtered.Where(r => r.Rating >= minRating.Value)
                };
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = NormalizeSearch(search);
                filtered = filtered.Where(r =>
                    NormalizeSearch(r.TouristName).Contains(normalizedSearch) ||
                    NormalizeSearch(r.PostTitle).Contains(normalizedSearch) ||
                    NormalizeSearch(r.RouteName).Contains(normalizedSearch) ||
                    NormalizeSearch(r.Comment).Contains(normalizedSearch) ||
                    r.ReviewId.ToString().Contains(normalizedSearch));
            }

            var list = filtered.ToList();

            // Sortiranje
            list = (sortBy?.ToLower(), sortDir?.ToLower()) switch
            {
                ("rating", "asc") => list.OrderBy(r => r.Rating).ToList(),
                ("rating", _) => list.OrderByDescending(r => r.Rating).ToList(),
                ("createdat", "asc") => list.OrderBy(r => r.CreatedAt).ToList(),
                _ => list.OrderByDescending(r => r.CreatedAt).ToList(),
            };

            var total = list.Count;
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;

            var data = list
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new
                {
                    reviewId = r.ReviewId,
                    touristId = r.TouristId,
                    touristName = r.TouristName,
                    postId = r.PostId,
                    routeId = r.RouteId,
                    rating = r.Rating,
                    comment = r.Comment,
                    status = r.Status,
                    createdAt = r.CreatedAt,
                    entityType = r.RouteId.HasValue && !r.PostId.HasValue ? "ROUTE"
                                : r.PostType == "event" ? "EVENT" : "OBJECT",
                    entityName = r.PostTitle ?? r.RouteName,
                    postType = r.PostType
                })
                .ToList();

            return Ok(new { total, page, pageSize, totalPages = (int)Math.Ceiling((double)total / pageSize), data });
        }

        private static string NormalizeSearch(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;
            var normalized = value.Trim().ToLowerInvariant().Normalize(System.Text.NormalizationForm.FormD);
            var chars = normalized
                .Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark)
                .ToArray();
            return new string(chars).Normalize(System.Text.NormalizationForm.FormC);
        }

        // PATCH /api/reviews/{id}/status
        [HttpPatch("{id}/status")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> UpdateStatus(uint id, [FromBody] UpdateReviewStatusDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Status)) return BadRequest(new { message = "Status je obavezan." });
            var allowed = new[] { "PENDING", "APPROVED", "REJECTED" };
            if (!allowed.Contains(dto.Status.ToUpperInvariant()))
                return BadRequest(new { message = "Status mora biti: PENDING, APPROVED ili REJECTED." });

            if (!await _permissionService.CanManageReviewsAsync())
                return Forbid();

            var review = await _db.Reviews
                .Include(r => r.Post)
                .Include(r => r.Route)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (review is null) return NotFound(new { message = $"Recenzija sa ID={id} nije pronadjena." });

            if (!await CanManageReviewAsync(review))
                return Forbid();

            var previousStatus = review.Status;
            review.Status = dto.Status.ToUpperInvariant();
            review.IsApproved = review.Status == "APPROVED";
            var postId = review.PostId;

            var notification = await _touristNotificationService.QueueReviewStatusUpdateAsync(review, previousStatus, dto.RejectionReason);

            await _db.SaveChangesAsync();
            await _touristNotificationService.DispatchAsync(notification);

            if (postId.HasValue)
                await RefreshPostReviewStatsAsync(postId.Value);

            return Ok(new { data = new { reviewId = review.Id, status = review.Status, isApproved = review.IsApproved }, success = true });
        }

        // DELETE /api/reviews/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = "superadmin")]
        public async Task<IActionResult> Delete(uint id)
        {
            var review = await _db.Reviews.FindAsync(id);
            if (review is null) return NotFound(new { message = $"Recenzija sa ID={id} nije pronadjena." });

            var postId = review.PostId;
            _db.Reviews.Remove(review);
            await _db.SaveChangesAsync();

            if (postId.HasValue)
                await RefreshPostReviewStatsAsync(postId.Value);

            return Ok(new { success = true, message = $"Recenzija ID={id} je obrisana." });
        }

        private uint? GetAuthorizedAdminId()
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            if (!string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) && !string.Equals(role, "superadmin", StringComparison.OrdinalIgnoreCase)) return null;
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            return uint.TryParse(value, out var adminId) ? adminId : null;
        }

        private async Task<bool> CanManageReviewAsync(Review review)
        {
            if (_permissionService.IsSuperAdmin())
                return true;

            if (review.Post is not null)
                return await _permissionService.CanManageOwnContentAsync(review.Post.AdminId, review.Post.RegionId);

            if (review.Route is not null)
                return await _permissionService.CanManageOwnContentAsync(review.Route.AdminId, review.Route.RegionId);

            return false;
        }

        private async Task RefreshPostReviewStatsAsync(uint postId)
        {
            var post = await _db.Posts.FindAsync(postId);
            if (post is null)
                return;

            post.AvgRating = await _db.Reviews
                .Where(r => r.PostId == post.Id && r.Status == "APPROVED")
                .AverageAsync(r => (decimal?)r.Rating);
            post.ReviewCount = (uint)await _db.Reviews.CountAsync(r => r.PostId == post.Id && r.Status == "APPROVED");
            post.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

    }

    public class UpdateReviewStatusDto
    {
        public string Status { get; set; } = string.Empty;
        public string? RejectionReason { get; set; }
    }
}
