using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using TouristGuide.Api.Data;
using TouristGuide.Api.DTOs;
using TouristGuide.Api.Interfaces;
using TouristGuide.Api.Models;

namespace TouristGuide.Api.Services
{
    public class ReviewService : IReviewService
    {
        private const string PublishedPostStatus = "published";
        private const string ApprovedReviewStatus = "APPROVED";

        private readonly AppDbContext _context;

        public ReviewService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IReadOnlyList<AdminReviewListItemDto>> GetAllReviews(string role, uint currentAdminId)
        {
            var query = _context.Reviews
                .AsNoTracking()
                .Include(r => r.Post)
                .Include(r => r.Tourist)
                .AsQueryable();

            if (!string.Equals(role, "superadmin", StringComparison.OrdinalIgnoreCase))
            {
                // Admin vidi recenzije svojih postova; rute su globalne pa ih vide svi
                query = query.Where(r =>
                    (r.Post != null && r.Post.AdminId == currentAdminId) ||
                    (r.RouteId != null && r.PostId == null));
            }

            return await query
                .Include(r => r.Route)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new AdminReviewListItemDto
                {
                    ReviewId    = r.Id,
                    Rating      = r.Rating,
                    Comment     = r.Comment,
                    Status      = r.Status,
                    CreatedAt   = r.CreatedAt,
                    TouristId   = r.TouristId,
                    TouristName = r.Tourist != null ? r.Tourist.Name ?? string.Empty : string.Empty,
                    PostId      = r.PostId,
                    PostTitle   = r.Post != null ? r.Post.Title : null,
                    PostAdminId = r.Post != null ? r.Post.AdminId : (uint?)null,
                    PostType    = r.Post != null ? r.Post.PostType : null,
                    RouteId     = r.RouteId,
                    RouteName   = r.Route != null ? r.Route.Name : null,
                    EntityType  = r.RouteId != null && r.PostId == null ? "ROUTE"
                                : r.Post != null && r.Post.PostType == "event" ? "EVENT"
                                : "OBJECT"
                })
                .ToListAsync();
        }

        public async Task<(bool PostExists, IReadOnlyList<ReviewDto> Reviews)> GetReviewsByPostId(uint postId)
        {
            var postExists = await _context.Posts
                .AsNoTracking()
                .AnyAsync(p => p.Id == postId && p.Status == PublishedPostStatus);

            if (!postExists)
                return (false, Array.Empty<ReviewDto>());

            var reviews = await _context.Reviews
                .AsNoTracking()
                .Where(IsApprovedReview())
                .Where(r => r.PostId == postId)
                .Include(r => r.Tourist)
                .OrderByDescending(r => r.CreatedAt)
                .Select(MapToReviewDto())
                .ToListAsync();

            return (true, reviews);
        }

        public async Task<CreateReviewResult> CreateReview(uint postId, uint touristId, CreateReviewDto dto)
        {
            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == postId && p.Status == PublishedPostStatus);
            if (post is null)
                return CreateReviewResult.PostNotFound(postId);

            var tourist = await _context.Tourists
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == touristId && t.IsActive);

            if (tourist is null)
                return CreateReviewResult.TouristNotFound();

            var reviewExists = await _context.Reviews
                .AnyAsync(r => r.PostId == postId && r.TouristId == touristId);

            if (reviewExists)
                return CreateReviewResult.DuplicateReview();

            var review = new Review
            {
                PostId = postId,
                TouristId = touristId,
                Rating = (byte)dto.Rating,
                Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim(),
                Status = ApprovedReviewStatus,
                IsApproved = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            await RefreshReviewStats(post);

            return CreateReviewResult.Success(MapToReviewDto(review, tourist.Name));
        }

        private async Task RefreshReviewStats(Post post)
        {
            post.AvgRating = await _context.Reviews
                .Where(IsApprovedReview())
                .Where(r => r.PostId == post.Id)
                .AverageAsync(r => (decimal?)r.Rating);

            post.ReviewCount = (uint)await _context.Reviews
                .Where(IsApprovedReview())
                .CountAsync(r => r.PostId == post.Id);

            post.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        private static Expression<Func<Review, bool>> IsApprovedReview() =>
            review => review.Status == ApprovedReviewStatus;

        private static Expression<Func<Review, ReviewDto>> MapToReviewDto() => review => new ReviewDto
        {
            Id = review.Id,
            TouristId = review.TouristId,
            TouristName = review.Tourist != null ? review.Tourist.Name ?? string.Empty : string.Empty,
            Rating = review.Rating,
            Comment = review.Comment,
            CreatedAt = review.CreatedAt
        };

        private static ReviewDto MapToReviewDto(Review review, string? touristName) => new()
        {
            Id = review.Id,
            TouristId = review.TouristId,
            TouristName = touristName ?? review.Tourist?.Name ?? string.Empty,
            Rating = review.Rating,
            Comment = review.Comment,
            CreatedAt = review.CreatedAt
        };
    }
}
