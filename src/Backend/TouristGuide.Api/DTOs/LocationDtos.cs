namespace TouristGuide.Api.DTOs
{
    /// <summary>
    /// DTO koji se vraća za jednu lokaciju (region) u listi.
    /// </summary>
    public class LocationListItemDto
    {
        public uint Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Country { get; set; } = string.Empty;
        public decimal? Lat { get; set; }
        public decimal? Lng { get; set; }
        public string? CoverImage { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// Ukupan broj objava (postova) vezanih za ovu lokaciju.
        /// </summary>
        public int PostCount { get; set; }
    }

    /// <summary>
    /// Paginiran odgovor za listu lokacija.
    /// </summary>
    public class LocationListResponseDto
    {
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public List<LocationListItemDto> Data { get; set; } = new();
    }
}
