using MontenegroTourGuide.Api.DTOs.Recommendations;

namespace MontenegroTourGuide.Api.Repositories.Interfaces
{
    public interface IRecommendationRepository
    {
        Task<string?> GetDestinationNameAsync(int destinationId);
        Task<string?> GetDestinationCityAsync(int destinationId);

        Task<int> GetDestinationsCountAsync(int destinationId);
        Task<int> GetEventsCountAsync(int destinationId);
        Task<int> GetRoutesCountAsync(int destinationId);

        Task<int> GetObjectsCountByCategoriesAsync(int destinationId, IEnumerable<string> categories);

        Task<decimal> GetAverageRatingForObjectsAsync(int destinationId, IEnumerable<string> categories);
        Task<decimal> GetAverageRatingForEventsAsync(int destinationId);
        Task<decimal> GetAverageRatingForRoutesAsync(int destinationId);
        Task<decimal> GetAverageRatingForDestinationAsync(int destinationId);

        Task<int> GetViewsForObjectsAsync(int destinationId, IEnumerable<string> categories);
        Task<int> GetViewsForEventsAsync(int destinationId);
        Task<int> GetViewsForRoutesAsync(int destinationId);
        Task<int> GetViewsForDestinationAsync(int destinationId);

        Task<List<RecommendationPreviewItemDto>> GetDestinationPreviewItemsAsync(int destinationId, int take);
        Task<List<RecommendationPreviewItemDto>> GetEventPreviewItemsAsync(int destinationId, int take);
        Task<List<RecommendationPreviewItemDto>> GetRoutePreviewItemsAsync(int destinationId, int take);
        Task<List<RecommendationPreviewItemDto>> GetObjectPreviewItemsByCategoriesAsync(int destinationId, IEnumerable<string> categories, int take);
    }
}