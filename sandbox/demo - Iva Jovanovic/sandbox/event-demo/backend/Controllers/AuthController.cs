using EventDemo.Api.DTOs.Auth;
using EventDemo.Api.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EventDemo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IAdminAuthService adminAuthService) : ControllerBase
{
    [HttpPost("login")]
    [ProducesResponseType<AdminLoginResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AdminLoginResponseDto>> Login(
        [FromBody] AdminLoginRequestDto request,
        CancellationToken cancellationToken)
    {
        var response = await adminAuthService.LoginAsync(request, cancellationToken);

        if (response is null)
        {
            return Unauthorized(new { message = "Invalid username or password." });
        }

        return Ok(response);
    }
}
