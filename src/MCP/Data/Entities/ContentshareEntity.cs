namespace Mcp.Data.Entities;

internal sealed class ContentShareEntity
{
    public uint Id { get; set; }
    public uint? TouristId { get; set; }
    public uint? PostId { get; set; }
    public uint? RouteId { get; set; }
    public string? Platform { get; set; }
    public DateTime SharedAt { get; set; }
}