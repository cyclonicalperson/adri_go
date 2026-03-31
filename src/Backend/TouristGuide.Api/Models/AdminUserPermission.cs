using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("admin_user_permission")]
    public class AdminUserPermission
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Column("admin_user_id")]
        public uint AdminUserId { get; set; }

        [Column("permission_id")]
        public uint PermissionId { get; set; }

        [Column("granted_by")]
        public uint GrantedBy { get; set; }

        [Column("granted_at")]
        public DateTime GrantedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public AdminUser AdminUser { get; set; } = null!;
        public AdminPermission Permission { get; set; } = null!;
    }
}