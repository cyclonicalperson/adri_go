namespace Mcp.Data.Entities;

internal sealed class RouteEntity
{
    public uint Id { get; set; }
    public uint? RegionId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public decimal? DistanceKm { get; set; }
    public uint? DurationMin { get; set; }
    public uint? ElevationGain { get; set; }
    public string? Description { get; set; }
    public string? Waypoints { get; set; }
    public string? GpxFilePath { get; set; }
    public string? Images { get; set; }
    public string Status { get; set; } = "draft";
    public uint ViewCount { get; set; }
    public uint SaveCount { get; set; }
    public DateTime CreatedAt { get; set; }
}