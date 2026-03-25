namespace Mcp.Data.Entities;

internal sealed class ObjectEntity
{
    public int ObjectId { get; set; }
    public int DestinationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Address { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public string? WorkingHours { get; set; }
    public decimal? AvgRating { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
