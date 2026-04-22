namespace TouristGuide.Api.DTOs.Recommendations
{
    public class ContentRecommendationItemDto
    {
        public uint EntityId { get; set; }
        public string EntityType { get; set; } = "post";
        public string Title { get; set; } = string.Empty;
        public string PostType { get; set; } = string.Empty;
        public uint? RegionId { get; set; }
        public string? RegionName { get; set; }
        public string? ImageUrl { get; set; }
        public decimal Score { get; set; }
        public string Reason { get; set; } = string.Empty;
        public List<string> MatchedTags { get; set; } = new();
    }
}
