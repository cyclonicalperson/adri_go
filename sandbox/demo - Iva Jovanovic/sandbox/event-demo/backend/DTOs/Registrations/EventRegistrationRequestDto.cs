using System.ComponentModel.DataAnnotations;

namespace EventDemo.Api.DTOs.Registrations;

public class EventRegistrationRequestDto
{
    [Required]
    [StringLength(150)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(255)]
    public string Email { get; set; } = string.Empty;
}
