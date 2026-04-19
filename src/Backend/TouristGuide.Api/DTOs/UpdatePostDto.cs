using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace TouristGuide.Api.DTOs
{
    public class UpdatePostDto
    {
        public uint? RegionId { get; set; }

        [MaxLength(300)]
        public string? Title { get; set; }

        public string? PostType { get; set; }
        public string? Description { get; set; }
        public decimal? Lat { get; set; }
        public decimal? Lng { get; set; }

        [MaxLength(300)]
        public string? Address { get; set; }

        [MaxLength(500)]
        public string? ExternalUrl { get; set; }

        [MaxLength(100)]
        public string? ExternalUrlLabel { get; set; }

        // Prihvata i JSON string i direktni array/object od frontenda
        public JsonNode? Images { get; set; }
        public JsonNode? OpeningHours { get; set; }
        public JsonNode? Details { get; set; }

        public string? Status { get; set; }

        // Helper: pretvara JsonNode u string za DB kolonu
        public string? ImagesToString() => NormalizeJson(Images);
        public string? OpeningHoursToString() => NormalizeJson(OpeningHours);
        public string? DetailsToString() => NormalizeJson(Details);

        private static string? NormalizeJson(JsonNode? node)
        {
            if (node is null) return null;
            // Ako je string koji je već JSON — provjeri je li validan
            if (node is JsonValue jv && jv.TryGetValue<string>(out var s))
            {
                try { JsonDocument.Parse(s); return s; } catch { /* nije JSON string */ }
            }
            return node.ToJsonString();
        }
    }
}