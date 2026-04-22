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
    /// DTO koji backend vraća nakon uspešnog login-a admin korisnika.
    /// </summary>
    public class LoginResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAtUtc { get; set; }
        public AuthenticatedAdminDto User { get; set; } = new();
    }

    /// <summary>
    /// DTO za registraciju turista.
    /// </summary>
    public class TouristRegisterRequestDto
    {
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;

        [MaxLength(5)]
        public string Language { get; set; } = "en";
    }

    /// <summary>
    /// DTO za login turista.
    /// </summary>
    public class TouristLoginRequestDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }

    /// <summary>
    /// Osnovni podaci o prijavljenom turisti.
    /// </summary>
    public class TouristMeDto
    {
        public uint Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Language { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool IsEmailVerified { get; set; }
        public DateTime CreatedAt { get; set; }
        /// <summary>Broj sačuvanih objava</summary>
        public int SavedPostsCount { get; set; }
        /// <summary>Broj recenzija koje je turista napisao</summary>
        public int ReviewsCount { get; set; }
    }

    /// <summary>
    /// Jedna sačuvana lokacija (post) u listi sačuvanih.
    /// </summary>
    public class SavedLocationDto
    {
        public uint SavedId { get; set; }
        public uint PostId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string PostType { get; set; } = string.Empty;
        public string? Address { get; set; }
        public decimal? Lat { get; set; }
        public decimal? Lng { get; set; }
        /// <summary>URL prve slike (ako postoji)</summary>
        public string? CoverImage { get; set; }
        public DateTime SavedAt { get; set; }
    }

    /// <summary>
    /// DTO koji backend vraća nakon uspešne registracije ili login-a turista.
    /// </summary>
    public class TouristAuthResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAtUtc { get; set; }
        public TouristMeDto User { get; set; } = new();
    }

    /// <summary>
    /// DTO za ponovljeno slanje verifikacionog emaila.
    /// </summary>
    public class ResendVerificationDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }
}
