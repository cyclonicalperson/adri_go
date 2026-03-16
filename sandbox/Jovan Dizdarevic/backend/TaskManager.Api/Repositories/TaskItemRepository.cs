using Microsoft.EntityFrameworkCore;
using TaskManager.Api.Data;
using TaskManager.Api.Models;

namespace TaskManager.Api.Repositories;

public class TaskItemRepository : ITaskItemRepository
{
    private readonly AppDbContext _dbContext;

    public TaskItemRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<TaskItem>> GetAllAsync(TaskItemStatus? status, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Tasks.AsNoTracking().AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        return await query.OrderByDescending(x => x.CreatedAtUtc).ToListAsync(cancellationToken);
    }

    public async Task<TaskItem?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
        => await _dbContext.Tasks.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<TaskItem> AddAsync(TaskItem taskItem, CancellationToken cancellationToken = default)
    {
        _dbContext.Tasks.Add(taskItem);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return taskItem;
    }

    public async Task<TaskItem?> UpdateAsync(TaskItem taskItem, CancellationToken cancellationToken = default)
    {
        var existing = await _dbContext.Tasks.FirstOrDefaultAsync(x => x.Id == taskItem.Id, cancellationToken);
        if (existing is null) return null;

        existing.Title = taskItem.Title;
        existing.Description = taskItem.Description;
        existing.Status = taskItem.Status;
        existing.DueDateUtc = taskItem.DueDateUtc;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return existing;
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var existing = await _dbContext.Tasks.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (existing is null) return false;

        _dbContext.Tasks.Remove(existing);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
