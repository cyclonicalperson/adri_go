using MontenegroTourGuide.Api.DTOs.Recommendations;

namespace MontenegroTourGuide.Api.Services.Interfaces
{
    public interface IRecommendationService
    {
        Task<List<CrossCategoryRecommendationDto>> GetCrossCategoryRecommendationsAsync(
            string sourceCategory,
            int destinationId);
    }
}