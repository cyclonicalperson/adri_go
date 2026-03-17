namespace EventDemo.Api.DTOs.Events;

public class PublicEventSummaryDto
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string ShortDescription { get; set; } = string.Empty;

    public string EventDate { get; set; } = string.Empty;

    public string EventTime { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public int RemainingSeats { get; set; }

    public bool IsRegistrationOpen { get; set; }
}
