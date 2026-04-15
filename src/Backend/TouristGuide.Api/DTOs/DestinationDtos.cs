using System.ComponentModel.DataAnnotations;

namespace TouristGuide.Api.DTOs
{
    /// <summary>
    /// DTO koji se vraća frontendu za jednu destinaciju.
    /// Destinacija = Region iz baze — endpoint /api/destinations je alias za /api/regions.
    /// </summary>
    public class DestinationDto
    {
        public uint DestinationId { get; set; }   // alias za regionId — frontend koristi destinationId
        public uint RegionId      { get; set; }   // isti ID, duplikat radi kompatibilnosti
        public string Name        { get; set; } = string.Empty;

        /// <summary>city | mountain | lake | national_park | coast | village | other</summary>
        public string Type        { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Country     { get; set; } = "Montenegro";
        public decimal? Lat       { get; set; }
        public decimal? Lng       { get; set; }
        public string? CoverImage { get; set; }
        public bool IsActive      { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>
    /// DTO za kreiranje nove destinacije (POST /api/destinations).
    /// </summary>
    public class CreateDestinationDto
    {
        [Required(ErrorMessage = "Naziv destinacije je obavezan.")]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tip destinacije je obavezan.")]
        public string Type { get; set; } = "city";
        // Dozvoljene vrijednosti: city | mountain | lake | national_park | coast | village | other

        public string? Description { get; set; }

        [MaxLength(100)]
        public string Country { get; set; } = "Montenegro";

        public decimal? Lat       { get; set; }
        public decimal? Lng       { get; set; }

        [MaxLength(500)]
        public string? CoverImage { get; set; }

        public bool IsActive { get; set; } = true;
    }

    /// <summary>
    /// DTO za izmjenu destinacije (PUT /api/destinations/{id}).
    /// Sva polja su opcionalna — šalješ samo ono što mijenjaš.
    /// </summary>
    public class UpdateDestinationDto
    {
        [MaxLength(200)]
        public string? Name        { get; set; }
        public string? Type        { get; set; }
        public string? Description { get; set; }

        [MaxLength(100)]
        public string? Country     { get; set; }
        public decimal? Lat        { get; set; }
        public decimal? Lng        { get; set; }

        [MaxLength(500)]
        public string? CoverImage  { get; set; }
        public bool? IsActive      { get; set; }
    }
}
