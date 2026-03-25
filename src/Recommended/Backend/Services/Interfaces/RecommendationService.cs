using MontenegroTourGuide.Api.DTOs.Recommendations;
using MontenegroTourGuide.Api.Repositories.Interfaces;
using MontenegroTourGuide.Api.Services.Interfaces;

namespace MontenegroTourGuide.Api.Services
{
    public class RecommendationService : IRecommendationService
    {
        private readonly IRecommendationRepository _repository;

        private static readonly string[] AccommodationCategories =
        {
            "Smeštaj", "Hotel", "Apartman", "Hostel", "Kamp"
        };

        private static readonly string[] GastronomyCategories =
        {
            "Restoran", "Kafić", "Cafe", "Bar"
        };

        private static readonly string[] LifestyleCategories =
        {
            "Spa", "Wellness", "Shopping", "Masaža", "Salon"
        };

        public RecommendationService(IRecommendationRepository repository)
        {
            _repository = repository;
        }

        public async Task<List<CrossCategoryRecommendationDto>> GetCrossCategoryRecommendationsAsync(
            string sourceCategory,
            int destinationId)
        {
            var destinationName = await _repository.GetDestinationNameAsync(destinationId) ?? "Nepoznata lokacija";
            var destinationCity = await _repository.GetDestinationCityAsync(destinationId);

            var allCategories = new List<string>
            {
                "ACCOMMODATION",
                "DESTINATIONS",
                "GASTRONOMY",
                "EVENTS",
                "RECREATION",
                "LIFESTYLE"
            };

            var targetCategories = allCategories
                .Where(c => !c.Equals(sourceCategory, StringComparison.OrdinalIgnoreCase))
                .ToList();

            var result = new List<CrossCategoryRecommendationDto>();

            foreach (var category in targetCategories)
            {
                var recommendation = await BuildRecommendationAsync(category, destinationId, destinationName, destinationCity);
                if (recommendation != null)
                    result.Add(recommendation);
            }

            return result
                .OrderByDescending(x => x.Score)
                .Take(4)
                .ToList();
        }

        private async Task<CrossCategoryRecommendationDto?> BuildRecommendationAsync(
            string category,
            int destinationId,
            string destinationName,
            string? city)
        {
            int itemsCount = 0;
            decimal avgRating = 0;
            int views = 0;
            List<RecommendationPreviewItemDto> previewItems = new();

            switch (category)
            {
                case "DESTINATIONS":
                    itemsCount = await _repository.GetDestinationsCountAsync(destinationId);
                    views = await _repository.GetViewsForDestinationAsync(destinationId);
                    avgRating = await _repository.GetAverageRatingForDestinationAsync(destinationId);
                    previewItems = await _repository.GetDestinationPreviewItemsAsync(destinationId, 3);
                    break;

                case "EVENTS":
                    itemsCount = await _repository.GetEventsCountAsync(destinationId);
                    views = await _repository.GetViewsForEventsAsync(destinationId);
                    avgRating = await _repository.GetAverageRatingForEventsAsync(destinationId);
                    previewItems = await _repository.GetEventPreviewItemsAsync(destinationId, 3);
                    break;

                case "RECREATION":
                    itemsCount = await _repository.GetRoutesCountAsync(destinationId);
                    views = await _repository.GetViewsForRoutesAsync(destinationId);
                    avgRating = await _repository.GetAverageRatingForRoutesAsync(destinationId);
                    previewItems = await _repository.GetRoutePreviewItemsAsync(destinationId, 3);
                    break;

                case "ACCOMMODATION":
                    itemsCount = await _repository.GetObjectsCountByCategoriesAsync(destinationId, AccommodationCategories);
                    views = await _repository.GetViewsForObjectsAsync(destinationId, AccommodationCategories);
                    avgRating = await _repository.GetAverageRatingForObjectsAsync(destinationId, AccommodationCategories);
                    previewItems = await _repository.GetObjectPreviewItemsByCategoriesAsync(destinationId, AccommodationCategories, 3);
                    break;

                case "GASTRONOMY":
                    itemsCount = await _repository.GetObjectsCountByCategoriesAsync(destinationId, GastronomyCategories);
                    views = await _repository.GetViewsForObjectsAsync(destinationId, GastronomyCategories);
                    avgRating = await _repository.GetAverageRatingForObjectsAsync(destinationId, GastronomyCategories);
                    previewItems = await _repository.GetObjectPreviewItemsByCategoriesAsync(destinationId, GastronomyCategories, 3);
                    break;

                case "LIFESTYLE":
                    itemsCount = await _repository.GetObjectsCountByCategoriesAsync(destinationId, LifestyleCategories);
                    views = await _repository.GetViewsForObjectsAsync(destinationId, LifestyleCategories);
                    avgRating = await _repository.GetAverageRatingForObjectsAsync(destinationId, LifestyleCategories);
                    previewItems = await _repository.GetObjectPreviewItemsByCategoriesAsync(destinationId, LifestyleCategories, 3);
                    break;
            }

            if (itemsCount <= 0)
                return null;

            var normalizedCount = Math.Min(itemsCount, 20) / 20m * 40m;
            var normalizedRating = (avgRating / 5m) * 35m;
            var normalizedViews = Math.Min(views, 200) / 200m * 25m;

            var score = Math.Round(normalizedCount + normalizedRating + normalizedViews, 2);

            return new CrossCategoryRecommendationDto
            {
                CategoryKey = category,
                CategoryLabel = GetCategoryLabel(category),
                DestinationId = destinationId,
                DestinationName = destinationName,
                City = city,
                Score = score,
                ItemsCount = itemsCount,
                NavigationUrl = BuildNavigationUrl(category, destinationId),
                PreviewItems = previewItems
            };
        }

        private static string GetCategoryLabel(string category) => category switch
        {
            "ACCOMMODATION" => "Smeštaj",
            "DESTINATIONS" => "Destinacije",
            "GASTRONOMY" => "Gurmanluk",
            "EVENTS" => "Zabava",
            "RECREATION" => "Rekreacija",
            "LIFESTYLE" => "Lifestyle",
            _ => category
        };

        private static string BuildNavigationUrl(string category, int destinationId) => category switch
        {
            "ACCOMMODATION" => $"/accommodation?destinationId={destinationId}",
            "DESTINATIONS" => $"/destinations?destinationId={destinationId}",
            "GASTRONOMY" => $"/gastronomy?destinationId={destinationId}",
            "EVENTS" => $"/events?destinationId={destinationId}",
            "RECREATION" => $"/recreation?destinationId={destinationId}",
            "LIFESTYLE" => $"/lifestyle?destinationId={destinationId}",
            _ => "/"
        };
    }
}