using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("post_like")]
    public class PostLike
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Column("post_id")]
        public uint PostId { get; set; }

        [Column("tourist_id")]
        public uint TouristId { get; set; }

        [Column("liked_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Post Post { get; set; } = null!;
        public Tourist Tourist { get; set; } = null!;
    }
}
