using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("region")]
    public class Region
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Required]
        [Column("name")]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        /// <summary>city | mountain | lake | national_park | coast | village | other</summary>
        [Required]
        [Column("type")]
        public string Type { get; set; } = string.Empty;

        [Column("description")]
        public string? Description { get; set; }

        [Required]
        [Column("country")]
        [MaxLength(100)]
        public string Country { get; set; } = "Montenegro";

        [Column("lat")]
        public decimal? Lat { get; set; }

        [Column("lng")]
        public decimal? Lng { get; set; }

        [Column("cover_image")]
        [MaxLength(500)]
        public string? CoverImage { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<Post> Posts { get; set; } = new List<Post>();
        public ICollection<Route> Routes { get; set; } = new List<Route>();
        public ICollection<AdminUserPermission> ScopedPermissions { get; set; } = new List<AdminUserPermission>();
    }
}
