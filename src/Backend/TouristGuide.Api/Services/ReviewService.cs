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
        private const string PendingReviewStatus = "PENDING";
        private const string RejectedReviewStatus = "REJECTED";

        private readonly AppDbContext _context;
        private readonly IReviewModerationService _moderation;
        private readonly TouristNotificationService _notifications;
        private readonly NotificationService _adminNotifications;
        private readonly ILogger<ReviewService> _logger;

        public ReviewService(
            AppDbContext context,
            IReviewModerationService moderation,
            TouristNotificationService notifications,
            NotificationService adminNotifications,
            ILogger<ReviewService> logger)
        {
            _context            = context;
            _moderation         = moderation;
            _notifications      = notifications;
            _adminNotifications = adminNotifications;
            _logger             = logger;
        }

        public async Task<IReadOnlyList<AdminReviewListItemDto>> GetAllReviews(string role, uint currentAdminId)
        {
            var query = _context.Reviews
                .AsNoTracking()
                .Include(r => r.Post)
                .Include(r => r.Route)
                .Include(r => r.Tourist)
                .AsQueryable();

            if (!string.Equals(role, "superadmin", StringComparison.OrdinalIgnoreCase))
            {
                // Admin vidi samo recenzije sadržaja koji je sam kreirao.
                query = query.Where(r =>
                    (r.Post != null && r.Post.AdminId == currentAdminId) ||
                    (r.Route != null && r.Route.AdminId == currentAdminId));
            }

            return await query
                .OrderByDescending(r => r.CreatedAt)
                .Take(500)  // Limit za performanse — frontend radi client-side pagination
                .Select(r => new AdminReviewListItemDto
                {
                    ReviewId = r.Id,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    Status = r.Status,
                    CreatedAt = r.CreatedAt,
                    TouristId = r.TouristId,
                    TouristName = r.Tourist != null ? r.Tourist.Name ?? string.Empty : string.Empty,
                    PostId = r.PostId,
                    PostTitle = r.Post != null ? r.Post.Title : null,
                    PostAdminId = r.Post != null ? r.Post.AdminId : (uint?)null,
                    PostType = r.Post != null ? r.Post.PostType : null,
                    RouteId = r.RouteId,
                    RouteName = r.Route != null ? r.Route.Name : null,
                    EntityType = r.RouteId != null && r.PostId == null ? "ROUTE"
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

            var existingReview = await _context.Reviews
                .FirstOrDefaultAsync(r => r.PostId == postId && r.TouristId == touristId);

            if (existingReview is not null &&
                !string.Equals(existingReview.Status, RejectedReviewStatus, StringComparison.OrdinalIgnoreCase))
                return CreateReviewResult.DuplicateReview();

            var submittedAt = DateTime.UtcNow;
            var normalizedComment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim();

            // AI moderacija — određuje početni status recenzije
            var moderation = await _moderation.ModerateAsync(normalizedComment);
            var initialStatus = moderation.IsSafe ? ApprovedReviewStatus : RejectedReviewStatus;
            var isApproved = moderation.IsSafe;

            if (existingReview is not null)
            {
                existingReview.Rating = (byte)dto.Rating;
                existingReview.Comment = normalizedComment;
                existingReview.Status = initialStatus;
                existingReview.IsApproved = isApproved;
                existingReview.CreatedAt = submittedAt;
                await _context.SaveChangesAsync();

                if (isApproved)
                {
                    await RefreshReviewStats(post);
                    var notification = await _notifications.QueueReviewStatusUpdateAsync(existingReview, PendingReviewStatus, null);
                    await _context.SaveChangesAsync();
                    await _notifications.DispatchAsync(notification);
                }
                else
                {
                    await NotifyAdminOfFlaggedReviewAsync(post, existingReview, moderation.FlagReason);
                }

                return CreateReviewResult.Success(MapToReviewDto(existingReview, tourist.Name));
            }

            var review = new Review
            {
                PostId = postId,
                TouristId = touristId,
                Rating = (byte)dto.Rating,
                Comment = normalizedComment,
                Status = initialStatus,
                IsApproved = isApproved,
                CreatedAt = submittedAt
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            if (isApproved)
            {
                await RefreshReviewStats(post);
                var notification = await _notifications.QueueReviewStatusUpdateAsync(review, PendingReviewStatus, null);
                await _context.SaveChangesAsync();
                await _notifications.DispatchAsync(notification);
            }
            else
            {
                await NotifyAdminOfFlaggedReviewAsync(post, review, moderation.FlagReason);
            }

            return CreateReviewResult.Success(MapToReviewDto(review, tourist.Name));
        }

        private async Task NotifyAdminOfFlaggedReviewAsync(Post post, Review review, string? flagReason)
        {
            try
            {
                var reason = flagReason ?? "FLAGGED";
                var shortReason = reason.StartsWith("LOCAL_KEYWORD:") ? "sadrži zabranjenu reč" :
                                  reason.StartsWith("LOCAL_SPACED_KEYWORD:") ? "sadrži zabranjenu reč (maskirana)" :
                                  reason == "LOCAL_URL_DETECTED" ? "sadrži URL/link" :
                                  reason == "LOCAL_REPETITION" ? "sadrži ponavljanje karaktera" :
                                  reason == "LOCAL_NO_CONTENT" ? "nema stvarnog sadržaja" :
                                  reason == "LOCAL_TOO_SHORT" ? "previše kratka" :
                                  reason == "LOCAL_TOO_LONG" ? "previše dugačka" :
                                  reason.StartsWith("GEMINI:") ? "AI moderacija" :
                                  "automatska moderacija";

                await _adminNotifications.SendToAdminAsync(
                    adminId: post.AdminId,
                    type: "flagged_review",
                    title: "Nova recenzija čeka pregled",
                    body: $"Recenzija za \"{ post.Title}\" je flagovana ({shortReason}) i čeka odobrenje.",
                    payload: new
                    {
                        reviewId  = review.Id,
                        postId    = post.Id,
                        postTitle = post.Title,
                        flagReason = reason,
                        url       = "/reviews?status=PENDING"
                    });
            }
            catch (Exception ex)
            {
                // Neuspeh notifikacije ne sme da blokira kreiranje recenzije
                _logger.LogWarning(ex, "ReviewService: neuspelo slanje admin notifikacije za review {ReviewId}", review.Id);
            }
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
            Status = review.Status,
            CreatedAt = review.CreatedAt
        };

        private static ReviewDto MapToReviewDto(Review review, string? touristName) => new()
        {
            Id = review.Id,
            TouristId = review.TouristId,
            TouristName = touristName ?? review.Tourist?.Name ?? string.Empty,
            Rating = review.Rating,
            Comment = review.Comment,
            Status = review.Status,
            CreatedAt = review.CreatedAt
        };
    }
}
