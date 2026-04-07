using System.ComponentModel.DataAnnotations;

namespace TouristGuide.Api.DTOs
{
    /// <summary>
    /// DTO koji frontend šalje pri login-u admin korisnika.
    /// </summary>
    public class LoginRequestDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }

    /// <summary>
    /// Osnovni podaci o prijavljenom admin korisniku.
    /// </summary>
    public class AuthenticatedAdminDto
    {
        public uint Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string AccountStatus { get; set; } = string.Empty;
        public uint? OrganizationId { get; set; }
        public bool IsIndividual { get; set; }
        public List<string> Permissions { get; set; } = new();

    }

    /// <summary>
    /// DTO koji backend vraća nakon uspešnog login-a.
    /// </summary>
    public class LoginResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAtUtc { get; set; }
        public AuthenticatedAdminDto User { get; set; } = new();
    }
}
