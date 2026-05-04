namespace Mcp.Data.Entities;

internal sealed class TagEntity
{
    public uint Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string? Color { get; set; }
    public string? Description { get; set; }
    public string? Duration { get; set; }
    public string? Difficulty { get; set; }
    public short? MaxCapacity { get; set; }

    public ICollection<PostTagEntity> PostTags { get; set; } = new List<PostTagEntity>();
}