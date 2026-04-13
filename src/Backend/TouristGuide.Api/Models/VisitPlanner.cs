using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("visit_planner")]
    public class VisitPlanner
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Column("tourist_id")]
        public uint TouristId { get; set; }

        [Required]
        [Column("title")]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Column("start_date")]
        public DateOnly? StartDate { get; set; }

        [Column("end_date")]
        public DateOnly? EndDate { get; set; }

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("is_public")]
        public bool IsPublic { get; set; } = false;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Tourist Tourist { get; set; } = null!;
        public ICollection<PlannerItem> Items { get; set; } = new List<PlannerItem>();
    }
}
