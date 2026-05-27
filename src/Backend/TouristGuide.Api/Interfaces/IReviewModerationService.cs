namespace TouristGuide.Api.Interfaces
{
    public sealed record ModerationResult(
        bool IsSafe,
        string? FlagReason,
        double ToxicityScore);

    public interface IReviewModerationService
    {
        /// <summary>
        /// Moderira komentar recenzije kroz dva sloja:
        ///   Sloj 1 — lokalni keyword filter (instant, bez API poziva)
        ///   Sloj 2 — Gemini AI (kontekst, ironija, strani jezici)
        /// Vraća IsSafe=true samo ako prođe oba sloja.
        /// </summary>
        Task<ModerationResult> ModerateAsync(string? comment, CancellationToken cancellationToken = default);
    }
}
