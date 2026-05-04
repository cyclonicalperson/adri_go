namespace Mcp.Data.Entities;

internal sealed class VisitPlannerEntity
{
    public uint Id { get; set; }
    public uint TouristId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? Notes { get; set; }
    public bool IsPublic { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<PlannerItemEntity> Items { get; set; } = new List<PlannerItemEntity>();
}

internal sealed class PlannerItemEntity
{
    public uint Id { get; set; }
    public uint PlannerId { get; set; }
    public uint? PostId { get; set; }
    public uint? RouteId { get; set; }
    public byte DayNumber { get; set; }
    public byte OrderInDay { get; set; }
    public string? Notes { get; set; }
    public TimeOnly? ScheduledTime { get; set; }

    public PostEntity? Post { get; set; }
    public RouteEntity? Route { get; set; }
}
