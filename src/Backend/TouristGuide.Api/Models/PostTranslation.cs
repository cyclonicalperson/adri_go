using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("post_translation")]
    public class PostTranslation
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Column("post_id")]
        public uint PostId { get; set; }

        /// <summary>Kod jezika: sr, en, de, fr, ru...</summary>
        [Required]
        [Column("lang_code")]
        [MaxLength(5)]
        public string LangCode { get; set; } = string.Empty;

        [Required]
        [Column("title")]
        [MaxLength(300)]
        public string Title { get; set; } = string.Empty;

        [Column("description")]
        public string? Description { get; set; }

        // Navigation
        public Post Post { get; set; } = null!;
    }
}
