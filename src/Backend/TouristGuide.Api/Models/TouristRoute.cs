using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    /// <summary>Ruta koju je sam turist sastavio (privatna), za razliku od kuriranih Route.</summary>
    [Table("tourist_route")]
    public class TouristRoute
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Column("tourist_id")]
        public uint TouristId { get; set; }

        [Required]
        [Column("title")]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        /// <summary>JSON: [{id, lat, lng, name}, ...]</summary>
        [Column("waypoints")]
        public string? Waypoints { get; set; }

        /// <summary>Cover image — first image of the route's first stop, captured at save time.</summary>
        [Column("image_url")]
        [MaxLength(500)]
        public string? ImageUrl { get; set; }

        /// <summary>driving | walking | cycling</summary>
        [Column("travel_mode")]
        [MaxLength(20)]
        public string TravelMode { get; set; } = "driving";

        [Column("scenic_mode")]
        public bool ScenicMode { get; set; }

        [Column("distance_km")]
        public decimal? DistanceKm { get; set; }

        [Column("duration_min")]
        public uint? DurationMin { get; set; }

        [Column("source_route_id")]
        public uint? SourceRouteId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Tourist Tourist { get; set; } = null!;
        public Route? SourceRoute { get; set; }
        public ICollection<PlannerItem> PlannerItems { get; set; } = new List<PlannerItem>();
    }
}
