using System.ComponentModel.DataAnnotations;

namespace EventDemo.Api.DTOs.Events;

public class SaveEventRequestDto
{
    [Required]
    [StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{4}-\d{2}-\d{2}$", ErrorMessage = "EventDate must use yyyy-MM-dd format.")]
    public string EventDate { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{2}:\d{2}(:\d{2})?$", ErrorMessage = "EventTime must use HH:mm or HH:mm:ss format.")]
    public string EventTime { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string Location { get; set; } = string.Empty;

    [Range(1, 100000)]
    public int MaxParticipants { get; set; }

    public bool IsRegistrationOpen { get; set; }
}
