using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.DTOs;
using TouristGuide.Api.Services;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _dbContext;
        private readonly JwtService _jwtService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            AppDbContext dbContext,
            JwtService jwtService,
            IConfiguration configuration,
            ILogger<AuthController> logger)
        {
            _dbContext = dbContext;
            _jwtService = jwtService;
            _configuration = configuration;
            _logger = logger;
        }

        [HttpPost("login")]
        public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var normalizedEmail = request.Email.Trim().ToLowerInvariant();

                // Tražimo korisnika u bazi, učitavamo i njegove permisije
                var adminUser = await _dbContext.AdminUsers
                    .Include(a => a.UserPermissions)
                        .ThenInclude(up => up.Permission)
                    .AsTracking()
                    .FirstOrDefaultAsync(x => x.Email.ToLower() == normalizedEmail);

                // Proveravamo lozinku
                if (adminUser is null ||
                    string.IsNullOrWhiteSpace(adminUser.PasswordHash) ||
                    !PasswordHelper.Verify(request.Password, adminUser.PasswordHash))
                {
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

                // Generišemo JWT token
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during admin login for email {Email}.", request.Email);
                return Problem(
                    title: "Login failed",
                    detail: "Doslo je do neocekivane greske prilikom prijave.",
                    statusCode: StatusCodes.Status500InternalServerError);
            }
        }
    }
}
