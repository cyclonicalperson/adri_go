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

                var adminUser = await _dbContext.AdminUsers
                    .Where(x => x.Email.ToLower() == normalizedEmail)
                    .Select(x => new
                    {
                        x.Id,
                        x.FullName,
                        x.Email,
                        x.PasswordHash,
                        x.Role,
                        x.AccountStatus,
                        x.OrganizationId,
                        x.IsIndividual
                    })
                    .FirstOrDefaultAsync();

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

                await _dbContext.AdminUsers
                    .Where(a => a.Id == adminUser.Id)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(a => a.LastLoginAt, DateTime.UtcNow)
                        .SetProperty(a => a.UpdatedAt, DateTime.UtcNow));

                var expiresInHours = int.Parse(_configuration["Jwt:ExpiresInHours"] ?? "8");
                var token = _jwtService.GenerateToken(
                    adminUser.Id,
                    adminUser.Email,
                    adminUser.Role,
                    adminUser.OrganizationId
                );
                var expiresAtUtc = DateTime.UtcNow.AddHours(expiresInHours);

                var permissions = await _dbContext.AdminUserPermissions
                    .Where(up => up.AdminUserId == adminUser.Id)
                    .Join(
                        _dbContext.AdminPermissions,
                        up => up.PermissionId,
                        permission => permission.Id,
                        (_, permission) => permission.Code)
                    .ToListAsync();

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
