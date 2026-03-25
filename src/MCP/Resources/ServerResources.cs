using ModelContextProtocol.Server;
using System.ComponentModel;

namespace Mcp.Resources;

[McpServerResourceType]
internal static class ServerResources
{
    [McpServerResource(
        UriTemplate = "server://info",
        Name = "server_info",
        Title = "Server Info",
        MimeType = "text/plain")]
    [Description("Basic information about this MCP server.")]
    public static string GetServerInfo()
    {
        return """
            Tourism MCP server
            Transport: HTTP
            Endpoint: /mcp
            Exposes structured destination, route, event, and accommodation search methods backed by the tourism database.
            """;
    }
}
