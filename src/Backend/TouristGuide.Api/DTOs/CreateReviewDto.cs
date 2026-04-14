using System.ComponentModel.DataAnnotations;

namespace TouristGuide.Api.DTOs
{
    public class CreateReviewDto
    {
        [Range(1, 5, ErrorMessage = "Ocena mora biti izmedju 1 i 5.")]
        public byte Rating { get; set; }

        [MaxLength(1000, ErrorMessage = "Komentar ne sme biti duzi od 1000 karaktera.")]
        public string? Comment { get; set; }
    }
}
