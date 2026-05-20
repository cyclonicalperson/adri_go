namespace Mcp.Services;

internal sealed class CurrentTouristContext : ICurrentTouristContext
{
    public CurrentTouristContext(IHttpContextAccessor httpContextAccessor)
    {
        var authHeader = httpContextAccessor.HttpContext?
            .Request
            .Headers
            .Authorization
            .FirstOrDefault();

        if (authHeader?.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) == true)
            BearerToken = authHeader["Bearer ".Length..].Trim();
    }

    public string? BearerToken { get; }
}
