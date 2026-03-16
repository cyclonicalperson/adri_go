using System.ComponentModel.DataAnnotations;
using TaskManager.Api.Models;

namespace TaskManager.Api.Dtos;

public class TaskItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TaskItemStatus Status { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? DueDateUtc { get; set; }
}

public class CreateTaskItemDto
{
    [Required]
    [MaxLength(120)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public TaskItemStatus Status { get; set; } = TaskItemStatus.Todo;
    public DateTime? DueDateUtc { get; set; }
}

public class UpdateTaskItemDto
{
    [Required]
    [MaxLength(120)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public TaskItemStatus Status { get; set; } = TaskItemStatus.Todo;
    public DateTime? DueDateUtc { get; set; }
}
