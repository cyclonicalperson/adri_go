using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("admin_permission")]
    public class AdminPermission
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Required]
        [Column("code")]
        [MaxLength(100)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [Column("label")]
        [MaxLength(200)]
        public string Label { get; set; } = string.Empty;

        [Required]
        [Column("category")]
        [MaxLength(100)]
        public string Category { get; set; } = string.Empty;

        [Column("description")]
        [MaxLength(500)]
        public string? Description { get; set; }

        // Navigation
        public ICollection<AdminUserPermission> UserPermissions { get; set; } = new List<AdminUserPermission>();
    }
}