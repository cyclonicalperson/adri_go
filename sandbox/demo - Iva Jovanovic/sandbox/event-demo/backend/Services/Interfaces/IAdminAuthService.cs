using EventDemo.Api.DTOs.Auth;

namespace EventDemo.Api.Services.Interfaces;

public interface IAdminAuthService
{
    Task<AdminLoginResponseDto?> LoginAsync(AdminLoginRequestDto request, CancellationToken cancellationToken = default);
}
