using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("ticket")]
    public class Ticket
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        /// <summary>Event post za koji je karta</summary>
        [Column("post_id")]
        public uint PostId { get; set; }

        /// <summary>NULL ako je turist obrisan (ON DELETE SET NULL)</summary>
        [Column("tourist_id")]
        public uint? TouristId { get; set; }

        [Required]
        [Column("ticket_code")]
        [MaxLength(50)]
        public string TicketCode { get; set; } = string.Empty;

        /// <summary>URL ili base64 QR kod slike</summary>
        [Column("qr_code")]
        [MaxLength(500)]
        public string? QrCode { get; set; }

        [Column("price_paid")]
        public decimal PricePaid { get; set; } = 0.00m;

        /// <summary>issued | used | cancelled | refunded</summary>
        [Column("status")]
        public string Status { get; set; } = "issued";

        [Column("issued_at")]
        public DateTime IssuedAt { get; set; } = DateTime.UtcNow;

        [Column("used_at")]
        public DateTime? UsedAt { get; set; }

        // Navigation
        public Post Post { get; set; } = null!;
        public Tourist? Tourist { get; set; }
    }
}
