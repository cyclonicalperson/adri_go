using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Mcp.Services;

/// <summary>
/// Čita tourist_id iz JWT Bearer tokena u Authorization headeru.
/// Token je potpisan istim secretom kao i Backend — MCP samo verifikuje i čita, ne generiše.
///
/// Tok:
///   Frontend → šalje "Authorization: Bearer {token}" uz MCP poziv
///   JwtMiddleware (u Program.cs) → verifikuje potpis i popunjava HttpContext.User
///   CurrentTouristContext → čita "sub" claim iz HttpContext.User
/// </summary>
internal sealed class CurrentTouristContext : ICurrentTouristContext
{
    private readonly uint? _touristId;

    public CurrentTouristContext(IHttpContextAccessor httpContextAccessor)
    {
        var user = httpContextAccessor.HttpContext?.User;

        if (user?.Identity?.IsAuthenticated != true)
        {
            _touristId = null;
            return;
        }

        // Backend upisuje userId u "sub" claim (JwtRegisteredClaimNames.Sub)
        var sub = user.FindFirstValue(JwtRegisteredClaimNames.Sub)
               ?? user.FindFirstValue(ClaimTypes.NameIdentifier);

        if (uint.TryParse(sub, out var id))
            _touristId = id;
    }

    public uint? TouristId => _touristId;
    public bool IsAuthenticated => _touristId.HasValue;
}
