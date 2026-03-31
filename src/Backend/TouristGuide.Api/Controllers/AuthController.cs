using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.DTOs;
using TouristGuide.Api.Services;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _dbContext;

        public AuthController(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        // ============================================================
        // POST /auth/login
        // Login za admin korisnike
        // ============================================================
        [HttpPost("login")]
        public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto request)
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            // Pronađi admin nalog po email adresi
            var adminUser = await _dbContext.AdminUsers
                .AsTracking()
                .FirstOrDefaultAsync(x => x.Email.ToLower() == normalizedEmail);

            // Provera kredencijala
            if (adminUser is null || !PasswordHelper.Verify(request.Password, adminUser.PasswordHash))
            {
                return Unauthorized(new { message = "Neispravan email ili lozinka." });
            }

            // Samo aktivni admin nalozi mogu da se prijave
            if (!string.Equals(adminUser.AccountStatus, "active", StringComparison.OrdinalIgnoreCase))
            {
                return Unauthorized(new
                {
                    message = "Admin nalog nije aktivan.",
                    status = adminUser.AccountStatus
                });
            }

            // Evidentiraj poslednji uspešan login
            adminUser.LastLoginAt = DateTime.UtcNow;
            adminUser.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            // Privremeni token odgovor bez pune JWT implementacije
            var expiresAtUtc = DateTime.UtcNow.AddHours(8);
            var tokenPayload = $"{adminUser.Id}:{adminUser.Email}:{expiresAtUtc:O}";
            var token = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(tokenPayload));

            return Ok(new LoginResponseDto
            {
                Token = token,
                ExpiresAtUtc = expiresAtUtc,
                User = new AuthenticatedAdminDto
                {
                    Id = adminUser.Id,
                    FullName = adminUser.FullName,
                    Email = adminUser.Email,
                    Role = adminUser.Role,
                    AccountStatus = adminUser.AccountStatus,
                    OrganizationId = adminUser.OrganizationId,
                    IsIndividual = adminUser.IsIndividual
                }
            });
        }
    }
}
