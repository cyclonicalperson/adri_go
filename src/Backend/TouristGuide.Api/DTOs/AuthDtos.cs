using System.ComponentModel.DataAnnotations;
using System.Text.Json;

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

        public List<string>? Interests { get; set; }
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
    /// Puni profil prijavljenog turiste (koristi se i za /me i za /profile).
    /// </summary>
    public class TouristMeDto
    {
        public uint Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Language { get; set; } = string.Empty;
        public string? Bio { get; set; }
        public string? Location { get; set; }
        public string? ProfileImage { get; set; }
        public List<string> Interests { get; set; } = new();
        public bool IsActive { get; set; }
        public bool IsEmailVerified { get; set; }
        public DateTime CreatedAt { get; set; }
        public int SavedPostsCount { get; set; }
        public int ReviewsCount { get; set; }
    }

    /// <summary>
    /// DTO koji frontend šalje pri ažuriranju profila turiste.
    /// </summary>
    public class UpdateTouristProfileDto
    {
        [MaxLength(200)]
        public string? Name { get; set; }

        [MaxLength(5)]
        public string? Language { get; set; }

        public string? Bio { get; set; }

        [MaxLength(200)]
        public string? Location { get; set; }

        /// <summary>Lista interesa kao string array (npr. ["nature","food"])</summary>
        public List<string>? Interests { get; set; }
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

public class TouristRegistrationResponseDto
{
    public bool RequiresEmailVerification { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public TouristAuthResponseDto? Session { get; set; }
}

public class EmailVerificationResultDto
{
    public string Message { get; set; } = string.Empty;
    public bool AlreadyVerified { get; set; }
    public bool Expired { get; set; }
    public DateTime? VerifiedAt { get; set; }
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

    /// <summary>
    /// DTO za promenu lozinke turiste.
    /// </summary>
    public class ChangePasswordDto
    {
        [Required]
        [MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO za iniciranje resetovanja lozinke (unos emaila).
    /// </summary>
    public class ForgotPasswordDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO za resetovanje lozinke sa tokenom iz emaila.
    /// </summary>
    public class ResetPasswordDto
    {
        [Required]
        public string Token { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;
    }

    /// <summary>
    /// Payload for Google / Apple social sign-in.
    /// </summary>
    public class SocialLoginDto
    {
        /// <summary>"google" or "apple"</summary>
        [Required]
        public string Provider { get; set; } = string.Empty;

        /// <summary>The ID token (Google credential or Apple JWT).</summary>
        [Required]
        public string Credential { get; set; } = string.Empty;

        /// <summary>
        /// Optional display name supplied by the client (Apple only sends the name
        /// on the very first sign-in; the frontend should capture and forward it).
        /// </summary>
        public string? DisplayName { get; set; }
    }
}
