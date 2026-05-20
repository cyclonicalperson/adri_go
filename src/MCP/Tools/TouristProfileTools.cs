using Mcp.Services;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace Mcp.Tools;

[McpServerToolType]
internal static class TouristProfileTools
{
    [McpServerTool(Name = "tourism_get_my_profile", Title = "Get My Profile", ReadOnly = true, Idempotent = true)]
    [Description(
        "Get the full profile of the currently logged-in tourist: name, language, interests, bio, " +
        "saved location count, review count, and behavioural preferences derived from their interaction history " +
        "(top post types, favourite tags, preferred regions). " +
        "Call this tool at the START of a personalised conversation to tailor recommendations and language. " +
        "Returns null if the tourist is not logged in. " +
        "NEVER ask the user for their ID or personal data — identity comes from the login token automatically.")]
    public static async Task<TouristProfileResult?> GetMyProfile(
        ITouristProfileService profileService,
        CancellationToken cancellationToken)
    {
        return await profileService.GetMyProfileAsync(cancellationToken);
    }
}