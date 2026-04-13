using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("admin_audit_log")]
    public class AdminAuditLog
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        /// <summary>Ko je izvršio akciju (ON DELETE SET NULL)</summary>
        [Column("admin_user_id")]
        public uint? AdminUserId { get; set; }

        /// <summary>Superadmin koji je pokrenuo akciju, ako je drugačiji od izvršioca</summary>
        [Column("performed_by")]
        public uint? PerformedBy { get; set; }

        /// <summary>create | update | delete | approve | reject...</summary>
        [Required]
        [Column("action")]
        [MaxLength(100)]
        public string Action { get; set; } = string.Empty;

        /// <summary>post | route | admin_user | event...</summary>
        [Required]
        [Column("entity_type")]
        [MaxLength(100)]
        public string EntityType { get; set; } = string.Empty;

        [Column("entity_id")]
        public uint? EntityId { get; set; }

        /// <summary>JSON: staro stanje entiteta</summary>
        [Column("old_value")]
        public string? OldValue { get; set; }

        /// <summary>JSON: novo stanje entiteta</summary>
        [Column("new_value")]
        public string? NewValue { get; set; }

        [Column("performed_at")]
        public DateTime PerformedAt { get; set; } = DateTime.UtcNow;

        [Column("ip_address")]
        [MaxLength(45)]
        public string? IpAddress { get; set; }

        // Navigation
        public AdminUser? AdminUser { get; set; }
        public AdminUser? PerformedByAdmin { get; set; }
    }
}
