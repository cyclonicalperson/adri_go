namespace Mcp.Infrastructure;

internal sealed class McpCorsOptions
{
    public const string SectionName = "Cors";
    public const string PolicyName = "McpCorsPolicy";
    public string[] AllowedOrigins { get; set; } = [];
}