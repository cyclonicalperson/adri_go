using System.ComponentModel.DataAnnotations;

namespace TouristGuide.Api.DTOs
{
    /// <summary>
    /// DTO koji admin šalje pri kreiranju nove objave (POST /posts).
    /// </summary>
    public class CreatePostDto
    {
        // AdminId se automatski čita iz JWT tokena u PostsController.Create
        public uint AdminId { get; set; }

        public uint? RegionId { get; set; }

        [Required(ErrorMessage = "Naslov je obavezan.")]
        [MaxLength(300, ErrorMessage = "Naslov ne smije biti duži od 300 znakova.")]
        public string Title { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tip objave je obavezan.")]
        public string PostType { get; set; } = string.Empty;
        // Dozvoljene vrijednosti: accommodation, restaurant, club, cultural_site,
        // monument, sports_facility, event, attraction, shop, other

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

        /// <summary>draft | published | archived — podrazumijevano: draft.</summary>
        public string Status { get; set; } = "draft";
    }
}
