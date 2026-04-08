namespace TouristGuide.Api.DTOs
{
    /// <summary>
    /// DTO koji se vraca turistima i adminima bez internih polja.
    /// </summary>
    public class PostDto
    {
        public uint Id { get; set; }
        public uint AdminId { get; set; }
        public string AdminName { get; set; } = string.Empty;
        public uint? RegionId { get; set; }
        public string? RegionName { get; set; }
        public string Title { get; set; } = string.Empty;
        public string PostType { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? Lat { get; set; }
        public decimal? Lng { get; set; }
        public string? Address { get; set; }
        public string? ExternalUrl { get; set; }
        public string? ExternalUrlLabel { get; set; }
        public string? Images { get; set; }
        public string? OpeningHours { get; set; }
        public string? Details { get; set; }
        public string Status { get; set; } = string.Empty;
        public uint ViewCount { get; set; }
        public uint LikeCount { get; set; }
        public uint SaveCount { get; set; }
        public uint ReviewCount { get; set; }
        public decimal? AvgRating { get; set; }
        public DateTime? PublishedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
