using EventDemo.Api.DTOs.Events;
using EventDemo.Api.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EventDemo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EventsController(IEventService eventService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyCollection<PublicEventSummaryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<PublicEventSummaryDto>>> GetAll(CancellationToken cancellationToken)
    {
        var events = await eventService.GetPublicEventsAsync(cancellationToken);
        return Ok(events);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType<EventDetailsDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EventDetailsDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var eventDetails = await eventService.GetEventByIdAsync(id, cancellationToken);
        return eventDetails is null
            ? NotFound(new { message = "Event not found." })
            : Ok(eventDetails);
    }
}
