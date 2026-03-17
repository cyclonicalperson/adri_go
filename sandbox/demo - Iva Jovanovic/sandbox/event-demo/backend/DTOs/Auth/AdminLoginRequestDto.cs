using System.ComponentModel.DataAnnotations;

namespace EventDemo.Api.DTOs.Auth;

public class AdminLoginRequestDto
{
    [Required]
    [StringLength(100)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [StringLength(255)]
    public string Password { get; set; } = string.Empty;
}
