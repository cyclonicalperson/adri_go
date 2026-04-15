using System.ComponentModel.DataAnnotations;

namespace TouristGuide.Api.DTOs
{
    public class CreateReviewDto
    {
        [Required(ErrorMessage = "touristId je obavezan.")]
        public uint TouristId { get; set; }

        [Range(1, 5, ErrorMessage = "Ocena mora biti između 1 i 5.")]
        public byte Rating { get; set; }

        [MaxLength(1000, ErrorMessage = "Komentar ne sme biti duži od 1000 karaktera.")]
        public string? Comment { get; set; }
    }
}
