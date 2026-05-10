using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    /// <summary>
    /// Svaka jedinstvena sesija turista koji otvori aplikaciju bilježi se ovdje.
    /// Koristi se za widget "Posete platformi" na admin dashboardu.
    /// session_id + visit_date je unique — jedna sesija broji se jednom po danu.
    /// </summary>
    [Table("app_visit")]
    public class AppVisit
    {
        [Key]
        [Column("id")]
        public long Id { get; set; }

        /// <summary>UUID generisan na klijentskoj strani i čuvan u sessionStorage.</summary>
        [Required]
        [Column("session_id")]
        [MaxLength(64)]
        public string SessionId { get; set; } = null!;

        /// <summary>UTC datum (bez vremena) kada je sesija zabilježena.</summary>
        [Column("visit_date")]
        public DateTime VisitDate { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
