using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    /// <summary>
    /// Notifikacije za admin korisnike (topbar zvono u admin panelu).
    /// Odvojena od tourist.notification tabele.
    /// </summary>
    [Table("admin_notification")]
    public class AdminNotification
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Column("admin_user_id")]
        public uint AdminUserId { get; set; }

        /// <summary>pending_review | new_registration | post_approved | post_rejected | system</summary>
        [Required]
        [Column("type")]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty;

        [Required]
        [Column("title")]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Column("body")]
        public string? Body { get; set; }

        /// <summary>JSON: post_id, route_id, registration_id, url...</summary>
        [Column("payload")]
        public string? Payload { get; set; }

        [Column("is_read")]
        public bool IsRead { get; set; } = false;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("sent_at")]
        public DateTime? SentAt { get; set; }

        // Navigation
        public AdminUser AdminUser { get; set; } = null!;
    }
}
