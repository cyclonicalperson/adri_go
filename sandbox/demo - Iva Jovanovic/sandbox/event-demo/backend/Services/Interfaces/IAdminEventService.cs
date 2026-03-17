using EventDemo.Api.DTOs.Events;
using EventDemo.Api.DTOs.Registrations;

namespace EventDemo.Api.Services.Interfaces;

public interface IAdminEventService
{
    Task<IReadOnlyCollection<AdminEventListItemDto>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<AdminEventDetailsDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<AdminEventDetailsDto> CreateAsync(SaveEventRequestDto request, CancellationToken cancellationToken = default);

    Task<AdminEventDetailsDto?> UpdateAsync(int id, SaveEventRequestDto request, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<RegistrationItemDto>?> GetRegistrationsAsync(int eventId, CancellationToken cancellationToken = default);

    Task<bool> DeleteRegistrationAsync(int eventId, int registrationId, CancellationToken cancellationToken = default);
}
