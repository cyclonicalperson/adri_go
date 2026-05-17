using Mcp.Dtos;
using Mcp.Services;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace Mcp.Tools;

[McpServerToolType]
internal static class TourismWriteTools
{
    // ════════════════════════════════════════════════════════════════════════
    // RECENZIJE
    // ════════════════════════════════════════════════════════════════════════

    [McpServerTool(Name = "tourism_submit_review", Title = "Submit Review", ReadOnly = false, Idempotent = false)]
    [Description(
        "Submit a review for a location. Rating must be 1–5. Comment is optional. " +
        "Requires the tourist to be logged in. The review will be pending moderation before it becomes visible. " +
        "Provide postId OR postName — never both. " +
        "If you only know the location name (e.g. 'Hotel Jezero'), provide postName.")]
    public static async Task<WriteResult> SubmitReview(
        ITourismWriteService writeService,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Numeric ID of the location to review (use if already known).")] uint? postId = null,
        [Description("Location name or partial name. Used when postId is not provided.")] string? postName = null,
        [Description("Rating from 1 (worst) to 5 (best).")] int rating = 0,
        [Description("Optional written comment to accompany the rating.")] string? comment = null)
    {
        var resolvedId = await ResolvePostId(postId, postName, tourismService, cancellationToken);
        if (resolvedId is null)
            return new WriteResult(false, BuildNotFoundMessage("lokaciju", postId, postName));

        return await writeService.SubmitReviewAsync(resolvedId.Value, rating, comment, cancellationToken);
    }

    // ════════════════════════════════════════════════════════════════════════
    // SAČUVANE LOKACIJE
    // ════════════════════════════════════════════════════════════════════════

    [McpServerTool(Name = "tourism_save_location", Title = "Save Location", ReadOnly = false, Idempotent = true)]
    [Description(
        "Save a location to the tourist's personal saved list. Requires the tourist to be logged in. " +
        "Provide postId OR postName — never both. " +
        "If you only know the location name (e.g. 'Hotel Durmitor'), provide postName.")]
    public static async Task<WriteResult> SaveLocation(
        ITourismWriteService writeService,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Numeric ID of the location to save (use if already known).")] uint? postId = null,
        [Description("Location name or partial name. Used when postId is not provided.")] string? postName = null)
    {
        var resolvedId = await ResolvePostId(postId, postName, tourismService, cancellationToken);
        if (resolvedId is null)
            return new WriteResult(false, BuildNotFoundMessage("lokaciju", postId, postName));

        return await writeService.SavePostAsync(resolvedId.Value, cancellationToken);
    }

    [McpServerTool(Name = "tourism_unsave_location", Title = "Unsave Location", ReadOnly = false, Idempotent = true)]
    [Description(
        "Remove a location from the tourist's saved list. Requires the tourist to be logged in. " +
        "Provide postId OR postName — never both. " +
        "If you only know the location name, provide postName.")]
    public static async Task<WriteResult> UnsaveLocation(
        ITourismWriteService writeService,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Numeric ID of the location to unsave (use if already known).")] uint? postId = null,
        [Description("Location name or partial name. Used when postId is not provided.")] string? postName = null)
    {
        var resolvedId = await ResolvePostId(postId, postName, tourismService, cancellationToken);
        if (resolvedId is null)
            return new WriteResult(false, BuildNotFoundMessage("lokaciju", postId, postName));

        return await writeService.UnsavePostAsync(resolvedId.Value, cancellationToken);
    }

    // ════════════════════════════════════════════════════════════════════════
    // LAJKOVI
    // ════════════════════════════════════════════════════════════════════════

    [McpServerTool(Name = "tourism_like_location", Title = "Like Location", ReadOnly = false, Idempotent = true)]
    [Description(
        "Like a location on behalf of the logged-in tourist. Requires the tourist to be logged in. " +
        "Provide postId OR postName — never both. " +
        "If you only know the location name, provide postName.")]
    public static async Task<WriteResult> LikeLocation(
        ITourismWriteService writeService,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Numeric ID of the location to like (use if already known).")] uint? postId = null,
        [Description("Location name or partial name. Used when postId is not provided.")] string? postName = null)
    {
        var resolvedId = await ResolvePostId(postId, postName, tourismService, cancellationToken);
        if (resolvedId is null)
            return new WriteResult(false, BuildNotFoundMessage("lokaciju", postId, postName));

        return await writeService.LikePostAsync(resolvedId.Value, cancellationToken);
    }

    [McpServerTool(Name = "tourism_unlike_location", Title = "Unlike Location", ReadOnly = false, Idempotent = true)]
    [Description(
        "Remove a like from a location on behalf of the logged-in tourist. Requires the tourist to be logged in. " +
        "Provide postId OR postName — never both. " +
        "If you only know the location name, provide postName.")]
    public static async Task<WriteResult> UnlikeLocation(
        ITourismWriteService writeService,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Numeric ID of the location to unlike (use if already known).")] uint? postId = null,
        [Description("Location name or partial name. Used when postId is not provided.")] string? postName = null)
    {
        var resolvedId = await ResolvePostId(postId, postName, tourismService, cancellationToken);
        if (resolvedId is null)
            return new WriteResult(false, BuildNotFoundMessage("lokaciju", postId, postName));

        return await writeService.UnlikePostAsync(resolvedId.Value, cancellationToken);
    }

    // ════════════════════════════════════════════════════════════════════════
    // PLANER PUTOVANJA
    // ════════════════════════════════════════════════════════════════════════

    [McpServerTool(Name = "tourism_add_to_planner", Title = "Add to Travel Planner", ReadOnly = false, Idempotent = true)]
    [Description(
        "Add a location to the tourist's travel calendar/planner. Requires the tourist to be logged in. " +
        "If the location is already in the planner, it will not be duplicated. " +
        "Provide postId OR postName — never both. " +
        "If you only know the location name (e.g. 'Crno jezero'), provide postName.")]
    public static async Task<WriteResult> AddToPlanner(
        ITourismWriteService writeService,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Numeric ID of the location to add to the planner (use if already known).")] uint? postId = null,
        [Description("Location name or partial name. Used when postId is not provided.")] string? postName = null)
    {
        var resolvedId = await ResolvePostId(postId, postName, tourismService, cancellationToken);
        if (resolvedId is null)
            return new WriteResult(false, BuildNotFoundMessage("lokaciju", postId, postName));

        return await writeService.AddToCalendarAsync(resolvedId.Value, cancellationToken);
    }

    [McpServerTool(Name = "tourism_remove_from_planner", Title = "Remove from Travel Planner", ReadOnly = false, Idempotent = true)]
    [Description(
        "Remove a location from the tourist's travel calendar/planner. Requires the tourist to be logged in. " +
        "Provide postId OR postName — never both. " +
        "If you only know the location name, provide postName.")]
    public static async Task<WriteResult> RemoveFromPlanner(
        ITourismWriteService writeService,
        ITourismQueryService tourismService,
        CancellationToken cancellationToken,
        [Description("Numeric ID of the location to remove from the planner (use if already known).")] uint? postId = null,
        [Description("Location name or partial name. Used when postId is not provided.")] string? postName = null)
    {
        var resolvedId = await ResolvePostId(postId, postName, tourismService, cancellationToken);
        if (resolvedId is null)
            return new WriteResult(false, BuildNotFoundMessage("lokaciju", postId, postName));

        return await writeService.RemoveFromCalendarAsync(resolvedId.Value, cancellationToken);
    }

    // ════════════════════════════════════════════════════════════════════════
    // PRIVATNI HELPERI
    // ════════════════════════════════════════════════════════════════════════

    private static async Task<uint?> ResolvePostId(
        uint? postId,
        string? postName,
        ITourismQueryService svc,
        CancellationToken ct)
    {
        if (postId.HasValue) return postId.Value;
        if (string.IsNullOrWhiteSpace(postName)) return null;
        var result = await svc.ResolvePostAsync(postName, ct);
        return result.Found ? result.Id : null;
    }

    private static string BuildNotFoundMessage(string entityLabel, uint? id, string? name)
    {
        if (id.HasValue)
            return $"Nije pronađena {entityLabel} sa ID-om {id.Value}.";
        if (!string.IsNullOrWhiteSpace(name))
            return $"Nije pronađena {entityLabel} čiji naziv odgovara '{name}'. Pokušajte s tourism_search_posts za pretragu.";
        return $"Nije navedeno ni ID ni naziv za {entityLabel}.";
    }
}
