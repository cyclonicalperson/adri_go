namespace MontenegroTourGuide.Api.DTOs.Recommendations
{
    public class CrossCategoryRecommendationDto
    {
        public string CategoryKey { get; set; } = string.Empty;
        public string CategoryLabel { get; set; } = string.Empty;
        public int DestinationId { get; set; }
        public string DestinationName { get; set; } = string.Empty;
        public string? City { get; set; }
        public decimal Score { get; set; }
        public int ItemsCount { get; set; }
        public string NavigationUrl { get; set; } = string.Empty;
        public List<RecommendationPreviewItemDto> PreviewItems { get; set; } = new();
    }
}