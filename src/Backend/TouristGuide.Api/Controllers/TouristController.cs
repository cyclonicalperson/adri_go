

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.Models;
using TouristGuide.Api.Services;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/tourists")]
    public class TouristController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TouristController(AppDbContext context)
        {
            _context = context;
        }

        // POST /api/tourists/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] TouristRegisterDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

            var exists = await _context.Tourists
                .AnyAsync(t => t.Email != null && t.Email.ToLower() == normalizedEmail);

            if (exists)
                return Conflict(new { message = "Email je već registrovan." });

            var tourist = new Tourist
            {
                Name = dto.Name.Trim(),
                Email = normalizedEmail,
                PasswordHash = dto.Password,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Tourists.Add(tourist);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                tourist = new
                {
                    id = tourist.Id,
                    name = tourist.Name,
                    email = tourist.Email
                }
            });
        }

        // POST /api/tourists/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] TouristLoginDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

            var tourist = await _context.Tourists
                .FirstOrDefaultAsync(t => t.Email != null && t.Email.ToLower() == normalizedEmail);

            if (tourist == null || tourist.PasswordHash == null ||
                !PasswordHelper.Verify(dto.Password, tourist.PasswordHash))
            {
                return Unauthorized(new { message = "Pogrešan email ili lozinka." });
            }

            if (!tourist.IsActive)
                return Unauthorized(new { message = "Nalog je deaktiviran." });

            tourist.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                tourist = new
                {
                    id = tourist.Id,
                    name = tourist.Name,
                    email = tourist.Email
                }
            });
        }
    }

    // ─── DTOs (mogu biti i u zasebnom fajlu DTOs/TouristDtos.cs) ─────────────
    public class TouristRegisterDto
    {
        [System.ComponentModel.DataAnnotations.Required]
        public string Name { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.EmailAddress]
        public string Email { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.MinLength(6)]
        public string Password { get; set; } = string.Empty;
    }

    public class TouristLoginDto
    {
        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.EmailAddress]
        public string Email { get; set; } = string.Empty;

        [System.ComponentModel.DataAnnotations.Required]
        public string Password { get; set; } = string.Empty;
    }
}
