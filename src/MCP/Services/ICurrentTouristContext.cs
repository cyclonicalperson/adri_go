namespace Mcp.Services;

/// <summary>
/// Holds request authentication material that MCP forwards to the Backend API.
/// MCP does not validate, decode, or authorize JWTs; the backend is authoritative.
/// </summary>
internal interface ICurrentTouristContext
{
    string? BearerToken { get; }
}
