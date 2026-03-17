namespace EventDemo.Api.Services.Results;

public enum RegistrationStatus
{
    Success = 0,
    EventNotFound = 1,
    DuplicateRegistration = 2,
    EventFull = 3,
    RegistrationClosed = 4
}
