using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace TouristGuide.Api.DTOs
{
    // ─────────────────────────────────────────────────────────────────────────
    // Konvencija za pohranu event-specifičnih polja u JSON 'details' kolonu:
    //
    //   {
    //     "startAt":   "2025-07-15T20:00:00",
    //     "endAt":     "2025-07-15T23:00:00",
    //     "ticketUrl": "https://tickets.example.com/event/42",
    //     "category":  "CONCERT"           // CONCERT | SPORT | THEATER | FESTIVAL | OTHER
    //   }
    //
    // Ova konvencija je stabilna i ne zahtijeva izmjenu DB šeme.
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// DTO koji se vraća frontendu za jedan događaj.
    /// Odgovara modelu TouristEvent na Angular frontendu.
    /// </summary>
    public class EventDto
    {
        public uint EventId       { get; set; }   // alias za Id — frontend koristi eventId
        public uint ObjectId      { get; set; }   // isti kao EventId, frontend ponekad šalje objectId
        public uint? RegionId     { get; set; }
        public string? RegionName { get; set; }

        public string Title       { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Address    { get; set; }
        public decimal? Latitude  { get; set; }
        public decimal? Longitude { get; set; }
        public string? Images     { get; set; }
        public string Status      { get; set; } = "draft";

        // ── Event-specifična polja iz JSON 'details' kolone ──────────────────
        public DateTime? StartAt   { get; set; }
        public DateTime? EndAt     { get; set; }
        public string? TicketUrl  { get; set; }

        /// <summary>CONCERT | SPORT | THEATER | FESTIVAL | OTHER</summary>
        public string Category    { get; set; } = "OTHER";

        // ── Statistike ────────────────────────────────────────────────────────
        public uint ViewCount    { get; set; }
        public uint LikeCount    { get; set; }
        public uint SaveCount    { get; set; }
        public uint ReviewCount  { get; set; }
        public decimal? AvgRating { get; set; }

        public DateTime? PublishedAt { get; set; }
        public DateTime CreatedAt   { get; set; }
        public DateTime UpdatedAt   { get; set; }
    }

    /// <summary>
    /// DTO koji admin/turista šalje pri KREIRANJU novog događaja (POST /api/events).
    /// </summary>
    public class CreateEventDto
    {
        [Required(ErrorMessage = "Naslov je obavezan.")]
        [MaxLength(300)]
        public string Title { get; set; } = string.Empty;

        public uint? RegionId    { get; set; }
        public string? Description { get; set; }
        public string? Address   { get; set; }
        public decimal? Lat      { get; set; }
        public decimal? Lng      { get; set; }
        public string? Images    { get; set; }

        // ── Event-specifična polja ─────────────────────────────────────────────
        public DateTime? StartAt  { get; set; }
        public DateTime? EndAt    { get; set; }
        public string? TicketUrl { get; set; }

        /// <summary>CONCERT | SPORT | THEATER | FESTIVAL | OTHER</summary>
        public string Category { get; set; } = "OTHER";

        /// <summary>draft | published | archived</summary>
        public string Status { get; set; } = "draft";
    }

    /// <summary>
    /// DTO koji admin šalje pri IZMJENI događaja (PUT /api/events/{id}).
    /// Sva polja su opcionalna — šalješ samo ono što mijenjaš.
    /// </summary>
    public class UpdateEventDto
    {
        [MaxLength(300)]
        public string? Title       { get; set; }
        public uint? RegionId      { get; set; }
        public string? Description { get; set; }
        public string? Address     { get; set; }
        public decimal? Lat        { get; set; }
        public decimal? Lng        { get; set; }
        public string? Images      { get; set; }
        public DateTime? StartAt   { get; set; }
        public DateTime? EndAt     { get; set; }
        public string? TicketUrl   { get; set; }
        public string? Category    { get; set; }
        public string? Status      { get; set; }
    }

    /// <summary>
    /// Interna pomoćna klasa za deserijalizaciju 'details' JSON kolone.
    /// </summary>
    internal class EventDetails
    {
        public DateTime? StartAt  { get; set; }
        public DateTime? EndAt    { get; set; }
        public string? TicketUrl { get; set; }
        public string Category   { get; set; } = "OTHER";

        public static EventDetails? FromJson(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            try
            {
                return JsonSerializer.Deserialize<EventDetails>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch { return null; }
        }

        public string ToJson() =>
            JsonSerializer.Serialize(this, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
    }
}
