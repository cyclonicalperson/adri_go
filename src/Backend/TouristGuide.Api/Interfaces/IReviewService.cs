using TouristGuide.Api.DTOs;

namespace TouristGuide.Api.Interfaces
{
    public interface IReviewService
    {
        Task<IReadOnlyList<AdminReviewListItemDto>> GetAllReviews(string role, uint currentAdminId);
        Task<(bool PostExists, IReadOnlyList<ReviewDto> Reviews)> GetReviewsByPostId(uint postId);
        Task<CreateReviewResult> CreateReview(uint postId, uint touristId, CreateReviewDto dto);
    }

    public enum CreateReviewFailure
    {
        None,
        PostNotFound,
        TouristNotFound,
        DuplicateReview
    }

    public sealed class CreateReviewResult
    {
        private CreateReviewResult(CreateReviewFailure failure, string? message, ReviewDto? review)
        {
            Failure = failure;
            Message = message;
            Review = review;
        }

        public CreateReviewFailure Failure { get; }
        public string? Message { get; }
        public ReviewDto? Review { get; }
        public bool Succeeded => Failure == CreateReviewFailure.None;

        public static CreateReviewResult Success(ReviewDto review) =>
            new(CreateReviewFailure.None, null, review);

        public static CreateReviewResult PostNotFound(uint postId) =>
            new(CreateReviewFailure.PostNotFound, $"Objava sa ID={postId} nije pronadjena.", null);

        public static CreateReviewResult TouristNotFound() =>
            new(CreateReviewFailure.TouristNotFound, "Turista nije pronadjen ili nije aktivan.", null);

        public static CreateReviewResult DuplicateReview() =>
            new(CreateReviewFailure.DuplicateReview, "Turista je vec ostavio recenziju za ovu objavu.", null);
    }
}
