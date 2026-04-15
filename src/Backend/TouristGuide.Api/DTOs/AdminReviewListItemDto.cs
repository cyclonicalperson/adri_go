namespace TouristGuide.Api.DTOs
{
    /// <summary>
    /// DTO koji se vraća adminu/superadminu u listi recenzija (GET /api/reviews).
    ///
    /// Sadrži sve podatke potrebne za prikaz tabele recenzija u Admin UI:
    /// ko je ostavio recenziju, za koju objavu, ocjenu, komentar i status moderacije.
    /// </summary>
    public class AdminReviewListItemDto
    {
        public uint ReviewId { get; set; }

        // ── Ocjena i sadržaj ──────────────────────────────────────────────────
        public int Rating { get; set; }
        public string? Comment { get; set; }

        /// <summary>PENDING | APPROVED | REJECTED</summary>
        public string Status { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }

        // ── Podaci o turistu koji je ostavio recenziju ────────────────────────
        public uint? TouristId { get; set; }
        public string TouristName { get; set; } = string.Empty;

        // ── Podaci o objavi (lokacija ili ruta) za koju je recenzija ─────────
        public uint? PostId { get; set; }
        public string? PostTitle { get; set; }

        /// <summary>
        /// ID admina koji je vlasnik objave.
        /// Korisno za SuperAdmin UI koji prikazuje recenzije svih admina.
        /// </summary>
        public uint? PostAdminId { get; set; }

        /// <summary>
        /// Tip entiteta: OBJECT (lokacija) ili ROUTE (ruta).
        /// Null ako nije moguće odrediti.
        /// </summary>
        public string? EntityType { get; set; }

        /// <summary>
        /// post_type vrijednost iz baze (accommodation, restaurant, event...).
        /// Null za rute.
        /// </summary>
        public string? PostType { get; set; }

        // ── Podaci o ruti (ako je recenzija za rutu, ne za objavu) ───────────
        public uint? RouteId { get; set; }
        public string? RouteName { get; set; }
    }
}
