namespace Mcp.Data.Entities;

internal sealed class PostEntity
{
    public uint Id { get; set; }
    public uint? RegionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string PostType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal? Lat { get; set; }
    public decimal? Lng { get; set; }
    public string? Address { get; set; }
    public string? ExternalUrl { get; set; }
    public string? OpeningHours { get; set; }
    public string? Details { get; set; }
    public string Status { get; set; } = "draft";
    public decimal? AvgRating { get; set; }
    public uint ReviewCount { get; set; }
    public DateTime? PublishedAt { get; set; }
    public ICollection<PostTagEntity> PostTags { get; set; } = new List<PostTagEntity>();
}