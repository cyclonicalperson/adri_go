using EventDemo.Api.DTOs.Events;
using EventDemo.Api.DTOs.Registrations;
using EventDemo.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventDemo.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/events")]
public class AdminEventsController(IAdminEventService adminEventService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyCollection<AdminEventListItemDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<AdminEventListItemDto>>> GetAll(CancellationToken cancellationToken)
    {
        var events = await adminEventService.GetAllAsync(cancellationToken);
        return Ok(events);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType<AdminEventDetailsDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminEventDetailsDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var eventDetails = await adminEventService.GetByIdAsync(id, cancellationToken);
        return eventDetails is null
            ? NotFound(new { message = "Event not found." })
            : Ok(eventDetails);
    }

    [HttpPost]
    [ProducesResponseType<AdminEventDetailsDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AdminEventDetailsDto>> Create(
        [FromBody] SaveEventRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var createdEvent = await adminEventService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = createdEvent.Id }, createdEvent);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType<AdminEventDetailsDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminEventDetailsDto>> Update(
        int id,
        [FromBody] SaveEventRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updatedEvent = await adminEventService.UpdateAsync(id, request, cancellationToken);

            return updatedEvent is null
                ? NotFound(new { message = "Event not found." })
                : Ok(updatedEvent);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var deleted = await adminEventService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound(new { message = "Event not found." });
    }

    [HttpGet("{id:int}/registrations")]
    [ProducesResponseType<IReadOnlyCollection<RegistrationItemDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyCollection<RegistrationItemDto>>> GetRegistrations(
        int id,
        CancellationToken cancellationToken)
    {
        var registrations = await adminEventService.GetRegistrationsAsync(id, cancellationToken);

        return registrations is null
            ? NotFound(new { message = "Event not found." })
            : Ok(registrations);
    }

    [HttpDelete("{id:int}/registrations/{registrationId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteRegistration(
        int id,
        int registrationId,
        CancellationToken cancellationToken)
    {
        var deleted = await adminEventService.DeleteRegistrationAsync(id, registrationId, cancellationToken);
        return deleted
            ? NoContent()
            : NotFound(new { message = "Registration not found for this event." });
    }
}
