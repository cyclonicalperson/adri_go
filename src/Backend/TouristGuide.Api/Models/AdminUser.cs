using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("admin_user")]
    public class AdminUser
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Column("organization_id")]
        public uint? OrganizationId { get; set; }

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

        /// <summary>superadmin | admin</summary>
        [Required]
        [Column("role")]
        public string Role { get; set; } = "admin";

        /// <summary>1 = fizičko lice, 0 = organizacija</summary>
        [Column("is_individual")]
        public bool IsIndividual { get; set; } = true;

        /// <summary>active | suspended | pending</summary>
        [Column("account_status")]
        public string AccountStatus { get; set; } = "pending";

        [Column("profile_image")]
        [MaxLength(500)]
        public string? ProfileImage { get; set; }

        [Column("last_login_at")]
        public DateTime? LastLoginAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Organization? Organization { get; set; }
        public ICollection<AdminUserPermission> UserPermissions { get; set; } = new List<AdminUserPermission>();
        public ICollection<Post> Posts { get; set; } = new List<Post>();
        public ICollection<Route> Routes { get; set; } = new List<Route>();
        public ICollection<AdminNotification> Notifications { get; set; } = new List<AdminNotification>();
    }
}
