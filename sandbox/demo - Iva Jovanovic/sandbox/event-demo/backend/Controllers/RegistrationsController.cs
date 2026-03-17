using EventDemo.Api.DTOs.Registrations;
using EventDemo.Api.Services.Interfaces;
using EventDemo.Api.Services.Results;
using Microsoft.AspNetCore.Mvc;

namespace EventDemo.Api.Controllers;

[ApiController]
[Route("api/events/{eventId:int}/registrations")]
public class RegistrationsController(IRegistrationService registrationService) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType<EventRegistrationResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<EventRegistrationResponseDto>> Create(
        int eventId,
        [FromBody] EventRegistrationRequestDto request,
        CancellationToken cancellationToken)
    {
        var result = await registrationService.RegisterAsync(eventId, request, cancellationToken);

        return result.Status switch
        {
            RegistrationStatus.Success => Created(string.Empty, result.Response),
            RegistrationStatus.EventNotFound => NotFound(new { message = result.Message }),
            RegistrationStatus.DuplicateRegistration => Conflict(new { message = result.Message }),
            RegistrationStatus.EventFull => Conflict(new { message = result.Message }),
            RegistrationStatus.RegistrationClosed => Conflict(new { message = result.Message }),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new { message = "Unexpected registration status." })
        };
    }
}
