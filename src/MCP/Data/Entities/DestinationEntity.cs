namespace Mcp.Data.Entities;

internal sealed class DestinationEntity
{
    public int DestinationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Region { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
