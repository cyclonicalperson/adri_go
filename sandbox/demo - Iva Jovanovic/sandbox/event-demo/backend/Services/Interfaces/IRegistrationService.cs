using EventDemo.Api.DTOs.Registrations;
using EventDemo.Api.Services.Results;

namespace EventDemo.Api.Services.Interfaces;

public interface IRegistrationService
{
    Task<RegistrationResult> RegisterAsync(int eventId, EventRegistrationRequestDto request, CancellationToken cancellationToken = default);
}
