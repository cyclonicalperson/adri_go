using System.ComponentModel.DataAnnotations;

namespace TouristGuide.Api.DTOs
{
    public class EventDto
    {
        public uint EventId { get; set; }
        public uint? DestinationId { get; set; }
        public uint? ObjectId { get; set; }
        public uint? OrganizationId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = "OTHER";
        public string Description { get; set; } = string.Empty;
        public DateTime StartAt { get; set; }
        public DateTime EndAt { get; set; }
        public string? TicketUrl { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public uint CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public EventLookupDto? Destination { get; set; }
        public EventLookupDto? Object { get; set; }
        public List<EventMediaDto>? Media { get; set; }
    }

    public class EventLookupDto
    {
        public uint Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class EventMediaDto
    {
        public uint MediaId { get; set; }
        public string Url { get; set; } = string.Empty;
        public string? Caption { get; set; }
        public int SortOrder { get; set; }
    }

    public class CreateEventDto
    {
        public uint? DestinationId { get; set; }
        public uint? ObjectId { get; set; }

        [Required]
        [MaxLength(300)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Category { get; set; } = "OTHER";

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        public DateTime StartAt { get; set; }

        [Required]
        public DateTime EndAt { get; set; }

        [MaxLength(500)]
        public string? TicketUrl { get; set; }

        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
    }

    public class UpdateEventDto
    {
        public uint? DestinationId { get; set; }
        public uint? ObjectId { get; set; }
        public string? Name { get; set; }
        public string? Category { get; set; }
        public string? Description { get; set; }
        public DateTime? StartAt { get; set; }
        public DateTime? EndAt { get; set; }
        public string? TicketUrl { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
    }
}