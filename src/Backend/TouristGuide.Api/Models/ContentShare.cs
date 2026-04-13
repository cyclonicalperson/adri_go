using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("content_share")]
    public class ContentShare
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        /// <summary>NULL ako je anonimni korisnik (ON DELETE SET NULL)</summary>
        [Column("tourist_id")]
        public uint? TouristId { get; set; }

        /// <summary>NULL ako je dijeljeno ruta, a ne objava</summary>
        [Column("post_id")]
        public uint? PostId { get; set; }

        /// <summary>NULL ako je dijeljeno objava, a ne ruta</summary>
        [Column("route_id")]
        public uint? RouteId { get; set; }

        /// <summary>whatsapp | instagram | facebook | copy_link...</summary>
        [Column("platform")]
        [MaxLength(50)]
        public string? Platform { get; set; }

        [Column("shared_at")]
        public DateTime SharedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Tourist? Tourist { get; set; }
        public Post? Post { get; set; }
        public Route? Route { get; set; }
    }
}
