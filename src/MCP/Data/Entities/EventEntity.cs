namespace Mcp.Data.Entities;

internal sealed class EventEntity
{
    public int EventId { get; set; }
    public int? DestinationId { get; set; }
    public int? ObjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public string? TicketUrl { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public decimal? AvgRating { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
