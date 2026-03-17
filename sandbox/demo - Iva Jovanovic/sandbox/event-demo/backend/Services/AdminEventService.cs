using System.Globalization;
using EventDemo.Api.Data;
using EventDemo.Api.DTOs.Events;
using EventDemo.Api.DTOs.Registrations;
using EventDemo.Api.Models;
using EventDemo.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EventDemo.Api.Services;

public class AdminEventService(EventDemoDbContext dbContext) : IAdminEventService
{
    public async Task<IReadOnlyCollection<AdminEventListItemDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var events = await dbContext.Events
            .AsNoTracking()
            .Select(eventEntity => new
            {
                Event = eventEntity,
                RegisteredCount = eventEntity.Registrations.Count
            })
            .OrderBy(item => item.Event.EventDate)
            .ThenBy(item => item.Event.EventTime)
            .ToListAsync(cancellationToken);

        return events
            .Select(item => new AdminEventListItemDto
            {
                Id = item.Event.Id,
                Title = item.Event.Title,
                EventDate = item.Event.EventDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                EventTime = item.Event.EventTime.ToString(@"hh\:mm"),
                Location = item.Event.Location,
                MaxParticipants = item.Event.MaxParticipants,
                RegisteredCount = item.RegisteredCount,
                IsRegistrationOpen = item.Event.IsRegistrationOpen
            })
            .ToList();
    }

    public async Task<AdminEventDetailsDto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var eventData = await dbContext.Events
            .AsNoTracking()
            .Where(eventEntity => eventEntity.Id == id)
            .Select(eventEntity => new
            {
                Event = eventEntity,
                RegisteredCount = eventEntity.Registrations.Count
            })
            .SingleOrDefaultAsync(cancellationToken);

        return eventData is null ? null : MapToAdminDetails(eventData.Event, eventData.RegisteredCount);
    }

    public async Task<AdminEventDetailsDto> CreateAsync(
        SaveEventRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var eventEntity = new Event
        {
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            EventDate = ParseEventDate(request.EventDate),
            EventTime = ParseEventTime(request.EventTime),
            Location = request.Location.Trim(),
            MaxParticipants = request.MaxParticipants,
            IsRegistrationOpen = request.IsRegistrationOpen,
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Events.Add(eventEntity);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToAdminDetails(eventEntity, 0);
    }

    public async Task<AdminEventDetailsDto?> UpdateAsync(
        int id,
        SaveEventRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var eventEntity = await dbContext.Events
            .Include(existingEvent => existingEvent.Registrations)
            .SingleOrDefaultAsync(existingEvent => existingEvent.Id == id, cancellationToken);

        if (eventEntity is null)
        {
            return null;
        }

        eventEntity.Title = request.Title.Trim();
        eventEntity.Description = request.Description.Trim();
        eventEntity.EventDate = ParseEventDate(request.EventDate);
        eventEntity.EventTime = ParseEventTime(request.EventTime);
        eventEntity.Location = request.Location.Trim();

        if (request.MaxParticipants < eventEntity.Registrations.Count)
        {
            throw new ArgumentException("MaxParticipants cannot be lower than the current number of registrations.");
        }

        eventEntity.MaxParticipants = request.MaxParticipants;
        eventEntity.IsRegistrationOpen = request.IsRegistrationOpen;

        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToAdminDetails(eventEntity, eventEntity.Registrations.Count);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var eventEntity = await dbContext.Events
            .SingleOrDefaultAsync(existingEvent => existingEvent.Id == id, cancellationToken);

        if (eventEntity is null)
        {
            return false;
        }

        dbContext.Events.Remove(eventEntity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyCollection<RegistrationItemDto>?> GetRegistrationsAsync(
        int eventId,
        CancellationToken cancellationToken = default)
    {
        var eventExists = await dbContext.Events
            .AsNoTracking()
            .AnyAsync(eventEntity => eventEntity.Id == eventId, cancellationToken);

        if (!eventExists)
        {
            return null;
        }

        var registrations = await dbContext.Registrations
            .AsNoTracking()
            .Where(registration => registration.EventId == eventId)
            .OrderByDescending(registration => registration.RegistrationDate)
            .ToListAsync(cancellationToken);

        return registrations
            .Select(registration => new RegistrationItemDto
            {
                Id = registration.Id,
                FullName = registration.FullName,
                Email = registration.Email,
                RegistrationDate = registration.RegistrationDate.ToString("yyyy-MM-dd HH:mm:ss")
            })
            .ToList();
    }

    public async Task<bool> DeleteRegistrationAsync(
        int eventId,
        int registrationId,
        CancellationToken cancellationToken = default)
    {
        var registration = await dbContext.Registrations
            .SingleOrDefaultAsync(
                existingRegistration => existingRegistration.EventId == eventId && existingRegistration.Id == registrationId,
                cancellationToken);

        if (registration is null)
        {
            return false;
        }

        dbContext.Registrations.Remove(registration);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static AdminEventDetailsDto MapToAdminDetails(Event eventEntity, int registeredCount)
    {
        return new AdminEventDetailsDto
        {
            Id = eventEntity.Id,
            Title = eventEntity.Title,
            Description = eventEntity.Description,
            EventDate = eventEntity.EventDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            EventTime = eventEntity.EventTime.ToString(@"hh\:mm"),
            Location = eventEntity.Location,
            MaxParticipants = eventEntity.MaxParticipants,
            RegisteredCount = registeredCount,
            IsRegistrationOpen = eventEntity.IsRegistrationOpen
        };
    }

    private static DateTime ParseEventDate(string value)
    {
        if (DateTime.TryParseExact(
                value,
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var parsedDate))
        {
            return parsedDate.Date;
        }

        throw new ArgumentException("EventDate must be a valid date in yyyy-MM-dd format.");
    }

    private static TimeSpan ParseEventTime(string value)
    {
        var formats = new[] { @"hh\:mm", @"hh\:mm\:ss" };

        if (TimeSpan.TryParseExact(value, formats, CultureInfo.InvariantCulture, out var parsedTime))
        {
            return parsedTime;
        }

        throw new ArgumentException("EventTime must be a valid time in HH:mm or HH:mm:ss format.");
    }
}
