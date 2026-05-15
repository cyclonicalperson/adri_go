using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("tourist_location_sample")]
    public class TouristLocationSample
    {
        [Key]
        [Column("id")]
        public long Id { get; set; }

        [Column("tourist_id")]
        public uint? TouristId { get; set; }

        [Required]
        [Column("session_id")]
        [MaxLength(64)]
        public string SessionId { get; set; } = string.Empty;

        [Column("region_id")]
        public uint? RegionId { get; set; }

        [Column("lat")]
        public decimal Lat { get; set; }

        [Column("lng")]
        public decimal Lng { get; set; }

        [Column("recorded_at")]
        public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

        public Tourist? Tourist { get; set; }
        public Region? Region { get; set; }
    }
}
