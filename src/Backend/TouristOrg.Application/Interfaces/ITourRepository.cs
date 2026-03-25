using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TouristOrg.Domain.Entities;

namespace TouristOrg.Application.Interfaces;
public interface ITourRepository
{
    Task<Tour?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<Tour>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(Tour tour, CancellationToken ct = default);
    Task UpdateAsync(Tour tour, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
