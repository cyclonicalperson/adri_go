using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("admin_secret")]
    public class AdminSecret
    {
        [Key]
        [Column("key")]
        [MaxLength(100)]
        public string Key { get; set; } = string.Empty;

        [Required]
        [Column("protected_value")]
        public string ProtectedValue { get; set; } = string.Empty;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_by")]
        public uint? UpdatedBy { get; set; }

        public AdminUser? UpdatedByAdmin { get; set; }
    }
}
