namespace TouristGuide.Api.DTOs
{
    public class ReviewDto
    {
        public uint Id { get; set; }
        public uint TouristId { get; set; }
        public string TouristName { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
