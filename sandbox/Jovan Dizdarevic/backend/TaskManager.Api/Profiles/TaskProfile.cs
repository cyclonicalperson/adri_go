using AutoMapper;
using TaskManager.Api.Dtos;
using TaskManager.Api.Models;

namespace TaskManager.Api.Profiles;

public class TaskProfile : Profile
{
    public TaskProfile()
    {
        CreateMap<TaskItem, TaskItemDto>();
        CreateMap<CreateTaskItemDto, TaskItem>();
        CreateMap<UpdateTaskItemDto, TaskItem>();
    }
}
