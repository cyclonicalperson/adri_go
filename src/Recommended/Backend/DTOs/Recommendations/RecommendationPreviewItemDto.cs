namespace MontenegroTourGuide.Api.DTOs.Recommendations
{
    public class RecommendationPreviewItemDto
    {
        public int EntityId { get; set; }
        public string EntityType { get; set; } = string.Empty; // destination, object, event, route
        public string Title { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public string? Subtitle { get; set; }
    }
}