using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.DTOs;
using TouristGuide.Api.Models;
using TouristGuide.Api.Services;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/tourist-auth")]
    public class TouristAuthController : ControllerBase
    {
        private readonly AppDbContext _dbContext;
        private readonly JwtService _jwtService;
        private readonly IConfiguration _configuration;

        public TouristAuthController(AppDbContext dbContext, JwtService jwtService, IConfiguration configuration)
        {
            _dbContext = dbContext;
            _jwtService = jwtService;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<ActionResult<TouristAuthResponseDto>> Register([FromBody] TouristRegisterRequestDto request)
        {
            // ASP.NET validacija DTO-ja puni ModelState pre ulaska u logiku.
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            var emailExists = await _dbContext.Tourists.AnyAsync(t => t.Email != null && t.Email.ToLower() == normalizedEmail);

            if (emailExists)
                return Conflict(new { message = "Turista sa ovim emailom vec postoji." });

            var now = DateTime.UtcNow;
            var tourist = new Tourist
            {
                Name = request.Name.Trim(),
                Email = normalizedEmail,
                PasswordHash = PasswordHelper.Hash(request.Password),
                Language = string.IsNullOrWhiteSpace(request.Language) ? "en" : request.Language.Trim().ToLowerInvariant(),
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            };

            _dbContext.Tourists.Add(tourist);
            await _dbContext.SaveChangesAsync();

            // Nakon uspesne registracije odmah vracamo token da frontend ne mora posebno da radi login.
            return Ok(BuildAuthResponse(tourist));
        }

        [HttpPost("login")]
        public async Task<ActionResult<TouristAuthResponseDto>> Login([FromBody] TouristLoginRequestDto request)
        {
            // ASP.NET validacija DTO-ja puni ModelState pre ulaska u logiku.
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            var tourist = await _dbContext.Tourists.FirstOrDefaultAsync(t => t.Email != null && t.Email.ToLower() == normalizedEmail);

            if (tourist is null || string.IsNullOrWhiteSpace(tourist.PasswordHash) || !PasswordHelper.Verify(request.Password, tourist.PasswordHash))
                return Unauthorized(new { message = "Neispravan email ili lozinka." });

            if (!tourist.IsActive)
                return Unauthorized(new { message = "Turisticki nalog nije aktivan." });

            tourist.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            return Ok(BuildAuthResponse(tourist));
        }

        [Authorize(Roles = "tourist")]
        [HttpGet("me")]
        public async Task<ActionResult<TouristMeDto>> Me()
        {
            var touristId = GetAuthorizedTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            var tourist = await _dbContext.Tourists.FirstOrDefaultAsync(t => t.Id == touristId.Value);
            if (tourist is null)
                return NotFound(new { message = "Turista nije pronadjen." });

            return Ok(MapTourist(tourist));
        }

        private TouristAuthResponseDto BuildAuthResponse(Tourist tourist)
        {
            var expiresInHours = int.Parse(_configuration["Jwt:ExpiresInHours"] ?? "8");

            // Token sluzi za naredne zasticene zahteve; user payload je tu da frontend odmah zna ko je prijavljen.
            var token = _jwtService.GenerateToken(
                tourist.Id,
                tourist.Email ?? string.Empty,
                "tourist",
                null
            );

            return new TouristAuthResponseDto
            {
                Token = token,
                ExpiresAtUtc = DateTime.UtcNow.AddHours(expiresInHours),
                User = MapTourist(tourist)
            };
        }

        private static TouristMeDto MapTourist(Tourist tourist) => new()
        {
            Id = tourist.Id,
            Name = tourist.Name ?? string.Empty,
            Email = tourist.Email ?? string.Empty,
            Language = tourist.Language,
            IsActive = tourist.IsActive,
            CreatedAt = tourist.CreatedAt
        };

        private uint? GetAuthorizedTouristId()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            return uint.TryParse(value, out var touristId) ? touristId : null;
        }
    }
}
