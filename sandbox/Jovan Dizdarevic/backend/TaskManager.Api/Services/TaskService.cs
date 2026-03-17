using AutoMapper;
using TaskManager.Api.Dtos;
using TaskManager.Api.Models;
using TaskManager.Api.Repositories;

namespace TaskManager.Api.Services;

public class TaskService : ITaskService
{
    private readonly ITaskItemRepository _repository;
    private readonly IMapper _mapper;

    public TaskService(ITaskItemRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<List<TaskItemDto>> GetAllAsync(TaskItemStatus? status, CancellationToken cancellationToken = default)
    {
        var items = await _repository.GetAllAsync(status, cancellationToken);
        return _mapper.Map<List<TaskItemDto>>(items);
    }

    public async Task<TaskItemDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var item = await _repository.GetByIdAsync(id, cancellationToken);
        return item is null ? null : _mapper.Map<TaskItemDto>(item);
    }

    public async Task<TaskItemDto> CreateAsync(CreateTaskItemDto dto, CancellationToken cancellationToken = default)
    {
        var entity = _mapper.Map<TaskItem>(dto);
        entity.CreatedAtUtc = DateTime.UtcNow;
        var created = await _repository.AddAsync(entity, cancellationToken);
        return _mapper.Map<TaskItemDto>(created);
    }

    public async Task<TaskItemDto?> UpdateAsync(int id, UpdateTaskItemDto dto, CancellationToken cancellationToken = default)
    {
        var entity = _mapper.Map<TaskItem>(dto);
        entity.Id = id;
        var updated = await _repository.UpdateAsync(entity, cancellationToken);
        return updated is null ? null : _mapper.Map<TaskItemDto>(updated);
    }

    public Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
        => _repository.DeleteAsync(id, cancellationToken);
}
