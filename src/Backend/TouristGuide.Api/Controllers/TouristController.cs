using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
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
        private readonly IConfiguration _configuration;

        // Dodali smo IConfiguration da bismo mogli da pročitamo JWT ključ iz appsettings.json
        public TouristController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
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
                PasswordHash = PasswordHelper.Hash(dto.Password),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Tourists.Add(tourist);
            await _context.SaveChangesAsync();

            // Generišemo token odmah nakon uspešne registracije
            var token = GenerateJwtToken(tourist);

            return Ok(new
            {
                token = token, // Šaljemo token Angularu
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

            // Generišemo token prilikom logina
            var token = GenerateJwtToken(tourist);

            return Ok(new
            {
                token = token, // Šaljemo token Angularu
                tourist = new
                {
                    id = tourist.Id,
                    name = tourist.Name,
                    email = tourist.Email
                }
            });
        }

        // GET /api/tourists/profile
        [HttpGet("profile")]
        [Authorize] // Samo korisnici sa validnim tokenom mogu ovde!
        public async Task<IActionResult> GetProfile()
        {
            // Vadi Email iz tokena koji je poslat u zaglavlju
            var userEmail = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value
                         ?? User.Claims.FirstOrDefault(c => c.Type == "email")?.Value;

            if (string.IsNullOrEmpty(userEmail))
            {
                return Unauthorized(new { message = "Nevažeći token." });
            }

            // Tražimo baš tog korisnika u bazi
            var tourist = await _context.Tourists.FirstOrDefaultAsync(t => t.Email == userEmail);

            if (tourist == null)
            {
                return NotFound(new { message = "Korisnik nije pronađen." });
            }

            // Pravimo podatke specifično za njega
            var userProfile = new
            {
                fullName = tourist.Name, // Sada će pisati pravo ime (npr. Arsa)
                emailOrPhone = tourist.Email,
                language = "English", // Ovo za sad možemo da ostavimo fiksno
                interests = new[] { "nature", "nightlife" }, // I ovo ostavljamo za sad fiksno
                stats = new { saved = 0, tickets = 0, upcoming = 0 }
            };

            return Ok(userProfile);
        }

        // --- Pomoćna metoda za generisanje tokena ---
        private string GenerateJwtToken(Tourist tourist)
        {
            var secret = _configuration["Jwt:Secret"]
                ?? throw new InvalidOperationException("Jwt:Secret nije postavljen u appsettings.json");
            
            
            var key = Encoding.ASCII.GetBytes(secret);
            var issuer = _configuration["Jwt:Issuer"] ?? "TouristGuideApi";
            var audience = _configuration["Jwt:Audience"] ?? "TouristGuideClients";
            var expiresInHours = int.Parse(_configuration["Jwt:ExpiresInHours"] ?? "8");

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim("id", tourist.Id.ToString()),
                    new Claim(ClaimTypes.Email, tourist.Email),
                    new Claim(ClaimTypes.Name, tourist.Name)
                }),
                Expires = DateTime.UtcNow.AddHours(expiresInHours),
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }

    // ─── DTOs ─────────────
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