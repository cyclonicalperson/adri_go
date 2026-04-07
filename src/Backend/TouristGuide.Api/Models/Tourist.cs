using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("tourist")]
    public class Tourist
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Column("name")]
        [MaxLength(200)]
        public string? Name { get; set; }

        [Column("email")]
        [MaxLength(255)]
        public string? Email { get; set; }

        [Column("password_hash")]
        [MaxLength(255)]
        public string? PasswordHash { get; set; }

        [Required]
        [Column("language")]
        [MaxLength(5)]
        public string Language { get; set; } = "en";

        [Column("interests")]
        public string? Interests { get; set; } // JSON string

        [Column("home_lat")]
        public decimal? HomeLat { get; set; }

        [Column("home_lng")]
        public decimal? HomeLng { get; set; }

        [Column("profile_image")]
        [MaxLength(500)]
        public string? ProfileImage { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<PostReview> Reviews { get; set; } = new List<PostReview>();
        public ICollection<PostLike> Likes { get; set; } = new List<PostLike>();
        public ICollection<SavedPost> SavedPosts { get; set; } = new List<SavedPost>();
        public ICollection<PostView> Views { get; set; } = new List<PostView>();
    }
}
