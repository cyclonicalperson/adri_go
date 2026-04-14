namespace TouristGuide.Api.DTOs
{
    public class AdminReviewListItemDto
    {
        public uint ReviewId { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public uint? TouristId { get; set; }
        public string TouristName { get; set; } = string.Empty;
        public uint? PostId { get; set; }
        public string? PostTitle { get; set; }
        public uint? PostAdminId { get; set; }
    }
}
