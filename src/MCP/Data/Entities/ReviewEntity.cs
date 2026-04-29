namespace Mcp.Data.Entities;

internal sealed class ReviewEntity
{
    public uint Id { get; set; }
    public uint PostId { get; set; }
    public uint? RouteId { get; set; }
    public uint TouristId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public bool IsApproved { get; set; }
    public DateTime CreatedAt { get; set; }

    public TouristEntity? Tourist { get; set; }
}