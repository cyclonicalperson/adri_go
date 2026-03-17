using System.Globalization;
using EventDemo.Api.Data;
using EventDemo.Api.DTOs.Events;
using EventDemo.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EventDemo.Api.Services;

public class EventService(EventDemoDbContext dbContext) : IEventService
{
    public async Task<IReadOnlyCollection<PublicEventSummaryDto>> GetPublicEventsAsync(
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
            .Select(item =>
            {
                var remainingSeats = Math.Max(item.Event.MaxParticipants - item.RegisteredCount, 0);

                return new PublicEventSummaryDto
                {
                    Id = item.Event.Id,
                    Title = item.Event.Title,
                    ShortDescription = BuildShortDescription(item.Event.Description),
                    EventDate = item.Event.EventDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    EventTime = item.Event.EventTime.ToString(@"hh\:mm"),
                    Location = item.Event.Location,
                    RemainingSeats = remainingSeats,
                    IsRegistrationOpen = item.Event.IsRegistrationOpen && remainingSeats > 0
                };
            })
            .ToList();
    }

    public async Task<EventDetailsDto?> GetEventByIdAsync(int id, CancellationToken cancellationToken = default)
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

        if (eventData is null)
        {
            return null;
        }

        var remainingSeats = Math.Max(eventData.Event.MaxParticipants - eventData.RegisteredCount, 0);

        return new EventDetailsDto
        {
            Id = eventData.Event.Id,
            Title = eventData.Event.Title,
            Description = eventData.Event.Description,
            EventDate = eventData.Event.EventDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            EventTime = eventData.Event.EventTime.ToString(@"hh\:mm"),
            Location = eventData.Event.Location,
            MaxParticipants = eventData.Event.MaxParticipants,
            RegisteredCount = eventData.RegisteredCount,
            RemainingSeats = remainingSeats,
            IsRegistrationOpen = eventData.Event.IsRegistrationOpen,
            IsFull = remainingSeats == 0
        };
    }

    private static string BuildShortDescription(string description)
    {
        const int maxLength = 120;

        if (description.Length <= maxLength)
        {
            return description;
        }

        return string.Concat(description[..maxLength].TrimEnd(), "...");
    }
}
