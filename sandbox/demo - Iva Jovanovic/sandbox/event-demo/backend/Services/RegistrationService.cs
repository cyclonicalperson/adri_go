using EventDemo.Api.Data;
using EventDemo.Api.DTOs.Registrations;
using EventDemo.Api.Models;
using EventDemo.Api.Services.Interfaces;
using EventDemo.Api.Services.Results;
using Microsoft.EntityFrameworkCore;

namespace EventDemo.Api.Services;

public class RegistrationService(EventDemoDbContext dbContext) : IRegistrationService
{
    public async Task<RegistrationResult> RegisterAsync(
        int eventId,
        EventRegistrationRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var eventData = await dbContext.Events
            .Where(eventEntity => eventEntity.Id == eventId)
            .Select(eventEntity => new
            {
                Event = eventEntity,
                RegisteredCount = eventEntity.Registrations.Count
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (eventData is null)
        {
            return new RegistrationResult
            {
                Status = RegistrationStatus.EventNotFound,
                Message = "Event not found."
            };
        }

        if (!eventData.Event.IsRegistrationOpen)
        {
            return new RegistrationResult
            {
                Status = RegistrationStatus.RegistrationClosed,
                Message = "Registration is closed for this event."
            };
        }

        if (eventData.RegisteredCount >= eventData.Event.MaxParticipants)
        {
            return new RegistrationResult
            {
                Status = RegistrationStatus.EventFull,
                Message = "This event is already full."
            };
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var duplicateRegistration = await dbContext.Registrations
            .AsNoTracking()
            .AnyAsync(
                registration => registration.EventId == eventId && registration.Email == normalizedEmail,
                cancellationToken);

        if (duplicateRegistration)
        {
            return new RegistrationResult
            {
                Status = RegistrationStatus.DuplicateRegistration,
                Message = "A registration already exists for this email address."
            };
        }

        var registrationDate = DateTime.UtcNow;
        var registration = new Registration
        {
            EventId = eventId,
            FullName = request.FullName.Trim(),
            Email = normalizedEmail,
            RegistrationDate = registrationDate
        };

        dbContext.Registrations.Add(registration);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return new RegistrationResult
            {
                Status = RegistrationStatus.DuplicateRegistration,
                Message = "A registration already exists for this email address."
            };
        }

        return new RegistrationResult
        {
            Status = RegistrationStatus.Success,
            Message = "Registration completed successfully.",
            Response = new EventRegistrationResponseDto
            {
                Message = "Registration completed successfully.",
                RegistrationDate = registrationDate.ToString("yyyy-MM-dd HH:mm:ss")
            }
        };
    }
}
