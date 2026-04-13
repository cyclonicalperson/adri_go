using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("route")]
    public class Route
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Column("admin_id")]
        public uint AdminId { get; set; }

        [Column("region_id")]
        public uint? RegionId { get; set; }

        [Required]
        [Column("name")]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        /// <summary>easy | moderate | hard | expert</summary>
        [Required]
        [Column("difficulty")]
        public string Difficulty { get; set; } = "moderate";

        [Column("distance_km")]
        public decimal? DistanceKm { get; set; }

        /// <summary>Procijenjeno trajanje u minutima</summary>
        [Column("duration_min")]
        public uint? DurationMin { get; set; }

        /// <summary>Visinska razlika u metrima</summary>
        [Column("elevation_gain")]
        public uint? ElevationGain { get; set; }

        [Column("description")]
        public string? Description { get; set; }

        /// <summary>JSON: [{lat, lng, name}, ...]</summary>
        [Column("waypoints")]
        public string? Waypoints { get; set; }

        [Column("gpx_file_path")]
        [MaxLength(500)]
        public string? GpxFilePath { get; set; }

        /// <summary>JSON: niz URL-ova slika</summary>
        [Column("images")]
        public string? Images { get; set; }

        /// <summary>draft | published | archived</summary>
        [Column("status")]
        public string Status { get; set; } = "draft";

        [Column("view_count")]
        public uint ViewCount { get; set; } = 0;

        [Column("save_count")]
        public uint SaveCount { get; set; } = 0;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public AdminUser Admin { get; set; } = null!;
        public Region? Region { get; set; }
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        public ICollection<TouristFavorite> Favorites { get; set; } = new List<TouristFavorite>();
        public ICollection<ContentShare> Shares { get; set; } = new List<ContentShare>();
        public ICollection<PlannerItem> PlannerItems { get; set; } = new List<PlannerItem>();
    }
}
