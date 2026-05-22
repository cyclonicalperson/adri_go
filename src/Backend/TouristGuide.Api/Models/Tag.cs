using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("tag")]
    public class Tag
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Required]
        [Column("name")]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        /// <summary>aktivnost | amenity | stil | cijena | tip | oznaka</summary>
        [Column("category")]
        [MaxLength(100)]
        public string? Category { get; set; }

        /// <summary>Format za aktivnosti: SUBCATEGORY|#hexcolor|status — za ostale: plain hex</summary>
        [Column("color")]
        [MaxLength(100)]
        public string? Color { get; set; }

        // ── Polja specifična za aktivnosti (category = "aktivnost") ──

        [Column("description")]
        [MaxLength(500)]
        public string? Description { get; set; }

        /// <summary>Trajanje npr. "2 sata", "pola dana"</summary>
        [Column("duration")]
        [MaxLength(50)]
        public string? Duration { get; set; }

        /// <summary>EASY | MEDIUM | HARD</summary>
        [Column("difficulty")]
        [MaxLength(10)]
        public string? Difficulty { get; set; }

        /// <summary>Maksimalan broj učesnika</summary>
        [Column("max_capacity")]
        public short? MaxCapacity { get; set; }

        [Column("activity_tags")]
        [MaxLength(500)]
        public string? ActivityTags { get; set; }

        // Navigation
        public ICollection<PostTag> PostTags { get; set; } = new List<PostTag>();
    }
}
