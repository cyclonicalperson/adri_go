namespace Mcp.Data.Entities;

internal sealed class ExternalClickEntity
{
    public uint Id { get; set; }
    public uint? TouristId { get; set; }
    public uint PostId { get; set; }
    public string? Url { get; set; }
    public DateTime ClickedAt { get; set; }

    public PostEntity? Post { get; set; }
}

internal sealed class DirectionRequestEntity
{
    public uint Id { get; set; }
    public uint? TouristId { get; set; }
    public uint PostId { get; set; }
    public decimal? FromLat { get; set; }
    public decimal? FromLng { get; set; }
    public DateTime RequestedAt { get; set; }

    public PostEntity? Post { get; set; }
}
