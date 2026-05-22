using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace TouristGuide.Api.DTOs
{
    /// <summary>
    /// DTO koji admin šalje pri kreiranju nove objave (POST /posts).
    /// </summary>
    public class CreatePostDto
    {
        // AdminId se automatski čita iz JWT tokena u PostsController.Create
        public uint AdminId { get; set; }

        public uint? RegionId { get; set; }

        [MaxLength(200)]
        public string? ProposedRegionName { get; set; }

        [MaxLength(100)]
        public string? Country { get; set; }

        [Required(ErrorMessage = "Naslov je obavezan.")]
        [MaxLength(300, ErrorMessage = "Naslov ne smije biti duži od 300 znakova.")]
        public string Title { get; set; } = string.Empty;

        [Required(ErrorMessage = "Tip objave je obavezan.")]
        public string PostType { get; set; } = string.Empty;
        // Dozvoljene vrijednosti: accommodation, restaurant, club, cultural_site,
        // monument, sports_facility, event, attraction, shop, other

        public string? Description { get; set; }

        public decimal? Lat { get; set; }

        public decimal? Lng { get; set; }

        [MaxLength(300)]
        public string? Address { get; set; }

        [MaxLength(500)]
        public string? ExternalUrl { get; set; }

        [MaxLength(100)]
        public string? ExternalUrlLabel { get; set; }

        /// <summary>JSON string ili array sa URL-ovima slika.</summary>
        public JsonNode? Images { get; set; }

        /// <summary>JSON string ili objekat sa radnim vremenom.</summary>
        public JsonNode? OpeningHours { get; set; }

        /// <summary>JSON string ili objekat sa specifičnim atributima.</summary>
        public JsonNode? Details { get; set; }

        public List<uint>? TagIds { get; set; }

        // Helpers za normalizaciju u string za DB
        public string? ImagesToString() => NormalizeJson(Images);
        public string? OpeningHoursToString() => NormalizeJson(OpeningHours);
        public string? DetailsToString() => NormalizeJson(Details);

        private static string? NormalizeJson(JsonNode? node)
        {
            if (node is null) return null;
            if (node is JsonValue jv && jv.TryGetValue<string>(out var s))
            {
                try { JsonDocument.Parse(s); return s; } catch { }
            }
            return node.ToJsonString();
        }

        /// <summary>draft | published | archived — podrazumijevano: draft.</summary>
        public string Status { get; set; } = "draft";
    }
}
