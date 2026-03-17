using EventDemo.Api.DTOs.Registrations;

namespace EventDemo.Api.Services.Results;

public class RegistrationResult
{
    public RegistrationStatus Status { get; init; }

    public string Message { get; init; } = string.Empty;

    public EventRegistrationResponseDto? Response { get; init; }
}
