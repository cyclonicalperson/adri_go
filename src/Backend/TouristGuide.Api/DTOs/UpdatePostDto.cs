using System.ComponentModel.DataAnnotations;

namespace TouristGuide.Api.DTOs
{
    /// <summary>
    /// DTO koji admin šalje pri izmeni objave (PUT /posts/{id}).
    /// Sva polja su opcionalna — menja se samo ono što se pošalje.
    /// </summary>
    public class UpdatePostDto
    {
        public uint? RegionId { get; set; }

        [MaxLength(300, ErrorMessage = "Naslov ne smije biti duži od 300 znakova.")]
        public string? Title { get; set; }

        /// <summary>accommodation, restaurant, club, cultural_site,
        /// monument, sports_facility, event, attraction, shop, other</summary>
        public string? PostType { get; set; }

        public string? Description { get; set; }

        public decimal? Lat { get; set; }

        public decimal? Lng { get; set; }

        [MaxLength(300)]
        public string? Address { get; set; }

        [MaxLength(500)]
        public string? ExternalUrl { get; set; }

        [MaxLength(100)]
        public string? ExternalUrlLabel { get; set; }

        /// <summary>JSON string sa nizom URL-ova slika.</summary>
        public string? Images { get; set; }

        /// <summary>JSON string sa radnim vremenom po danima.</summary>
        public string? OpeningHours { get; set; }

        /// <summary>JSON string sa specifičnim atributima po tipu.</summary>
        public string? Details { get; set; }

        /// <summary>draft | published | archived</summary>
        public string? Status { get; set; }
    }
}
