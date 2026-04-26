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
        private readonly ILogger<TouristAuthController> _logger;

        public TouristAuthController(
            AppDbContext db,
            JwtService jwtService,
            EmailService emailService,
            IConfiguration configuration,
            ILogger<TouristAuthController> logger)
        {
            _db = db;
            _jwtService = jwtService;
            _emailService = emailService;
            _configuration = configuration;
            _logger = logger;
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
                return Conflict(new { message = "An account with this email already exists." });

            // When SMTP is not configured (dev / local environment), auto-verify the email
            // so users can log in immediately without waiting for a verification link.
            var smtpConfigured = !string.IsNullOrWhiteSpace(_configuration["Email:SmtpHost"]);

            var verificationToken = smtpConfigured ? Guid.NewGuid().ToString("N") : null;
            var now = DateTime.UtcNow;

            var tourist = new Tourist
            {
                Name = request.Name.Trim(),
                Email = normalizedEmail,
                PasswordHash = PasswordHelper.Hash(request.Password),
                Language = string.IsNullOrWhiteSpace(request.Language) ? "en" : request.Language.Trim().ToLowerInvariant(),
                IsActive = true,
                IsEmailVerified = !smtpConfigured, // auto-verified when no SMTP
                EmailVerificationToken = verificationToken,
                EmailVerificationTokenExpiresAt = verificationToken != null ? now.AddHours(24) : null,
                CreatedAt = now,
                UpdatedAt = now
            };

            _db.Tourists.Add(tourist);
            await _db.SaveChangesAsync();

            // If SMTP is configured, send verification email and require user to verify
            if (smtpConfigured)
            {
                try
                {
                    await _emailService.SendVerificationEmailAsync(
                        tourist.Email!,
                        tourist.Name ?? "User",
                        verificationToken!);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send verification email to {Email}", tourist.Email);
                    // Email failure does not block registration
                }

                return Ok(new
                {
                    message = "Registration successful! Please check your email and confirm your address before logging in.",
                    email = tourist.Email
                });
            }

            // No SMTP configured — return a JWT token immediately so the user can log in right away
            _logger.LogInformation(
                "[DEV MODE] SMTP not configured. Auto-verified tourist {Email} (id={Id}).",
                tourist.Email, tourist.Id);

            return Ok(await BuildAuthResponseAsync(tourist));
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

        // DELETE /api/tourist-auth/account
        [Authorize(Roles = "tourist")]
        [HttpDelete("account")]
        public async Task<IActionResult> DeleteAccount()
        {
            var touristId = GetTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Not authenticated." });

            var tourist = await _db.Tourists.FirstOrDefaultAsync(t => t.Id == touristId.Value);
            if (tourist is null)
                return NotFound(new { message = "Account not found." });

            _db.Tourists.Remove(tourist);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Account permanently deleted." });
        }

        // PUT /api/tourist-auth/profile
        [Authorize(Roles = "tourist")]
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateTouristProfileDto dto)
        {
            var touristId = GetTouristId();
            if (touristId is null)
                return Unauthorized(new { message = "Not authenticated." });

            var tourist = await _db.Tourists.FirstOrDefaultAsync(t => t.Id == touristId.Value);
            if (tourist is null)
                return NotFound(new { message = "Tourist not found." });

            if (dto.Name is not null)
                tourist.Name = dto.Name.Trim();

            if (dto.Language is not null)
                tourist.Language = dto.Language.Trim().ToLowerInvariant();

            if (dto.Bio is not null)
                tourist.Bio = dto.Bio.Trim();

            if (dto.Location is not null)
                tourist.Location = dto.Location.Trim();

            if (dto.Interests is not null)
                tourist.Interests = System.Text.Json.JsonSerializer.Serialize(dto.Interests);

            tourist.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var savedCount  = await _db.SavedPosts.CountAsync(sp => sp.TouristId == touristId.Value);
            var reviewCount = await _db.Reviews.CountAsync(r => r.TouristId == touristId.Value);

            return Ok(MapToMeDto(tourist, savedCount, reviewCount));
        }

        // ─── CALENDAR (VisitPlanner) ──────────────────────────────────────────

        // GET /api/tourist-auth/calendar
        [Authorize(Roles = "tourist")]
        [HttpGet("calendar")]
        public async Task<IActionResult> GetCalendar()
        {
            var touristId = GetTouristId();
            if (touristId is null)
                return Unauthorized();

            // Find (or create) the tourist's single "My Calendar" planner
            var planner = await _db.VisitPlanners
                .FirstOrDefaultAsync(p => p.TouristId == touristId.Value);

            if (planner is null)
                return Ok(new List<object>());

            var items = await _db.PlannerItems
                .Where(pi => pi.PlannerId == planner.Id && pi.PostId != null)
                .Include(pi => pi.Post)
                .OrderBy(pi => pi.DayNumber).ThenBy(pi => pi.OrderInDay)
                .Select(pi => new
                {
                    id        = pi.Id,
                    postId    = pi.PostId,
                    title     = pi.Post != null ? pi.Post.Title : "(deleted)",
                    postType  = pi.Post != null ? pi.Post.PostType : "",
                    address   = pi.Post != null ? pi.Post.Address : "",
                    date      = pi.Post != null && pi.Post.PublishedAt != null
                                    ? pi.Post.PublishedAt.Value.ToString("MMMM d, yyyy")
                                    : "",
                    notes     = pi.Notes,
                    scheduledTime = pi.ScheduledTime != null ? pi.ScheduledTime.Value.ToString("HH:mm") : "",
                    imageUrl  = ExtractFirstImage(pi.Post != null ? pi.Post.Images : null)
                })
                .ToListAsync();

            return Ok(items);
        }

        // POST /api/tourist-auth/calendar/{postId}
        [Authorize(Roles = "tourist")]
        [HttpPost("calendar/{postId:int}")]
        public async Task<IActionResult> AddToCalendar(int postId)
        {
            var touristId = GetTouristId();
            if (touristId is null)
                return Unauthorized();

            var post = await _db.Posts.FindAsync((uint)postId);
            if (post is null)
                return NotFound(new { message = "Post not found." });

            // Get or create the tourist's "My Calendar" planner
            var planner = await _db.VisitPlanners
                .FirstOrDefaultAsync(p => p.TouristId == touristId.Value);

            if (planner is null)
            {
                planner = new VisitPlanner
                {
                    TouristId = touristId.Value,
                    Title     = "My Calendar",
                    IsPublic  = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.VisitPlanners.Add(planner);
                await _db.SaveChangesAsync();
            }

            // Don't add duplicates
            var alreadyAdded = await _db.PlannerItems
                .AnyAsync(pi => pi.PlannerId == planner.Id && pi.PostId == (uint)postId);

            if (alreadyAdded)
                return Ok(new { message = "Already in calendar.", alreadyAdded = true });

            var order = (byte)(await _db.PlannerItems.CountAsync(pi => pi.PlannerId == planner.Id) + 1);

            _db.PlannerItems.Add(new PlannerItem
            {
                PlannerId    = planner.Id,
                PostId       = (uint)postId,
                DayNumber    = 1,
                OrderInDay   = order,
                Notes        = null,
                ScheduledTime = null
            });

            await _db.SaveChangesAsync();
            return Ok(new { message = "Added to calendar." });
        }

        // DELETE /api/tourist-auth/calendar/{postId}
        [Authorize(Roles = "tourist")]
        [HttpDelete("calendar/{postId:int}")]
        public async Task<IActionResult> RemoveFromCalendar(int postId)
        {
            var touristId = GetTouristId();
            if (touristId is null)
                return Unauthorized();

            var planner = await _db.VisitPlanners
                .FirstOrDefaultAsync(p => p.TouristId == touristId.Value);

            if (planner is null)
                return NotFound(new { message = "Calendar not found." });

            var item = await _db.PlannerItems
                .FirstOrDefaultAsync(pi => pi.PlannerId == planner.Id && pi.PostId == (uint)postId);

            if (item is null)
                return NotFound(new { message = "Item not in calendar." });

            _db.PlannerItems.Remove(item);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Removed from calendar." });
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

        private static TouristMeDto MapToMeDto(Tourist tourist, int savedCount, int reviewCount)
        {
            // Parse interests from stored JSON string
            List<string> interests = new();
            if (!string.IsNullOrWhiteSpace(tourist.Interests))
            {
                try { interests = System.Text.Json.JsonSerializer.Deserialize<List<string>>(tourist.Interests) ?? new(); }
                catch { /* ignore malformed JSON */ }
            }

            return new TouristMeDto
            {
                Id             = tourist.Id,
                Name           = tourist.Name ?? string.Empty,
                Email          = tourist.Email ?? string.Empty,
                Language       = tourist.Language,
                Bio            = tourist.Bio,
                Location       = tourist.Location,
                ProfileImage   = tourist.ProfileImage,
                Interests      = interests,
                IsActive       = tourist.IsActive,
                IsEmailVerified = tourist.IsEmailVerified,
                CreatedAt      = tourist.CreatedAt,
                SavedPostsCount = savedCount,
                ReviewsCount   = reviewCount
            };
        }

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
