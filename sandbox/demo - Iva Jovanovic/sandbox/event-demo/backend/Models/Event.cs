namespace EventDemo.Api.Models;

public class Event
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public DateTime EventDate { get; set; }

    public TimeSpan EventTime { get; set; }

    public string Location { get; set; } = string.Empty;

    public int MaxParticipants { get; set; }

    public bool IsRegistrationOpen { get; set; }

    public DateTime CreatedAt { get; set; }

    public ICollection<Registration> Registrations { get; set; } = [];
}
