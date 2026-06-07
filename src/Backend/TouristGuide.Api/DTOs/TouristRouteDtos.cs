namespace TouristGuide.Api.DTOs
{
    public class TouristRouteUpsertDto
    {
        public string? Title { get; set; }
        public string? Waypoints { get; set; }
        public string? TravelMode { get; set; }
        public bool ScenicMode { get; set; }
        public decimal? DistanceKm { get; set; }
        public uint? DurationMin { get; set; }
        public uint? SourceRouteId { get; set; }
    }

    public class TouristRouteResponseDto
    {
        public uint TouristRouteId { get; set; }
        public uint TouristId { get; set; }
        public uint? SourceRouteId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Waypoints { get; set; }
        public string? ImageUrl { get; set; }
        public string TravelMode { get; set; } = "driving";
        public bool ScenicMode { get; set; }
        public decimal? DistanceKm { get; set; }
        public uint? DurationMin { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class SavedRouteLibraryItemDto
    {
        public string Kind { get; set; } = "curatedFavorite";
        public string Badge { get; set; } = "Curated route";
        public uint? RouteId { get; set; }
        public uint? TouristRouteId { get; set; }
        public uint? SourceRouteId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Waypoints { get; set; }
        public string? Images { get; set; }
        public string? ImageUrl { get; set; }
        public string? TravelMode { get; set; }
        public bool? ScenicMode { get; set; }
        public decimal? DistanceKm { get; set; }
        public uint? DurationMin { get; set; }
        public uint? ElevationGainM { get; set; }
        public string? Difficulty { get; set; }
        public string? RegionName { get; set; }
        public string? CountryName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsSaved { get; set; } = true;
        public uint? SaveCount { get; set; }
    }
}
