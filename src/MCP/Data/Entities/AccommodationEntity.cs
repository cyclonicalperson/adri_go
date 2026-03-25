namespace Mcp.Data.Entities;

internal sealed class AccommodationEntity
{
    public int Id { get; set; }
    public int DestinationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public double? Rating { get; set; }
    public string ApproximatePriceRange { get; set; } = string.Empty;
    public string AmenityCsv { get; set; } = string.Empty;
    public string ShortDescription { get; set; } = string.Empty;
}
