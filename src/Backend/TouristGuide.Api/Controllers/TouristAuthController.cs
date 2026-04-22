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
        private readonly AppDbContext _db;
        private readonly JwtService _jwtService;
        private readonly EmailService _emailService;
        private readonly IConfiguration _configuration;

        public TouristAuthController(
            AppDbContext db,
            JwtService jwtService,
            EmailService emailService,
            IConfiguration configuration)
        {
            _db = db;
            _jwtService = jwtService;
            _emailService = emailService;
            _configuration = configuration;
        }

        // POST /api/tourist-auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] TouristRegisterRequestDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            var emailExists = await _db.Tourists
                .AnyAsync(t => t.Email != null && t.Email.ToLower() == normalizedEmail);

            if (emailExists)
                return Conflict(new { message = "Turista sa ovim emailom vec postoji." });

            var verificationToken = Guid.NewGuid().ToString("N");
            var now = DateTime.UtcNow;

            var tourist = new Tourist
            {
                Name = request.Name.Trim(),
                Email = normalizedEmail,
                PasswordHash = PasswordHelper.Hash(request.Password),
                Language = string.IsNullOrWhiteSpace(request.Language) ? "en" : request.Language.Trim().ToLowerInvariant(),
                IsActive = true,
                IsEmailVerified = false,
                EmailVerificationToken = verificationToken,
                EmailVerificationTokenExpiresAt = now.AddHours(24),
                CreatedAt = now,
                UpdatedAt = now
            };

            _db.Tourists.Add(tourist);
            await _db.SaveChangesAsync();

            try
            {
                await _emailService.SendVerificationEmailAsync(
                    tourist.Email!,
                    tourist.Name ?? "Korisnik",
                    verificationToken);
            }
            catch (Exception) { /* greska pri emailu ne blokira registraciju */ }

            return Ok(new
            {
                message = "Registracija uspesna! Proverite email i potvrdite adresu pre prve prijave.",
                email = tourist.Email
            });
        }

        // GET /api/tourist-auth/verify-email?token=...
        [HttpGet("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromQuery] string token)
        {
            if (string.IsNullOrWhiteSpace(token))
                return BadRequest(new { message = "Token nije prosleden." });

            var tourist = await _db.Tourists
                .FirstOrDefaultAsync(t => t.EmailVerificationToken == token);

            if (tourist is null)
                return NotFound(new { message = "Token nije validan." });

            if (tourist.IsEmailVerified)
                return Ok(new { message = "Email je vec potvrdjen. Mozete se prijaviti." });

            if (tourist.EmailVerificationTokenExpiresAt < DateTime.UtcNow)
                return BadRequest(new
                {
                    message = "Token je istekao. Zatrazite novi verifikacioni email.",
                    expired = true
                });

            tourist.IsEmailVerified = true;
            tourist.EmailVerificationToken = null;
            tourist.EmailVerificationTokenExpiresAt = null;
            tourist.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new { message = "Email adresa je uspesno potvrdjena! Mozete se prijaviti." });
        }

        // POST /api/tourist-auth/resend-verification
        [HttpPost("resend-verification")]
        public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            var tourist = await _db.Tourists
                .FirstOrDefaultAsync(t => t.Email != null && t.Email.ToLower() == normalizedEmail);

            if (tourist is null || tourist.IsEmailVerified)
                return Ok(new { message = "Ako email postoji i nije potvrdjen, novi link je poslat." });

            tourist.EmailVerificationToken = Guid.NewGuid().ToString("N");
            tourist.EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddHours(24);
            tourist.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            try
            {
                await _emailService.SendVerificationEmailAsync(
                    tourist.Email!,
                    tourist.Name ?? "Korisnik",
                    tourist.EmailVerificationToken);
            }
            catch (Exception) { }

            return Ok(new { message = "Ako email postoji i nije potvrdjen, novi link je poslat." });
        }

        // POST /api/tourist-auth/login
        [HttpPost("login")]
        public async Task<ActionResult<TouristAuthResponseDto>> Login([FromBody] TouristLoginRequestDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            var tourist = await _db.Tourists
                .FirstOrDefaultAsync(t => t.Email != null && t.Email.ToLower() == normalizedEmail);

            if (tourist is null
                || string.IsNullOrWhiteSpace(tourist.PasswordHash)
                || !PasswordHelper.Verify(request.Password, tourist.PasswordHash))
                return Unauthorized(new { message = "Neispravan email ili lozinka." });

            if (!tourist.IsActive)
                return Unauthorized(new { message = "Nalog je deaktiviran." });

            if (!tourist.IsEmailVerified)
                return Unauthorized(new
                {
                    message = "Email adresa nije potvrdjena. Proverite inbox i kliknite na link za verifikaciju.",
                    emailNotVerified = true
                });

            tourist.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(await BuildAuthResponseAsync(tourist));
        }

        // GET /api/tourist-auth/me
        [Authorize(Roles = "tourist")]
        [HttpGet("me")]
        public async Task<ActionResult<TouristMeDto>> Me()
        {
            var touristId = GetTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            var tourist = await _db.Tourists
                .FirstOrDefaultAsync(t => t.Id == touristId.Value);

            if (tourist is null)
                return NotFound(new { message = "Turista nije pronadjen." });

            var savedCount = await _db.SavedPosts.CountAsync(sp => sp.TouristId == touristId.Value);
            var reviewCount = await _db.Reviews.CountAsync(r => r.TouristId == touristId.Value);

            return Ok(MapToMeDto(tourist, savedCount, reviewCount));
        }

        // GET /api/tourist-auth/saved-locations
        [Authorize(Roles = "tourist")]
        [HttpGet("saved-locations")]
        public async Task<ActionResult<List<SavedLocationDto>>> GetSavedLocations()
        {
            var touristId = GetTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            var saved = await _db.SavedPosts
                .Where(sp => sp.TouristId == touristId.Value)
                .Include(sp => sp.Post)
                .OrderByDescending(sp => sp.CreatedAt)
                .Select(sp => new SavedLocationDto
                {
                    SavedId = sp.Id,
                    PostId = sp.PostId,
                    Title = sp.Post.Title,
                    PostType = sp.Post.PostType,
                    Address = sp.Post.Address,
                    Lat = sp.Post.Lat,
                    Lng = sp.Post.Lng,
                    CoverImage = ExtractFirstImage(sp.Post.Images),
                    SavedAt = sp.CreatedAt
                })
                .ToListAsync();

            return Ok(saved);
        }

        // POST /api/tourist-auth/saved-locations/{postId}
        [Authorize(Roles = "tourist")]
        [HttpPost("saved-locations/{postId:int}")]
        public async Task<IActionResult> SaveLocation(int postId)
        {
            var touristId = GetTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            var postExists = await _db.Posts.AnyAsync(p => p.Id == (uint)postId);
            if (!postExists)
                return NotFound(new { message = "Objava nije pronadjena." });

            var alreadySaved = await _db.SavedPosts
                .AnyAsync(sp => sp.TouristId == touristId.Value && sp.PostId == (uint)postId);

            if (alreadySaved)
                return Conflict(new { message = "Lokacija je vec sacuvana." });

            _db.SavedPosts.Add(new SavedPost
            {
                TouristId = touristId.Value,
                PostId = (uint)postId,
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            return Ok(new { message = "Lokacija je uspesno sacuvana." });
        }

        // DELETE /api/tourist-auth/saved-locations/{postId}
        [Authorize(Roles = "tourist")]
        [HttpDelete("saved-locations/{postId:int}")]
        public async Task<IActionResult> RemoveSavedLocation(int postId)
        {
            var touristId = GetTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            var saved = await _db.SavedPosts
                .FirstOrDefaultAsync(sp => sp.TouristId == touristId.Value && sp.PostId == (uint)postId);

            if (saved is null)
                return NotFound(new { message = "Sacuvana lokacija nije pronadjena." });

            _db.SavedPosts.Remove(saved);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Lokacija je uklonjena iz sacuvanih." });
        }

        // ─── POMOCNE METODE ───────────────────────────────────────────────────

        private async Task<TouristAuthResponseDto> BuildAuthResponseAsync(Tourist tourist)
        {
            var expiresInHours = int.Parse(_configuration["Jwt:ExpiresInHours"] ?? "8");

            var token = _jwtService.GenerateToken(
                tourist.Id,
                tourist.Email ?? string.Empty,
                "tourist",
                null);

            var savedCount = await _db.SavedPosts.CountAsync(sp => sp.TouristId == tourist.Id);
            var reviewCount = await _db.Reviews.CountAsync(r => r.TouristId == tourist.Id);

            return new TouristAuthResponseDto
            {
                Token = token,
                ExpiresAtUtc = DateTime.UtcNow.AddHours(expiresInHours),
                User = MapToMeDto(tourist, savedCount, reviewCount)
            };
        }

        private static TouristMeDto MapToMeDto(Tourist tourist, int savedCount, int reviewCount) => new()
        {
            Id = tourist.Id,
            Name = tourist.Name ?? string.Empty,
            Email = tourist.Email ?? string.Empty,
            Language = tourist.Language,
            IsActive = tourist.IsActive,
            IsEmailVerified = tourist.IsEmailVerified,
            CreatedAt = tourist.CreatedAt,
            SavedPostsCount = savedCount,
            ReviewsCount = reviewCount
        };

        private uint? GetTouristId()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            return uint.TryParse(value, out var id) ? id : null;
        }

        private static string? ExtractFirstImage(string? imagesJson)
        {
            if (string.IsNullOrWhiteSpace(imagesJson)) return null;
            try
            {
                var urls = System.Text.Json.JsonSerializer.Deserialize<List<string>>(imagesJson);
                return urls?.FirstOrDefault();
            }
            catch { return null; }
        }
    }
}
