using Mcp.Dtos;
using Mcp.Services;
using ModelContextProtocol.Server;
using System.ComponentModel;

namespace Mcp.Tools;

[McpServerToolType]
internal static class TourismWriteTools
{
    [McpServerTool(Name = "tourism_submit_review", Title = "Submit Review", ReadOnly = false, Idempotent = false)]
    [Description("Submit a review for a location (post). Rating must be 1–5. Comment is optional. Requires the tourist to be logged in. The review will be pending moderation before it becomes visible.")]
    public static async Task<WriteResult> SubmitReview(
        [Description("The ID of the location to review.")] uint postId,
        [Description("Rating from 1 (worst) to 5 (best).")] int rating,
        ITourismWriteService writeService,
        CancellationToken cancellationToken,
        [Description("Optional written comment to accompany the rating.")] string? comment = null)
    {
        return await writeService.SubmitReviewAsync(postId, rating, comment, cancellationToken);
    }

    [McpServerTool(Name = "tourism_save_location", Title = "Save Location", ReadOnly = false, Idempotent = true)]
    [Description("Save a location to the tourist's personal saved list. Requires the tourist to be logged in. Use tourism_unsave_location to remove it.")]
    public static async Task<WriteResult> SaveLocation(
        [Description("The ID of the location to save.")] uint postId,
        ITourismWriteService writeService,
        CancellationToken cancellationToken)
    {
        return await writeService.SavePostAsync(postId, cancellationToken);
    }

    [McpServerTool(Name = "tourism_unsave_location", Title = "Unsave Location", ReadOnly = false, Idempotent = true)]
    [Description("Remove a location from the tourist's saved list. Requires the tourist to be logged in.")]
    public static async Task<WriteResult> UnsaveLocation(
        [Description("The ID of the location to unsave.")] uint postId,
        ITourismWriteService writeService,
        CancellationToken cancellationToken)
    {
        return await writeService.UnsavePostAsync(postId, cancellationToken);
    }

    [McpServerTool(Name = "tourism_like_location", Title = "Like Location", ReadOnly = false, Idempotent = true)]
    [Description("Like a location on behalf of the logged-in tourist. Requires the tourist to be logged in. Use tourism_unlike_location to remove the like.")]
    public static async Task<WriteResult> LikeLocation(
        [Description("The ID of the location to like.")] uint postId,
        ITourismWriteService writeService,
        CancellationToken cancellationToken)
    {
        return await writeService.LikePostAsync(postId, cancellationToken);
    }

    [McpServerTool(Name = "tourism_unlike_location", Title = "Unlike Location", ReadOnly = false, Idempotent = true)]
    [Description("Remove a like from a location on behalf of the logged-in tourist. Requires the tourist to be logged in.")]
    public static async Task<WriteResult> UnlikeLocation(
        [Description("The ID of the location to unlike.")] uint postId,
        ITourismWriteService writeService,
        CancellationToken cancellationToken)
    {
        return await writeService.UnlikePostAsync(postId, cancellationToken);
    }

    [McpServerTool(Name = "tourism_add_to_planner", Title = "Add to Travel Planner", ReadOnly = false, Idempotent = true)]
    [Description("Add a location to the tourist's travel calendar/planner. Requires the tourist to be logged in. If the location is already in the planner, it will not be duplicated.")]
    public static async Task<WriteResult> AddToPlanner(
        [Description("The ID of the location to add to the planner.")] uint postId,
        ITourismWriteService writeService,
        CancellationToken cancellationToken)
    {
        return await writeService.AddToCalendarAsync(postId, cancellationToken);
    }

    [McpServerTool(Name = "tourism_remove_from_planner", Title = "Remove from Travel Planner", ReadOnly = false, Idempotent = true)]
    [Description("Remove a location from the tourist's travel calendar/planner. Requires the tourist to be logged in.")]
    public static async Task<WriteResult> RemoveFromPlanner(
        [Description("The ID of the location to remove from the planner.")] uint postId,
        ITourismWriteService writeService,
        CancellationToken cancellationToken)
    {
        return await writeService.RemoveFromCalendarAsync(postId, cancellationToken);
    }
}