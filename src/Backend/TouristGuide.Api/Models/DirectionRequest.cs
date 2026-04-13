using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("direction_request")]
    public class DirectionRequest
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        /// <summary>NULL ako je anonimni korisnik (ON DELETE SET NULL)</summary>
        [Column("tourist_id")]
        public uint? TouristId { get; set; }

        [Column("post_id")]
        public uint PostId { get; set; }

        /// <summary>Geografska širina polazišta turiste</summary>
        [Column("from_lat")]
        public decimal? FromLat { get; set; }

        /// <summary>Geografska dužina polazišta turiste</summary>
        [Column("from_lng")]
        public decimal? FromLng { get; set; }

        [Column("requested_at")]
        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Tourist? Tourist { get; set; }
        public Post Post { get; set; } = null!;
    }
}
