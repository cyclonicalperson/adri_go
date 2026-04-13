using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("terms_acceptance")]
    public class TermsAcceptance
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        /// <summary>NULL ako prihvatanje nije vezano za aktivnog korisnika</summary>
        [Column("admin_user_id")]
        public uint? AdminUserId { get; set; }

        /// <summary>NULL ako prihvatanje nije vezano za zahtjev za registraciju</summary>
        [Column("registration_request_id")]
        public uint? RegistrationRequestId { get; set; }

        [Required]
        [Column("terms_version")]
        [MaxLength(20)]
        public string TermsVersion { get; set; } = string.Empty;

        [Column("accepted_at")]
        public DateTime AcceptedAt { get; set; } = DateTime.UtcNow;

        [Column("ip_address")]
        [MaxLength(45)]
        public string? IpAddress { get; set; }

        // Navigation
        public AdminUser? AdminUser { get; set; }
        public AdminRegistrationRequest? RegistrationRequest { get; set; }
    }
}
