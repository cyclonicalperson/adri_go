namespace Mcp.Data.Entities;

internal sealed class SavedPostEntity
{
    public uint Id { get; set; }
    public uint TouristId { get; set; }
    public uint PostId { get; set; }
    public DateTime CreatedAt { get; set; }

    public PostEntity? Post { get; set; }
}
