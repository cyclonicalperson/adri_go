using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("admin_registration_request")]
    public class AdminRegistrationRequest
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Required]
        [Column("full_name")]
        [MaxLength(200)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [Column("email")]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [Column("password_hash")]
        [MaxLength(255)]
        public string PasswordHash { get; set; } = string.Empty;

        /// <summary>Token poslan na email za verifikaciju</summary>
        [Column("email_verification_token")]
        [MaxLength(100)]
        public string? EmailVerificationToken { get; set; }

        /// <summary>Kada je email verifikovan</summary>
        [Column("email_verified_at")]
        public DateTime? EmailVerifiedAt { get; set; }

        [Column("is_organization")]
        public bool IsOrganization { get; set; } = false;

        /// <summary>1 = fizičko lice, 0 = organizacija (inverse of is_organization)</summary>
        [Column("is_individual")]
        public bool IsIndividual { get; set; } = true;

        [Column("organization_name")]
        [MaxLength(200)]
        public string? OrganizationName { get; set; }

        [Column("organization_email")]
        [MaxLength(255)]
        public string? OrganizationEmail { get; set; }

        /// <summary>pending | approved | rejected</summary>
        [Column("status")]
        public string Status { get; set; } = "pending";

        [Column("rejection_reason")]
        public string? RejectionReason { get; set; }

        [Column("submitted_at")]
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

        [Column("reviewed_at")]
        public DateTime? ReviewedAt { get; set; }

        /// <summary>superadmin koji je pregledao zahtjev</summary>
        [Column("reviewed_by")]
        public uint? ReviewedBy { get; set; }

        // Navigation
        public AdminUser? ReviewedByAdmin { get; set; }
        public ICollection<VerificationDocument> VerificationDocuments { get; set; } = new List<VerificationDocument>();
        public ICollection<TermsAcceptance> TermsAcceptances { get; set; } = new List<TermsAcceptance>();
    }
}
