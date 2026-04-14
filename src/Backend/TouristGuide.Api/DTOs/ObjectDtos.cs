using System.ComponentModel.DataAnnotations;

namespace TouristGuide.Api.DTOs
{
    /// <summary>
    /// DTO za kreiranje nove lokacije (POST /api/objects).
    /// Ovo je alias za CreatePostDto ali sa kategorijama koje koristi frontend (HOTEL, RESTAURANT...).
    /// </summary>
    public class CreateObjectDto
    {
        [Required(ErrorMessage = "Naziv lokacije je obavezan.")]
        [MaxLength(300)]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Kategorija u formatu koji frontend šalje:
        /// HOTEL | RESTAURANT | CLUB | CULTURAL | MONUMENT | SPORT | NATURE | SHOP | OTHER
        /// </summary>
        [Required(ErrorMessage = "Kategorija je obavezna.")]
        public string Category { get; set; } = string.Empty;

        public uint? RegionId      { get; set; }
        public string? Description { get; set; }
        public string? Address     { get; set; }
        public decimal? Latitude   { get; set; }
        public decimal? Longitude  { get; set; }

        [MaxLength(500)]
        public string? Website     { get; set; }

        public string? Images      { get; set; }
        public string? OpeningHours { get; set; }

        /// <summary>JSON string sa specifičnim atributima.</summary>
        public string? Details     { get; set; }

        /// <summary>draft | published | archived</summary>
        public string Status { get; set; } = "draft";
    }

    /// <summary>
    /// DTO za izmjenu lokacije (PUT /api/objects/{id}).
    /// Sva polja su opcionalna.
    /// </summary>
    public class UpdateObjectDto
    {
        [MaxLength(300)]
        public string? Name        { get; set; }
        public string? Category    { get; set; }
        public uint? RegionId      { get; set; }
        public string? Description { get; set; }
        public string? Address     { get; set; }
        public decimal? Latitude   { get; set; }
        public decimal? Longitude  { get; set; }

        [MaxLength(500)]
        public string? Website     { get; set; }

        public string? Images      { get; set; }
        public string? OpeningHours { get; set; }
        public string? Details     { get; set; }
        public string? Status      { get; set; }
    }
}
