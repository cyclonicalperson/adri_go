using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("external_click")]
    public class ExternalClick
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        /// <summary>NULL ako je anonimni korisnik (ON DELETE SET NULL)</summary>
        [Column("tourist_id")]
        public uint? TouristId { get; set; }

        [Column("post_id")]
        public uint PostId { get; set; }

        [Column("url")]
        [MaxLength(500)]
        public string? Url { get; set; }

        [Column("clicked_at")]
        public DateTime ClickedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Tourist? Tourist { get; set; }
        public Post Post { get; set; } = null!;
    }
}
