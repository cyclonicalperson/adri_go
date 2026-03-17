using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using EventDemo.Api.Data;
using EventDemo.Api.DTOs.Auth;
using EventDemo.Api.Services.Interfaces;
using EventDemo.Api.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace EventDemo.Api.Services;

public class AdminAuthService(
    EventDemoDbContext dbContext,
    IOptions<JwtSettings> jwtSettingsOptions) : IAdminAuthService
{
    private readonly JwtSettings _jwtSettings = jwtSettingsOptions.Value;

    public async Task<AdminLoginResponseDto?> LoginAsync(
        AdminLoginRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var normalizedUsername = request.Username.Trim();
        var password = request.Password.Trim();

        var admin = await dbContext.Admins
            .AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.Username == normalizedUsername, cancellationToken);

        if (admin is null || admin.Password != password)
        {
            return null;
        }

        var expiresAtUtc = DateTime.UtcNow.AddHours(8);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, admin.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, admin.Username),
            new Claim(ClaimTypes.NameIdentifier, admin.Id.ToString()),
            new Claim(ClaimTypes.Name, admin.Username),
            new Claim(ClaimTypes.Role, "Admin")
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Key));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        return new AdminLoginResponseDto
        {
            Username = admin.Username,
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            ExpiresAtUtc = expiresAtUtc
        };
    }
}
