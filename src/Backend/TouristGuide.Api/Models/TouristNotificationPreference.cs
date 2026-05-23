using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("tourist_notification_preference")]
    public class TouristNotificationPreference
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Column("tourist_id")]
        public uint TouristId { get; set; }

        [Required]
        [Column("notification_type")]
        [MaxLength(50)]
        public string NotificationType { get; set; } = string.Empty;

        [Column("in_app_enabled")]
        public bool InAppEnabled { get; set; } = true;

        [Column("push_enabled")]
        public bool PushEnabled { get; set; } = true;

        [Column("email_enabled")]
        public bool EmailEnabled { get; set; } = false;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Tourist Tourist { get; set; } = null!;
    }
}
