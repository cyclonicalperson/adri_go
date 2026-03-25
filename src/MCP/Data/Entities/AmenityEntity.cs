namespace Mcp.Data.Entities;

internal sealed class AmenityEntity
{
    public int AmenityId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; }
}
