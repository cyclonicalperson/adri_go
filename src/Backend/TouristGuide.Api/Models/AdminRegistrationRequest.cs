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

        [Column("is_organization")]
        public bool IsOrganization { get; set; } = false;

        [Column("organization_name")]
        [MaxLength(200)]
        public string? OrganizationName { get; set; }

        [Column("organization_email")]
        [MaxLength(255)]
        public string? OrganizationEmail { get; set; }

        [Column("status")]
        public string Status { get; set; } = "pending"; // 'pending' | 'approved' | 'rejected'

        [Column("rejection_reason")]
        public string? RejectionReason { get; set; }

        [Column("submitted_at")]
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

        [Column("reviewed_at")]
        public DateTime? ReviewedAt { get; set; }

        [Column("reviewed_by")]
        public uint? ReviewedBy { get; set; }

        // Navigation
        public AdminUser? ReviewedByAdmin { get; set; }
    }
}