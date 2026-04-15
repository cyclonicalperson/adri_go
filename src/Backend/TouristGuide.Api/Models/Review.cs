using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    /// <summary>
    /// Recenzija turista za objavu (post) ili rutu (route).
    /// Zamjenjuje stari PostReview model — dodano route_id i status polje (v2).
    /// </summary>
    [Table("review")]
    public class Review
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        /// <summary>NULL ako je turist obrisao nalog (ON DELETE SET NULL)</summary>
        [Column("tourist_id")]
        public uint? TouristId { get; set; }

        /// <summary>NULL ako je recenzija za rutu</summary>
        [Column("post_id")]
        public uint? PostId { get; set; }

        /// <summary>NULL ako je recenzija za objavu</summary>
        [Column("route_id")]
        public uint? RouteId { get; set; }

        /// <summary>Ocjena 1–5</summary>
        [Column("rating")]
        public byte Rating { get; set; }

        [Column("comment")]
        public string? Comment { get; set; }

        /// <summary>PENDING | APPROVED | REJECTED — primarna kolona za moderaciju</summary>
        [Column("status")]
        public string Status { get; set; } = "PENDING";

        /// <summary>Legacy kolona — koristiti Status za moderaciju</summary>
        [Column("is_approved")]
        public bool IsApproved { get; set; } = false;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Tourist? Tourist { get; set; }
        public Post? Post { get; set; }
        public Route? Route { get; set; }
    }
}
