namespace Mcp.Data.Entities;

internal sealed class RegionEntity
{
    public uint Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Country { get; set; } = "Montenegro";
    public decimal? Lat { get; set; }
    public decimal? Lng { get; set; }
    public bool IsActive { get; set; }
}