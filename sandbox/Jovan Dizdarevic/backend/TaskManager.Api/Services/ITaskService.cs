using TaskManager.Api.Dtos;
using TaskManager.Api.Models;

namespace TaskManager.Api.Services;

public interface ITaskService
{
    Task<List<TaskItemDto>> GetAllAsync(TaskItemStatus? status, CancellationToken cancellationToken = default);
    Task<TaskItemDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<TaskItemDto> CreateAsync(CreateTaskItemDto dto, CancellationToken cancellationToken = default);
    Task<TaskItemDto?> UpdateAsync(int id, UpdateTaskItemDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
