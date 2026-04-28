namespace Mcp.Data.Entities;

internal sealed class TouristFavoriteEntity
{
    public uint Id { get; set; }
    public uint TouristId { get; set; }
    public uint? PostId { get; set; }
    public uint? RouteId { get; set; }
    public DateTime SavedAt { get; set; }

    public PostEntity? Post { get; set; }
    public RouteEntity? Route { get; set; }
}
