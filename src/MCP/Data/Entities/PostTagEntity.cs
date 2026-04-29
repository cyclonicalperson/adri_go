namespace Mcp.Data.Entities;

internal sealed class PostTagEntity
{
    public uint PostId { get; set; }
    public uint TagId { get; set; }
    public TagEntity Tag { get; set; } = null!;
}