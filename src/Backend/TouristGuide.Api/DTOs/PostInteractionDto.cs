using System.ComponentModel.DataAnnotations;

namespace TouristGuide.Api.DTOs
{
    public class PostInteractionDto
    {
        [Required(ErrorMessage = "touristId je obavezan.")]
        public uint TouristId { get; set; }
    }
}
