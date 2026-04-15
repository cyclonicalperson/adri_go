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
    public class ReviewsController : ControllerBase
    {
        private readonly IReviewService _reviewService;
        private readonly AppDbContext _db;

        public ReviewsController(IReviewService reviewService, AppDbContext db)
        {
            _reviewService = reviewService;
            _db = db;
        }

        // GET /api/reviews  — podrzava ?status=PENDING|APPROVED|REJECTED &entityType=OBJECT|EVENT|ROUTE &page= &pageSize=
        [HttpGet]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? status,
            [FromQuery] string? entityType,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
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
                    "ROUTE"  => filtered.Where(r => r.RouteId.HasValue && !r.PostId.HasValue),
                    "EVENT"  => filtered.Where(r => r.PostType == "event"),
                    "OBJECT" => filtered.Where(r => r.PostId.HasValue && r.PostType != "event"),
                    _        => filtered
                };
            }

            var list = filtered.ToList();
            var total = list.Count;
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;

            var data = list
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new
                {
                    reviewId    = r.ReviewId,
                    touristId   = r.TouristId,
                    touristName = r.TouristName,
                    postId      = r.PostId,
                    routeId     = r.RouteId,
                    rating      = r.Rating,
                    comment     = r.Comment,
                    status      = r.Status,
                    createdAt   = r.CreatedAt,
                    entityType  = r.RouteId.HasValue && !r.PostId.HasValue ? "ROUTE"
                                : r.PostType == "event" ? "EVENT" : "OBJECT",
                    entityName  = r.PostTitle ?? r.RouteName,
                    postType    = r.PostType
                })
                .ToList();

            return Ok(new { total, page, pageSize, totalPages = (int)Math.Ceiling((double)total / pageSize), data });
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

            var review = await _db.Reviews.FindAsync(id);
            if (review is null) return NotFound(new { message = $"Recenzija sa ID={id} nije pronadjena." });

            review.Status = dto.Status.ToUpperInvariant();
            review.IsApproved = review.Status == "APPROVED";

            if (review.PostId.HasValue)
            {
                var post = await _db.Posts.FindAsync(review.PostId.Value);
                if (post is not null)
                {
                    post.AvgRating = await _db.Reviews.Where(r => r.PostId == post.Id && r.Status == "APPROVED").AverageAsync(r => (decimal?)r.Rating);
                    post.ReviewCount = (uint)await _db.Reviews.CountAsync(r => r.PostId == post.Id && r.Status == "APPROVED");
                    post.UpdatedAt = DateTime.UtcNow;
                }
            }
            await _db.SaveChangesAsync();

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
            {
                var post = await _db.Posts.FindAsync(postId.Value);
                if (post is not null)
                {
                    post.AvgRating = await _db.Reviews.Where(r => r.PostId == post.Id && r.Status == "APPROVED").AverageAsync(r => (decimal?)r.Rating);
                    post.ReviewCount = (uint)await _db.Reviews.CountAsync(r => r.PostId == post.Id && r.Status == "APPROVED");
                    post.UpdatedAt = DateTime.UtcNow;
                    await _db.SaveChangesAsync();
                }
            }

            return Ok(new { success = true, message = $"Recenzija ID={id} je obrisana." });
        }

        private uint? GetAuthorizedAdminId()
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            if (!string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) && !string.Equals(role, "superadmin", StringComparison.OrdinalIgnoreCase)) return null;
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            return uint.TryParse(value, out var adminId) ? adminId : null;
        }
    }

    public class UpdateReviewStatusDto
    {
        public string Status { get; set; } = string.Empty;
        public string? RejectionReason { get; set; }
    }
}
