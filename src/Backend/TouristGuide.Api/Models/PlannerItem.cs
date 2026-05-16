using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TouristGuide.Api.Models
{
    [Table("planner_item")]
    public class PlannerItem
    {
        [Key]
        [Column("id")]
        public uint Id { get; set; }

        [Column("planner_id")]
        public uint PlannerId { get; set; }

        /// <summary>NULL ako je stavka ruta</summary>
        [Column("post_id")]
        public uint? PostId { get; set; }

        /// <summary>NULL ako je stavka objava</summary>
        [Column("route_id")]
        public uint? RouteId { get; set; }

        /// <summary>NULL osim ako je stavka privatna (turistom sastavljena) ruta</summary>
        [Column("tourist_route_id")]
        public uint? TouristRouteId { get; set; }

        [Column("day_number")]
        public byte DayNumber { get; set; } = 1;

        [Column("order_in_day")]
        public byte OrderInDay { get; set; } = 1;

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("scheduled_time")]
        public TimeOnly? ScheduledTime { get; set; }

        // Navigation
        public VisitPlanner Planner { get; set; } = null!;
        public Post? Post { get; set; }
        public Route? Route { get; set; }
        public TouristRoute? TouristRoute { get; set; }
    }
}
