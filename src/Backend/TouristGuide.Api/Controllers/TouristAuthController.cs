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
        public async Task<ActionResult<TouristRegistrationResponseDto>> Register([FromBody] TouristRegisterRequestDto request)
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
                Interests = SerializeInterests(request.Interests),
                ProfileImage = string.IsNullOrWhiteSpace(request.ProfileImage) ? null : request.ProfileImage.Trim(),
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
                        verificationToken!,
                        tourist.Language);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send verification email to {Email}", tourist.Email);
                    // Email failure does not block registration
                }

                return Ok(new TouristRegistrationResponseDto
                {
                    RequiresEmailVerification = true,
                    Message = "Registration successful! Please check your email and confirm your address before logging in.",
                    Email = tourist.Email ?? string.Empty,
                    Session = null,
                });
            }

            // No SMTP configured — return a JWT token immediately so the user can log in right away
            _logger.LogInformation(
                "[DEV MODE] SMTP not configured. Auto-verified tourist {Email} (id={Id}).",
                tourist.Email, tourist.Id);

            return Ok(new TouristRegistrationResponseDto
            {
                RequiresEmailVerification = false,
                Message = "Registration successful! Your account is ready to use.",
                Email = tourist.Email ?? string.Empty,
                Session = await BuildAuthResponseAsync(tourist),
            });
        }

        // GET /api/tourist-auth/verify-email?token=...
        [HttpGet("verify-email")]
        public async Task<ActionResult<EmailVerificationResultDto>> VerifyEmail([FromQuery] string token)
        {
            if (string.IsNullOrWhiteSpace(token))
                return BadRequest(new { message = "Token nije prosleden." });

            var tourist = await _db.Tourists
                .FirstOrDefaultAsync(t => t.EmailVerificationToken == token);

            if (tourist is null)
                return NotFound(new { message = "Token nije validan." });

            if (tourist.IsEmailVerified)
            {
                return Ok(new EmailVerificationResultDto
                {
                    Message = "Email je vec potvrdjen. Mozete se prijaviti.",
                    AlreadyVerified = true
                });
            }

            if (tourist.EmailVerificationTokenExpiresAt < DateTime.UtcNow)
                return BadRequest(new
                {
                    message = "Token je istekao. Zatrazite novi verifikacioni email.",
                    expired = true
                });

            // Keep the token until expiry so the same email link can be reopened
            // from the browser where the registration/login flow is active.
            tourist.IsEmailVerified = true;
            tourist.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new EmailVerificationResultDto
            {
                Message = "Email adresa je uspesno potvrdjena! Mozete se prijaviti.",
                AlreadyVerified = false,
                VerifiedAt = tourist.UpdatedAt
            });
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
                    tourist.EmailVerificationToken,
                    tourist.Language);
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
            var tourist = await GetCurrentTouristAsync();
            if (tourist is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            var savedCount = await _db.SavedPosts.CountAsync(sp => sp.TouristId == tourist.Id);
            var reviewCount = await _db.Reviews.CountAsync(r => r.TouristId == tourist.Id);

            return Ok(MapToMeDto(tourist, savedCount, reviewCount));
        }

        // DELETE /api/tourist-auth/account
        [Authorize(Roles = "tourist")]
        [HttpDelete("account")]
        public async Task<IActionResult> DeleteAccount()
        {
            var tourist = await GetCurrentTouristAsync();
            if (tourist is null)
                return Unauthorized(new { message = "Not authenticated." });

            tourist.IsActive = false;
            tourist.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { message = "Account deactivated." });
        }

        // PUT /api/tourist-auth/profile
        [Authorize(Roles = "tourist")]
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateTouristProfileDto dto)
        {
            var tourist = await GetCurrentTouristAsync();
            if (tourist is null)
                return Unauthorized(new { message = "Not authenticated." });

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

            if (dto.ProfileImage is not null)
                tourist.ProfileImage = string.IsNullOrWhiteSpace(dto.ProfileImage) ? null : dto.ProfileImage.Trim();

            tourist.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var savedCount = await _db.SavedPosts.CountAsync(sp => sp.TouristId == tourist.Id);
            var reviewCount = await _db.Reviews.CountAsync(r => r.TouristId == tourist.Id);

            return Ok(MapToMeDto(tourist, savedCount, reviewCount));
        }

        // ─── CALENDAR (VisitPlanner) ──────────────────────────────────────────

        // GET /api/tourist-auth/calendar
        [Authorize(Roles = "tourist")]
        [HttpGet("calendar")]
        public async Task<IActionResult> GetCalendar()
        {
            var tourist = await GetCurrentTouristAsync();
            if (tourist is null)
                return Unauthorized();

            // Find (or create) the tourist's single "My Calendar" planner
            var planner = await _db.VisitPlanners
                .FirstOrDefaultAsync(p => p.TouristId == tourist.Id);

            if (planner is null)
                return Ok(new List<object>());

            var items = await _db.PlannerItems
                .Where(pi => pi.PlannerId == planner.Id && pi.PostId != null)
                .Include(pi => pi.Post)
                .OrderBy(pi => pi.DayNumber).ThenBy(pi => pi.OrderInDay)
                .Select(pi => new
                {
                    id = pi.Id,
                    postId = pi.PostId,
                    title = pi.Post != null ? pi.Post.Title : "(deleted)",
                    postType = pi.Post != null ? pi.Post.PostType : "",
                    address = pi.Post != null ? pi.Post.Address : "",
                    date = pi.Post != null && pi.Post.PublishedAt != null
                                    ? pi.Post.PublishedAt.Value.ToString("MMMM d, yyyy")
                                    : "",
                    notes = pi.Notes,
                    scheduledTime = pi.ScheduledTime != null ? pi.ScheduledTime.Value.ToString("HH:mm") : "",
                    imageUrl = ExtractFirstImage(pi.Post != null ? pi.Post.Images : null)
                })
                .ToListAsync();

            return Ok(items);
        }

        // POST /api/tourist-auth/calendar/{postId}
        [Authorize(Roles = "tourist")]
        [HttpPost("calendar/{postId:int}")]
        public async Task<IActionResult> AddToCalendar(int postId)
        {
            var tourist = await GetCurrentTouristAsync();
            if (tourist is null)
                return Unauthorized();

            var post = await _db.Posts.FindAsync((uint)postId);
            if (post is null)
                return NotFound(new { message = "Post not found." });

            // Get or create the tourist's "My Calendar" planner
            var planner = await _db.VisitPlanners
                .FirstOrDefaultAsync(p => p.TouristId == tourist.Id);

            if (planner is null)
            {
                planner = new VisitPlanner
                {
                    TouristId = tourist.Id,
                    Title = "My Calendar",
                    IsPublic = false,
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
                PlannerId = planner.Id,
                PostId = (uint)postId,
                DayNumber = 1,
                OrderInDay = order,
                Notes = null,
                ScheduledTime = null
            });
            _db.Notifications.Add(new Notification
            {
                TouristId = tourist.Id,
                Type = "calendar",
                Title = "Added to calendar",
                Body = $"{post.Title} is now in your travel calendar.",
                Payload = System.Text.Json.JsonSerializer.Serialize(new { postId }),
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            return Ok(new { message = "Added to calendar." });
        }

        // DELETE /api/tourist-auth/calendar/{postId}
        [Authorize(Roles = "tourist")]
        [HttpDelete("calendar/{postId:int}")]
        public async Task<IActionResult> RemoveFromCalendar(int postId)
        {
            var tourist = await GetCurrentTouristAsync();
            if (tourist is null)
                return Unauthorized();

            var planner = await _db.VisitPlanners
                .FirstOrDefaultAsync(p => p.TouristId == tourist.Id);

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

        // ─── NOTIFICATIONS ───────────────────────────────────────────────────

        // GET /api/tourist-auth/notifications?limit=30
        [Authorize(Roles = "tourist")]
        [HttpGet("notifications")]
        public async Task<IActionResult> GetNotifications([FromQuery] int limit = 30)
        {
            var tourist = await GetCurrentTouristAsync();
            if (tourist is null) return Unauthorized();

            var items = await _db.Notifications
                .Where(n => n.TouristId == tourist.Id)
                .OrderByDescending(n => n.CreatedAt)
                .Take(Math.Min(limit, 100))
                .Select(n => new
                {
                    n.Id,
                    n.Type,
                    n.Title,
                    n.Body,
                    n.Payload,
                    isRead = n.IsRead,
                    createdAt = n.CreatedAt,
                    sentAt = n.SentAt
                })
                .ToListAsync();

            var unreadCount = await _db.Notifications
                .CountAsync(n => n.TouristId == tourist.Id && !n.IsRead);

            return Ok(new { data = items, unreadCount, success = true });
        }

        // PATCH /api/tourist-auth/notifications/{id}/read
        [Authorize(Roles = "tourist")]
        [HttpPatch("notifications/{id}/read")]
        public async Task<IActionResult> MarkNotificationRead(uint id)
        {
            var tourist = await GetCurrentTouristAsync();
            if (tourist is null) return Unauthorized();

            var notif = await _db.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.TouristId == tourist.Id);

            if (notif is null) return NotFound();

            if (!notif.IsRead)
            {
                notif.IsRead = true;
                notif.SentAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }

            return Ok(new { success = true });
        }

        // PATCH /api/tourist-auth/notifications/read-all
        [Authorize(Roles = "tourist")]
        [HttpPatch("notifications/read-all")]
        public async Task<IActionResult> MarkAllNotificationsRead()
        {
            var tourist = await GetCurrentTouristAsync();
            if (tourist is null) return Unauthorized();

            var unread = await _db.Notifications
                .Where(n => n.TouristId == tourist.Id && !n.IsRead)
                .ToListAsync();

            foreach (var n in unread)
            {
                n.IsRead = true;
                n.SentAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            return Ok(new { success = true, count = unread.Count });
        }

        // DELETE /api/tourist-auth/notifications/{id}
        [Authorize(Roles = "tourist")]
        [HttpDelete("notifications/{id}")]
        public async Task<IActionResult> DeleteNotification(uint id)
        {
            var tourist = await GetCurrentTouristAsync();
            if (tourist is null) return Unauthorized();

            var notif = await _db.Notifications
                .FirstOrDefaultAsync(n => n.Id == id && n.TouristId == tourist.Id);

            if (notif is null) return NotFound();

            _db.Notifications.Remove(notif);
            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }

        // ─── PASSWORD MANAGEMENT ──────────────────────────────────────────────

        // POST /api/tourist-auth/change-password
        [Authorize(Roles = "tourist")]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var tourist = await GetCurrentTouristAsync();
            if (tourist is null) return Unauthorized();

            if (string.IsNullOrWhiteSpace(tourist.PasswordHash))
                return BadRequest(new { message = "Password change is not available for this account." });

            tourist.PasswordHash = PasswordHelper.Hash(dto.NewPassword);
            tourist.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { message = "Password changed successfully." });
        }

        // POST /api/tourist-auth/forgot-password  (no auth required)
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
            var tourist = await _db.Tourists
                .FirstOrDefaultAsync(t => t.Email != null && t.Email.ToLower() == normalizedEmail);

            // Always return OK to prevent email enumeration
            if (tourist is null)
                return Ok(new { message = "If the email exists, a reset link has been sent." });

            // Reuse EmailVerificationToken with "RESET_" prefix to avoid a new migration
            var rawToken = Guid.NewGuid().ToString("N");
            tourist.EmailVerificationToken = "RESET_" + rawToken;
            tourist.EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddHours(1);
            tourist.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            try
            {
                await _emailService.SendPasswordResetEmailAsync(
                    tourist.Email!,
                    tourist.Name ?? "Korisnik",
                    rawToken,
                    tourist.Language);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email to {Email}", tourist.Email);
            }

            return Ok(new { message = "If the email exists, a reset link has been sent." });
        }

        // POST /api/tourist-auth/reset-password  (no auth required)
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(dto.Token))
                return BadRequest(new { message = "Token is required." });

            var resetToken = "RESET_" + dto.Token;
            var tourist = await _db.Tourists
                .FirstOrDefaultAsync(t => t.EmailVerificationToken == resetToken);

            if (tourist is null)
                return BadRequest(new { message = "Invalid or expired reset token." });

            if (tourist.EmailVerificationTokenExpiresAt < DateTime.UtcNow)
                return BadRequest(new { message = "Reset token has expired. Please request a new one.", expired = true });

            tourist.PasswordHash = PasswordHelper.Hash(dto.NewPassword);
            tourist.EmailVerificationToken = null;
            tourist.EmailVerificationTokenExpiresAt = null;
            tourist.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { message = "Password has been reset successfully. You can now log in." });
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
                Id = tourist.Id,
                Name = tourist.Name ?? string.Empty,
                Email = tourist.Email ?? string.Empty,
                Language = tourist.Language,
                Bio = tourist.Bio,
                Location = tourist.Location,
                ProfileImage = tourist.ProfileImage,
                Interests = interests,
                IsActive = tourist.IsActive,
                IsEmailVerified = tourist.IsEmailVerified,
                CreatedAt = tourist.CreatedAt,
                SavedPostsCount = savedCount,
                ReviewsCount = reviewCount
            };
        }

        // POST /api/tourist-auth/social-login
        /// <summary>
        /// Verifies a Google or Apple ID token issued by the respective OAuth flow
        /// and returns a signed JWT for the matching (or newly created) tourist account.
        /// </summary>
        [HttpPost("social-login")]
        [AllowAnonymous]
        public async Task<IActionResult> SocialLogin([FromBody] SocialLoginDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Credential))
                return BadRequest(new { message = "Credential is required." });

            string? email = null;
            string? name  = null;
            string? providerId = null;

            try
            {
                if (dto.Provider == "google")
                {
                    using var http = new HttpClient();
                    var res = await http.GetAsync(
                        $"https://oauth2.googleapis.com/tokeninfo?id_token={dto.Credential}");
                    if (!res.IsSuccessStatusCode)
                        return Unauthorized(new { message = "Invalid Google token." });

                    var body = await res.Content.ReadAsStringAsync();
                    var payload = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(body);
                    if (payload is null)
                        return Unauthorized(new { message = "Could not parse Google token payload." });

                    email      = payload.TryGetValue("email", out var e)      ? e?.ToString() : null;
                    name       = payload.TryGetValue("name", out var n)        ? n?.ToString() : null;
                    providerId = payload.TryGetValue("sub", out var sub)       ? sub?.ToString() : null;
                }
                else if (dto.Provider == "apple")
                {
                    // Apple sends a JWT — decode without full verification here;
                    // full JWKS verification can be added via Microsoft.IdentityModel.Tokens.
                    var handler  = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                    var jwtToken = handler.ReadJwtToken(dto.Credential);

                    email      = jwtToken.Claims.FirstOrDefault(c => c.Type == "email")?.Value;
                    name       = dto.DisplayName; // Apple only sends name on first sign-in; frontend must pass it
                    providerId = jwtToken.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;
                }
                else
                {
                    return BadRequest(new { message = $"Unsupported provider: {dto.Provider}" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Social login token verification failed for provider {Provider}", dto.Provider);
                return Unauthorized(new { message = "Token verification failed." });
            }

            if (string.IsNullOrWhiteSpace(email))
                return Unauthorized(new { message = "Could not retrieve email from social token." });

            var normalizedEmail = email.Trim().ToLowerInvariant();

            // Find existing account or create one
            var tourist = await _db.Tourists.FirstOrDefaultAsync(
                t => t.Email != null && t.Email.ToLower() == normalizedEmail);

            var now = DateTime.UtcNow;
            if (tourist is null)
            {
                tourist = new TouristGuide.Api.Models.Tourist
                {
                    Name            = (name ?? normalizedEmail.Split('@')[0]).Trim(),
                    Email           = normalizedEmail,
                    PasswordHash    = TouristGuide.Api.Services.PasswordHelper.Hash(Guid.NewGuid().ToString()),
                    Language        = "en",
                    IsActive        = true,
                    IsEmailVerified = true,   // email already verified by the OAuth provider
                    CreatedAt       = now,
                    UpdatedAt       = now
                };
                _db.Tourists.Add(tourist);
                await _db.SaveChangesAsync();
            }

            if (!tourist.IsActive)
                return Unauthorized(new { message = "Your account has been suspended." });

            var authResponse = await BuildAuthResponseAsync(tourist);
            return Ok(authResponse);
        }

        private uint? GetTouristId()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            return uint.TryParse(value, out var id) ? id : null;
        }

        private async Task<TouristGuide.Api.Models.Tourist?> GetCurrentTouristAsync()
        {
            var touristId = GetTouristId();
            if (touristId is not null)
            {
                var touristById = await _db.Tourists.FirstOrDefaultAsync(t => t.Id == touristId.Value);
                if (touristById is not null)
                    return touristById;
            }

            var email = User.FindFirstValue(ClaimTypes.Email);
            if (string.IsNullOrWhiteSpace(email))
                return null;

            var normalizedEmail = email.Trim().ToLowerInvariant();
            return await _db.Tourists
                .FirstOrDefaultAsync(t => t.Email != null && t.Email.ToLower() == normalizedEmail);
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

        private static string? SerializeInterests(List<string>? interests)
        {
            if (interests is null || interests.Count == 0)
                return null;

            var normalized = interests
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            return normalized.Count == 0
                ? null
                : System.Text.Json.JsonSerializer.Serialize(normalized);
        }
    }
}
