using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("organization")]
    public class Organization
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Required]
        [Column("name")]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Column("type")]
        [MaxLength(100)]
        public string Type { get; set; } = string.Empty;

        [Required]
        [Column("contact_email")]
        [MaxLength(255)]
        public string ContactEmail { get; set; } = string.Empty;

        [Column("phone")]
        [MaxLength(50)]
        public string? Phone { get; set; }

        [Column("address")]
        [MaxLength(300)]
        public string? Address { get; set; }

        [Column("website")]
        [MaxLength(300)]
        public string? Website { get; set; }

        [Column("is_verified")]
        public bool IsVerified { get; set; } = false;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<AdminUser> AdminUsers { get; set; } = new List<AdminUser>();
    }
}