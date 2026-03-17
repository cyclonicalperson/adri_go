using EventDemo.Api.DTOs.Events;

namespace EventDemo.Api.Services.Interfaces;

public interface IEventService
{
    Task<IReadOnlyCollection<PublicEventSummaryDto>> GetPublicEventsAsync(CancellationToken cancellationToken = default);

    Task<EventDetailsDto?> GetEventByIdAsync(int id, CancellationToken cancellationToken = default);
}
