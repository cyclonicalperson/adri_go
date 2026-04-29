namespace Mcp.Data.Entities;

internal sealed class TouristEntity
{
    public uint Id { get; set; }
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string Language { get; set; } = "en";
    public string? Interests { get; set; }
    public bool IsActive { get; set; }
    public bool IsEmailVerified { get; set; }
    public DateTime CreatedAt { get; set; }
}