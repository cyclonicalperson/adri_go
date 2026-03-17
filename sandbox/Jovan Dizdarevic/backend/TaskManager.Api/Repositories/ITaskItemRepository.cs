using TaskManager.Api.Models;

namespace TaskManager.Api.Repositories;

public interface ITaskItemRepository
{
    Task<List<TaskItem>> GetAllAsync(TaskItemStatus? status, CancellationToken cancellationToken = default);
    Task<TaskItem?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<TaskItem> AddAsync(TaskItem taskItem, CancellationToken cancellationToken = default);
    Task<TaskItem?> UpdateAsync(TaskItem taskItem, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
}
