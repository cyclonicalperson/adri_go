namespace Mcp.Data.Entities;

internal sealed class PostLikeEntity
{
    public uint Id { get; set; }
    public uint PostId { get; set; }
    public uint TouristId { get; set; }
    public DateTime LikedAt { get; set; }
}