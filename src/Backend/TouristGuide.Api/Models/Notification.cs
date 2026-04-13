using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    /// <summary>
    /// Notifikacije za turiste (mobilna aplikacija).
    /// Za admin notifikacije koristiti AdminNotification model.
    /// </summary>
    [Table("notification")]
    public class Notification
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Column("tourist_id")]
        public uint TouristId { get; set; }

        /// <summary>new_event | reminder | promo | system...</summary>
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

        /// <summary>JSON: post_id, route_id, url...</summary>
        [Column("payload")]
        public string? Payload { get; set; }

        [Column("is_read")]
        public bool IsRead { get; set; } = false;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("sent_at")]
        public DateTime? SentAt { get; set; }

        // Navigation
        public Tourist Tourist { get; set; } = null!;
    }
}
