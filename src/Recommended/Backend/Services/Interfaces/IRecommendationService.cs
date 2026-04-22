using TouristGuide.Api.DTOs.Recommendations;

namespace TouristGuide.Api.Services.Interfaces
{
    public interface IRecommendationService
    {
        Task<List<ContentRecommendationItemDto>> GetRecommendationsAsync(
            uint regionId,
            uint? touristId,
            string contextMode = "onsite",
            int take = 10);
    }
}
