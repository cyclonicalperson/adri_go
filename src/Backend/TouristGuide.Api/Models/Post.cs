using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("post")]
    public class Post
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Column("admin_id")]
        public uint AdminId { get; set; }

        [Column("region_id")]
        public uint? RegionId { get; set; }

        [Required]
        [Column("title")]
        [MaxLength(300)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// accommodation | restaurant | club | cultural_site | monument |
        /// sports_facility | event | attraction | shop | other
        /// </summary>
        [Required]
        [Column("post_type")]
        public string PostType { get; set; } = string.Empty;

        [Column("description")]
        public string? Description { get; set; }

        [Column("lat")]
        public decimal? Lat { get; set; }

        [Column("lng")]
        public decimal? Lng { get; set; }

        [Column("address")]
        [MaxLength(300)]
        public string? Address { get; set; }

        /// <summary>Link na Booking, Airbnb, sajt organizatora...</summary>
        [Column("external_url")]
        [MaxLength(500)]
        public string? ExternalUrl { get; set; }

        /// <summary>Tekst na dugmetu: Rezerviši, Više info...</summary>
        [Column("external_url_label")]
        [MaxLength(100)]
        public string? ExternalUrlLabel { get; set; }

        /// <summary>JSON: niz URL-ova slika</summary>
        [Column("images")]
        public string? Images { get; set; }

        /// <summary>JSON: {"mon":"08:00-20:00","tue":"08:00-20:00",...}</summary>
        [Column("opening_hours")]
        public string? OpeningHours { get; set; }

        /// <summary>JSON: specifični atributi po tipu (cijena, kapacitet, težina...)</summary>
        [Column("details")]
        public string? Details { get; set; }

        /// <summary>draft | published | archived</summary>
        [Column("status")]
        public string Status { get; set; } = "draft";

        [Column("view_count")]
        public uint ViewCount { get; set; } = 0;

        [Column("like_count")]
        public uint LikeCount { get; set; } = 0;

        [Column("save_count")]
        public uint SaveCount { get; set; } = 0;

        [Column("review_count")]
        public uint ReviewCount { get; set; } = 0;

        [Column("avg_rating")]
        public decimal? AvgRating { get; set; }

        [Column("published_at")]
        public DateTime? PublishedAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public AdminUser Admin { get; set; } = null!;
        public Region? Region { get; set; }
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        public ICollection<PostLike> Likes { get; set; } = new List<PostLike>();
        public ICollection<SavedPost> SavedPosts { get; set; } = new List<SavedPost>();
        public ICollection<PostView> Views { get; set; } = new List<PostView>();
        public ICollection<PostTag> PostTags { get; set; } = new List<PostTag>();
        public ICollection<PostTranslation> Translations { get; set; } = new List<PostTranslation>();
        public ICollection<ExternalClick> ExternalClicks { get; set; } = new List<ExternalClick>();
        public ICollection<DirectionRequest> DirectionRequests { get; set; } = new List<DirectionRequest>();
        public ICollection<ContentShare> Shares { get; set; } = new List<ContentShare>();
        public ICollection<TouristFavorite> Favorites { get; set; } = new List<TouristFavorite>();
        public ICollection<PlannerItem> PlannerItems { get; set; } = new List<PlannerItem>();
    }
}
