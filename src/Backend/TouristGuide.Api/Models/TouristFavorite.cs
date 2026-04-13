using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    /// <summary>
    /// Omiljene objave i rute turiste.
    /// Jedan zapis može imati post_id ili route_id (ne oba istovremeno).
    /// </summary>
    [Table("tourist_favorite")]
    public class TouristFavorite
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Column("tourist_id")]
        public uint TouristId { get; set; }

        /// <summary>NULL ako je omiljena stavka ruta</summary>
        [Column("post_id")]
        public uint? PostId { get; set; }

        /// <summary>NULL ako je omiljena stavka objava</summary>
        [Column("route_id")]
        public uint? RouteId { get; set; }

        [Column("saved_at")]
        public DateTime SavedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Tourist Tourist { get; set; } = null!;
        public Post? Post { get; set; }
        public Route? Route { get; set; }
    }
}
