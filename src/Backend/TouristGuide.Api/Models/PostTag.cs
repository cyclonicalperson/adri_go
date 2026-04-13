using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    /// <summary>
    /// Veza many-to-many između Post i Tag tabela.
    /// PK je kompozitni (post_id, tag_id) — bez surrogate ključa.
    /// </summary>
    [Table("post_tag")]
    public class PostTag
    {
        [Column("post_id")]
        public uint PostId { get; set; }

        [Column("tag_id")]
        public uint TagId { get; set; }

        // Navigation
        public Post Post { get; set; } = null!;
        public Tag Tag { get; set; } = null!;
    }
}
