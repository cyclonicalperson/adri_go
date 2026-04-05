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
        private readonly JwtService _jwtService;
        private readonly IConfiguration _configuration;


        // Sada ubrizgavamo i JwtService pored AppDbContext
        public AuthController(AppDbContext dbContext, JwtService jwtService, IConfiguration configuration)
        {
            _dbContext = dbContext;
            _jwtService = jwtService;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto request)
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            // Tražimo korisnika u bazi, učitavamo i njegove permisije
            var adminUser = await _dbContext.AdminUsers
                .Include(a => a.UserPermissions)
                    .ThenInclude(up => up.Permission)
                .AsTracking()
                .FirstOrDefaultAsync(x => x.Email.ToLower() == normalizedEmail);

            // Proveravamo lozinku
            if (adminUser is null || !PasswordHelper.Verify(request.Password, adminUser.PasswordHash))
            {
                // Namerno ista poruka za oba slučaja — ne otkrivamo da li email postoji
                return Unauthorized(new { message = "Neispravan email ili lozinka." });
            }

            if (!string.Equals(adminUser.AccountStatus, "active", StringComparison.OrdinalIgnoreCase))
            {
                return Unauthorized(new
                {
                    message = "Admin nalog nije aktivan.",
                    status = adminUser.AccountStatus
                });
            }

            // Beležimo poslednji login
            adminUser.LastLoginAt = DateTime.UtcNow;
            adminUser.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            // NOVO: generišemo pravi JWT token
            var expiresInHours = int.Parse(_configuration["Jwt:ExpiresInHours"] ?? "8");
            var token = _jwtService.GenerateToken(
                adminUser.Id,
                adminUser.Email,
                adminUser.Role,
                adminUser.OrganizationId
            );
            var expiresAtUtc = DateTime.UtcNow.AddHours(expiresInHours);

            // Sakupljamo nazive permisija korisnika
            var permissions = adminUser.UserPermissions
                .Select(up => up.Permission.Code)
                .ToList();

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
                    IsIndividual = adminUser.IsIndividual,
                    Permissions = permissions
                }
            });
        }
    }
}