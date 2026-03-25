namespace Mcp.Data.Entities;

internal sealed class RouteEntity
{
    public int RouteId { get; set; }
    public int DestinationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string RouteType { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public decimal DistanceKm { get; set; }
    public int DurationMin { get; set; }
    public int ElevationGainM { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal StartLatitude { get; set; }
    public decimal StartLongitude { get; set; }
    public decimal EndLatitude { get; set; }
    public decimal EndLongitude { get; set; }
    public string? Geometry { get; set; }
    public decimal? AvgRating { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
