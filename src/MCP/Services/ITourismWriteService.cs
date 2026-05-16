namespace Mcp.Services;

internal interface ITourismWriteService
{
    // ── Recenzije ─────────────────────────────────────────────────────────────
    Task<WriteResult> SubmitReviewAsync(uint postId, int rating, string? comment, CancellationToken ct);

    // ── Sačuvane lokacije ─────────────────────────────────────────────────────
    Task<WriteResult> SavePostAsync(uint postId, CancellationToken ct);
    Task<WriteResult> UnsavePostAsync(uint postId, CancellationToken ct);

    // ── Lajkovi ───────────────────────────────────────────────────────────────
    Task<WriteResult> LikePostAsync(uint postId, CancellationToken ct);
    Task<WriteResult> UnlikePostAsync(uint postId, CancellationToken ct);

    // ── Planer putovanja ──────────────────────────────────────────────────────
    Task<WriteResult> AddToCalendarAsync(uint postId, CancellationToken ct);
    Task<WriteResult> RemoveFromCalendarAsync(uint postId, CancellationToken ct);
}

internal sealed record WriteResult(bool Success, string Message, object? Data = null);