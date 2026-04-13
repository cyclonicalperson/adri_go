using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("mailing_list")]
    public class MailingList
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        /// <summary>NULL ako pretplatnik nema nalog (ON DELETE SET NULL)</summary>
        [Column("tourist_id")]
        public uint? TouristId { get; set; }

        [Required]
        [Column("email")]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;

        /// <summary>JSON: {"events": true, "offers": true, "news": false}</summary>
        [Column("preferences")]
        public string? Preferences { get; set; }

        [Column("is_subscribed")]
        public bool IsSubscribed { get; set; } = true;

        [Column("subscribed_at")]
        public DateTime SubscribedAt { get; set; } = DateTime.UtcNow;

        [Column("unsubscribed_at")]
        public DateTime? UnsubscribedAt { get; set; }

        // Navigation
        public Tourist? Tourist { get; set; }
    }
}
