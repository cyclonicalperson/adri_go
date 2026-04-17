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

        /// <summary>Hex boja za UI (#RRGGBB)</summary>
        [Column("color")]
        [MaxLength(7)]
        public string? Color { get; set; }

        /// <summary>URL slike (aktivnosti u admin UI)</summary>
        [Column("image_url")]
        [MaxLength(500)]
        public string? ImageUrl { get; set; }

        // Navigation
        public ICollection<PostTag> PostTags { get; set; } = new List<PostTag>();
    }
}
