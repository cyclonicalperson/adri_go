namespace EventDemo.Api.DTOs.Events;

public class AdminEventDetailsDto
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string EventDate { get; set; } = string.Empty;

    public string EventTime { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public int MaxParticipants { get; set; }

    public int RegisteredCount { get; set; }

    public bool IsRegistrationOpen { get; set; }
}
