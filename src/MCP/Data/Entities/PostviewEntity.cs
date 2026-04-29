namespace Mcp.Data.Entities;

internal sealed class PostViewEntity
{
    public uint Id { get; set; }
    public uint PostId { get; set; }
    public uint? TouristId { get; set; }
    public DateTime ViewedAt { get; set; }
    public uint? DurationSec { get; set; }
}