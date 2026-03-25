using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TouristOrg.Application.Interfaces;
using TouristOrg.Domain.Entities;

namespace TouristOrg.Infrastructure.Repositories;
public class InMemoryTourRepository : ITourRepository
{
    private static readonly List<Tour> _tours = new();

    public Task<IEnumerable<Tour>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult<IEnumerable<Tour>>(_tours);

    public Task<Tour?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(_tours.FirstOrDefault(t => t.Id == id));

    public Task AddAsync(Tour tour, CancellationToken ct = default)
    {
        _tours.Add(tour);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Tour tour, CancellationToken ct = default)
        => Task.CompletedTask;

    public Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var tour = _tours.FirstOrDefault(t => t.Id == id);
        if (tour is not null) _tours.Remove(tour);
        return Task.CompletedTask;
    }
}

