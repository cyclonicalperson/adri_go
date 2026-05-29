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
        private readonly TouristNotificationService _touristNotificationService;
        private readonly RouteSafetyService _routeSafetyService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<TouristAuthController> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        public TouristAuthController(
            AppDbContext db,
            JwtService jwtService,
            EmailService emailService,
            TouristNotificationService touristNotificationService,
            RouteSafetyService routeSafetyService,
            IConfiguration configuration,
            ILogger<TouristAuthController> logger,
            IHttpClientFactory httpClientFactory)
        {
            _db = db;
            _jwtService = jwtService;
            _emailService = emailService;
            _touristNotificationService = touristNotificationService;
            _routeSafetyService = routeSafetyService;
            _configuration = configuration;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        // POST /api/tourist-auth/register
        [HttpPost("register")]
        public async Task<ActionResult<TouristRegistrationResponseDto>> Register([FromBody] TouristRegisterRequestDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (PasswordPolicy.GetValidationError(request.Password) is { } passwordError)
                return BadRequest(new { message = passwordError });

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            var emailExists = await _db.Tourists
                .AnyAsync(t => t.Email != null && t.Email.ToLower() == normalizedEmail);

            if (emailExists)
                return Conflict(new { message = "An account with this email already exists." });

            // When SMTP is not configured (dev / local environment), auto-verify the email
            // so users can log in immediately without waiting for a verification link.
            var smtpConfigured = _emailService.IsConfigured;

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

            var emailChangeTourist = await _db.Tourists
                .FirstOrDefaultAsync(t => t.PendingEmailVerificationToken == token);

            if (emailChangeTourist is not null)
            {
                if (emailChangeTourist.PendingEmailVerificationTokenExpiresAt is null ||
                    emailChangeTourist.PendingEmailVerificationTokenExpiresAt < DateTime.UtcNow)
                    return BadRequest(new
                    {
                        message = "Token za promenu emaila je istekao. Pokrenite promenu ponovo.",
                        expired = true
                    });

                if (string.IsNullOrWhiteSpace(emailChangeTourist.PendingEmail))
                    return BadRequest(new { message = "Novi email nije pronadjen za ovaj token." });

                var pendingEmail = emailChangeTourist.PendingEmail.Trim().ToLowerInvariant();
                if (await _db.Tourists.AnyAsync(t => t.Id != emailChangeTourist.Id && t.Email != null && t.Email.ToLower() == pendingEmail))
                    return Conflict(new { message = "Email adresa je vec zauzeta." });

                emailChangeTourist.Email = pendingEmail;
                emailChangeTourist.PendingEmail = null;
                emailChangeTourist.PendingEmailVerificationToken = null;
                emailChangeTourist.PendingEmailVerificationTokenExpiresAt = null;
                emailChangeTourist.IsEmailVerified = true;
                emailChangeTourist.UpdatedAt = DateTime.UtcNow;

                await _db.SaveChangesAsync();

                return Ok(new EmailVerificationResultDto
                {
                    Message = "Nova email adresa je uspesno potvrdjena.",
                    AlreadyVerified = false,
                    EmailChange = true,
                    Email = pendingEmail,
                    VerifiedAt = emailChangeTourist.UpdatedAt
                });
            }

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

            if (PasswordHelper.NeedsRehash(tourist.PasswordHash))
            {
                tourist.PasswordHash = PasswordHelper.Hash(request.Password);
            }

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

        // GET /api/tourist-auth/my-reviews
        [Authorize(Roles = "tourist")]
        [HttpGet("my-reviews")]
        public async Task<IActionResult> GetMyReviews()
        {
            var tourist = await GetCurrentTouristAsync();
            if (tourist is null)
                return Unauthorized(new { message = "Turista nije autentifikovan." });

            var reviews = await _db.Reviews
                .AsNoTracking()
                .Where(r => r.TouristId == tourist.Id)
                .Include(r => r.Post)
                .Include(r => r.Route)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new TouristReviewItemDto
                {
                    ReviewId = r.Id,
                    PostId = r.PostId,
                    RouteId = r.RouteId,
                    EntityTitle = r.Post != null
                        ? r.Post.Title
                        : r.Route != null
                            ? r.Route.Name
                            : "(deleted)",
                    Rating = r.Rating,
                    Comment = r.Comment,
                    CreatedAt = r.CreatedAt,
                    Status = r.Status,
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                total = reviews.Count,
                data = reviews,
            });
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

            if (!string.IsNullOrWhiteSpace(dto.Email))
            {
                var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
                var currentEmail = tourist.Email?.Trim().ToLowerInvariant();

                if (!string.Equals(normalizedEmail, currentEmail, StringComparison.OrdinalIgnoreCase))
                {
                    if (await _db.Tourists.AnyAsync(t => t.Id != tourist.Id && t.Email != null && t.Email.ToLower() == normalizedEmail))
                        return Conflict(new { message = "Email adresa je vec zauzeta." });

                    var token = Guid.NewGuid().ToString("N");
                    tourist.PendingEmail = normalizedEmail;
                    tourist.PendingEmailVerificationToken = token;
                    tourist.PendingEmailVerificationTokenExpiresAt = DateTime.UtcNow.AddHours(24);

                    try
                    {
                        await _emailService.SendEmailChangeVerificationEmailAsync(
                            normalizedEmail,
                            tourist.Name ?? "Korisnik",
                            token,
                            tourist.Language);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send email change verification to {Email}", normalizedEmail);
                    }
                }
            }

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

            var plannerItems = await _db.PlannerItems
                .Where(pi => pi.PlannerId == planner.Id
                    && (pi.PostId != null || pi.RouteId != null || pi.TouristRouteId != null))
                .Include(pi => pi.Post)
                .Include(pi => pi.Route)
                    .ThenInclude(r => r!.Region)
                .Include(pi => pi.TouristRoute)
                .OrderBy(pi => pi.DayNumber).ThenBy(pi => pi.OrderInDay)
                .ToListAsync();

            var items = plannerItems.Select(pi =>
            {
                var scheduledDate = GetCalendarItemDate(pi)
                    ?? planner.StartDate?.AddDays(Math.Max(0, pi.DayNumber - 1));
                var scheduledTime = pi.ScheduledTime != null ? pi.ScheduledTime.Value.ToString("HH:mm") : "";

                if (pi.RouteId != null)
                {
                    return new
                    {
                        id = pi.Id,
                        postId = (uint?)null,
                        routeId = (uint?)pi.RouteId,
                        touristRouteId = (uint?)null,
                        title = pi.Route?.Name ?? "(deleted route)",
                        postType = "route",
                        address = pi.Route?.Region?.Name ?? "",
                        date = scheduledDate != null
                            ? scheduledDate.Value.ToDateTime(TimeOnly.MinValue).ToString("yyyy-MM-dd")
                            : "",
                        notes = pi.Notes,
                        scheduledTime,
                        imageUrl = ExtractFirstImage(pi.Route != null ? pi.Route.Images : null)
                    };
                }

                if (pi.TouristRouteId != null)
                {
                    return new
                    {
                        id = pi.Id,
                        postId = (uint?)null,
                        routeId = (uint?)null,
                        touristRouteId = (uint?)pi.TouristRouteId,
                        title = pi.TouristRoute?.Title ?? "(deleted route)",
                        postType = "private-route",
                        address = "",
                        date = scheduledDate != null
                            ? scheduledDate.Value.ToDateTime(TimeOnly.MinValue).ToString("yyyy-MM-dd")
                            : "",
                        notes = pi.Notes,
                        scheduledTime,
                        imageUrl = pi.TouristRoute?.ImageUrl
                    };
                }

                return new
                {
                    id = pi.Id,
                    postId = (uint?)pi.PostId,
                    routeId = (uint?)null,
                    touristRouteId = (uint?)null,
                    title = pi.Post?.Title ?? "(deleted)",
                    postType = pi.Post?.PostType ?? "",
                    address = pi.Post?.Address ?? "",
                    date = scheduledDate != null
                        ? scheduledDate.Value.ToDateTime(TimeOnly.MinValue).ToString("yyyy-MM-dd")
                        : pi.Post != null && pi.Post.PublishedAt != null
                            ? pi.Post.PublishedAt.Value.ToString("yyyy-MM-dd")
                                    : "",
                    notes = pi.Notes,
                    scheduledTime,
                    imageUrl = ExtractFirstImage(pi.Post != null ? pi.Post.Images : null)
                };
            }).ToList();

            return Ok(items);
        }

        // POST /api/tourist-auth/calendar/{postId}
        [Authorize(Roles = "tourist")]
        [HttpPost("calendar/{postId:int}")]
        public async Task<IActionResult> AddToCalendar(int postId, [FromBody] AddCalendarItemDto? request)
        {
            var tourist = await GetCurrentTouristAsync();
            if (tourist is null)
                return Unauthorized();

            var post = await _db.Posts.FindAsync((uint)postId);
            if (post is null)
                return NotFound(new { message = "Post not found." });

            var scheduledAt = request?.ScheduledAt;
            if (scheduledAt is null)
                return BadRequest(new { message = "Scheduled date and time are required." });

            var scheduledLocal = scheduledAt.Value;
            if (scheduledLocal < DateTime.Now)
                return BadRequest(new { message = "Scheduled date and time must be in the future." });

            if (string.Equals(post.PostType, "event", StringComparison.OrdinalIgnoreCase))
            {
                var details = EventDetails.FromJson(post.Details);
                if (details?.EndAt is not null && details.EndAt.Value < DateTime.Now)
                    return BadRequest(new { message = "This event has already ended." });

                if (details?.StartAt is not null && scheduledLocal < details.StartAt.Value)
                    return BadRequest(new { message = "Scheduled date and time must be after the event starts." });

                if (details?.EndAt is not null && scheduledLocal > details.EndAt.Value)
                    return BadRequest(new { message = "Scheduled date and time must be before the event ends." });
            }

            // Get or create the tourist's "My Calendar" planner
            var planner = await _db.VisitPlanners
                .FirstOrDefaultAsync(p => p.TouristId == tourist.Id);

            if (planner is null)
            {
                planner = new VisitPlanner
                {
                    TouristId = tourist.Id,
                    Title = "My Calendar",
                    StartDate = DateOnly.FromDateTime(scheduledLocal),
                    EndDate = DateOnly.FromDateTime(scheduledLocal),
                    IsPublic = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.VisitPlanners.Add(planner);
                await _db.SaveChangesAsync();
            }

            var scheduledDate = DateOnly.FromDateTime(scheduledLocal);
            if (planner.StartDate is null || scheduledDate < planner.StartDate.Value)
            {
                var shiftDays = planner.StartDate is null ? 0 : planner.StartDate.Value.DayNumber - scheduledDate.DayNumber;
                if (shiftDays > 0)
                {
                    var existingItems = await _db.PlannerItems
                        .Where(pi => pi.PlannerId == planner.Id)
                        .ToListAsync();

                    foreach (var item in existingItems)
                        item.DayNumber = (byte)Math.Clamp(item.DayNumber + shiftDays, 1, byte.MaxValue);
                }

                planner.StartDate = scheduledDate;
            }

            if (planner.EndDate is null || scheduledDate > planner.EndDate.Value)
                planner.EndDate = scheduledDate;

            planner.UpdatedAt = DateTime.UtcNow;
            var dayNumber = (byte)Math.Clamp(scheduledDate.DayNumber - planner.StartDate.Value.DayNumber + 1, 1, byte.MaxValue);

            // Treat as duplicate only when the same post is scheduled on the same date.
            // Different dates produce a new calendar entry so a destination can appear on multiple days.
            var notesForDate = BuildCalendarItemNotes(scheduledDate);
            var existingItem = await _db.PlannerItems
                .FirstOrDefaultAsync(pi => pi.PlannerId == planner.Id
                    && pi.PostId == (uint)postId
                    && pi.Notes == notesForDate);

            if (existingItem is not null)
            {
                existingItem.DayNumber = dayNumber;
                existingItem.Notes = notesForDate;
                existingItem.ScheduledTime = TimeOnly.FromDateTime(scheduledLocal);
                await _db.SaveChangesAsync();
                return Ok(new { message = "Calendar item updated.", alreadyAdded = true, updated = true });
            }

            var order = (byte)(await _db.PlannerItems.CountAsync(pi => pi.PlannerId == planner.Id) + 1);

            _db.PlannerItems.Add(new PlannerItem
            {
                PlannerId = planner.Id,
                PostId = (uint)postId,
                DayNumber = dayNumber,
                OrderInDay = order,
                Notes = notesForDate,
                ScheduledTime = TimeOnly.FromDateTime(scheduledLocal)
            });
            var notification = await _touristNotificationService.QueueCalendarItemAddedAsync(tourist.Id, post.Id, post.Title);

            await _db.SaveChangesAsync();
            await _touristNotificationService.DispatchAsync(notification);
            return Ok(new { message = "Added to calendar." });
        }

        // GET /api/tourist-auth/tourist-routes/{id}
        [Authorize(Roles = "tourist")]
        [HttpGet("tourist-routes/{id:int}")]
        public async Task<IActionResult> GetTouristRoute(int id)
        {
            var tourist = await GetCurrentTouristAsync();
            if (tourist is null)
                return Unauthorized();

            var route = await _db.TouristRoutes
                .FirstOrDefaultAsync(r => r.Id == (uint)id && r.TouristId == tourist.Id);
            if (route is null)
                return NotFound(new { message = "Private route not found." });

            return Ok(new
            {
                id = route.Id,
                title = route.Title,
                waypoints = route.Waypoints,
                travelMode = route.TravelMode,
                scenicMode = route.ScenicMode,
                distanceKm = route.DistanceKm,
                durationMin = route.DurationMin
            });
        }

        // POST /api/tourist-auth/calendar/tourist-route
        // Saves a tourist's own (private) route as a single calendar object. Creates the
        // tourist_route row on first save, or reuses it when TouristRouteId is supplied.
        [Authorize(Roles = "tourist")]
        [HttpPost("calendar/tourist-route")]
        public async Task<IActionResult> AddTouristRouteToCalendar([FromBody] AddTouristRouteCalendarDto? request)
        {
            var tourist = await GetCurrentTouristAsync();
            if (tourist is null)
                return Unauthorized();

            if (request is null)
                return BadRequest(new { message = "Route details are required." });

            var scheduledAt = request.ScheduledAt;
            if (scheduledAt is null)
                return BadRequest(new { message = "Scheduled date and time are required." });

            var scheduledLocal = scheduledAt.Value;
            if (scheduledLocal < DateTime.Now)
                return BadRequest(new { message = "Scheduled date and time must be in the future." });

            TouristRoute route;
            if (request.TouristRouteId is not null)
            {
                var existing = await _db.TouristRoutes
                    .FirstOrDefaultAsync(r => r.Id == request.TouristRouteId.Value && r.TouristId == tourist.Id);
                if (existing is null)
                    return NotFound(new { message = "Private route not found." });
                route = existing;
            }
            else
            {
                if (string.IsNullOrWhiteSpace(request.Title))
                    return BadRequest(new { message = "Route title is required." });

                var routeValidation = await _routeSafetyService.ValidateWaypointsJsonAsync(request.Waypoints, HttpContext.RequestAborted);
                if (!routeValidation.IsValid)
                    return BadRequest(new { message = routeValidation.Message });

                route = new TouristRoute
                {
                    TouristId = tourist.Id,
                    Title = request.Title.Trim(),
                    Waypoints = request.Waypoints,
                    TravelMode = NormalizeTravelMode(request.TravelMode),
                    ScenicMode = request.ScenicMode,
                    DistanceKm = request.DistanceKm,
                    DurationMin = request.DurationMin,
                    CreatedAt = DateTime.UtcNow
                };

                // Cover image = first image of the route's first stop.
                var coverPostId = ExtractFirstWaypointPostId(request.Waypoints);
                if (coverPostId is not null)
                {
                    var coverPost = await _db.Posts.FindAsync(coverPostId.Value);
                    route.ImageUrl = ExtractFirstImage(coverPost?.Images);
                }

                _db.TouristRoutes.Add(route);
                await _db.SaveChangesAsync();
            }

            // Get or create the tourist's "My Calendar" planner
            var planner = await _db.VisitPlanners
                .FirstOrDefaultAsync(p => p.TouristId == tourist.Id);

            if (planner is null)
            {
                planner = new VisitPlanner
                {
                    TouristId = tourist.Id,
                    Title = "My Calendar",
                    StartDate = DateOnly.FromDateTime(scheduledLocal),
                    EndDate = DateOnly.FromDateTime(scheduledLocal),
                    IsPublic = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.VisitPlanners.Add(planner);
                await _db.SaveChangesAsync();
            }

            var scheduledDate = DateOnly.FromDateTime(scheduledLocal);
            if (planner.StartDate is null || scheduledDate < planner.StartDate.Value)
            {
                var shiftDays = planner.StartDate is null ? 0 : planner.StartDate.Value.DayNumber - scheduledDate.DayNumber;
                if (shiftDays > 0)
                {
                    var existingItems = await _db.PlannerItems
                        .Where(pi => pi.PlannerId == planner.Id)
                        .ToListAsync();

                    foreach (var item in existingItems)
                        item.DayNumber = (byte)Math.Clamp(item.DayNumber + shiftDays, 1, byte.MaxValue);
                }

                planner.StartDate = scheduledDate;
            }

            if (planner.EndDate is null || scheduledDate > planner.EndDate.Value)
                planner.EndDate = scheduledDate;

            planner.UpdatedAt = DateTime.UtcNow;
            var dayNumber = (byte)Math.Clamp(scheduledDate.DayNumber - planner.StartDate.Value.DayNumber + 1, 1, byte.MaxValue);

            // Same private route on the same date is a duplicate; different dates produce a new entry.
            var notesForDate = BuildCalendarItemNotes(scheduledDate);
            var existingRouteItem = await _db.PlannerItems
                .FirstOrDefaultAsync(pi => pi.PlannerId == planner.Id
                    && pi.TouristRouteId == route.Id
                    && pi.Notes == notesForDate);

            if (existingRouteItem is not null)
            {
                existingRouteItem.DayNumber = dayNumber;
                existingRouteItem.Notes = notesForDate;
                existingRouteItem.ScheduledTime = TimeOnly.FromDateTime(scheduledLocal);
                await _db.SaveChangesAsync();
                return Ok(new { message = "Calendar item updated.", alreadyAdded = true, updated = true, touristRouteId = route.Id });
            }

            var order = (byte)(await _db.PlannerItems.CountAsync(pi => pi.PlannerId == planner.Id) + 1);

            _db.PlannerItems.Add(new PlannerItem
            {
                PlannerId = planner.Id,
                TouristRouteId = route.Id,
                DayNumber = dayNumber,
                OrderInDay = order,
                Notes = notesForDate,
                ScheduledTime = TimeOnly.FromDateTime(scheduledLocal)
            });
            _db.Notifications.Add(new Notification
            {
                TouristId = tourist.Id,
                Type = "calendar",
                Title = "Added to calendar",
                Body = $"{route.Title} is now in your travel calendar.",
                Payload = System.Text.Json.JsonSerializer.Serialize(new { touristRouteId = route.Id }),
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            return Ok(new { message = "Added to calendar.", touristRouteId = route.Id });
        }

        // DELETE /api/tourist-auth/calendar/item/{itemId}
        // The planner item id is the primary key, so it identifies one entry on its own —
        // whether that entry is a post or a route. PlannerId is still matched so a tourist
        // can only delete items from their own calendar.
        [Authorize(Roles = "tourist")]
        [HttpDelete("calendar/item/{itemId:int}")]
        public async Task<IActionResult> RemoveCalendarItem(int itemId)
        {
            var tourist = await GetCurrentTouristAsync();
            if (tourist is null)
                return Unauthorized();

            var planner = await _db.VisitPlanners
                .FirstOrDefaultAsync(p => p.TouristId == tourist.Id);

            if (planner is null)
                return NotFound(new { message = "Calendar not found." });

            var item = await _db.PlannerItems.FirstOrDefaultAsync(pi =>
                pi.PlannerId == planner.Id && pi.Id == (uint)itemId);

            if (item is null)
                return NotFound(new { message = "Item not in calendar." });

            _db.PlannerItems.Remove(item);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Removed from calendar." });
        }

        // POST /api/tourist-auth/calendar/route/{routeId}
        [Authorize(Roles = "tourist")]
        [HttpPost("calendar/route/{routeId:int}")]
        public async Task<IActionResult> AddRouteToCalendar(int routeId, [FromBody] AddCalendarItemDto? request)
        {
            var tourist = await GetCurrentTouristAsync();
            if (tourist is null)
                return Unauthorized();

            var route = await _db.Routes.FindAsync((uint)routeId);
            if (route is null)
                return NotFound(new { message = "Route not found." });

            var scheduledAt = request?.ScheduledAt;
            if (scheduledAt is null)
                return BadRequest(new { message = "Scheduled date and time are required." });

            var scheduledLocal = scheduledAt.Value;
            if (scheduledLocal < DateTime.Now)
                return BadRequest(new { message = "Scheduled date and time must be in the future." });

            // Get or create the tourist's "My Calendar" planner
            var planner = await _db.VisitPlanners
                .FirstOrDefaultAsync(p => p.TouristId == tourist.Id);

            if (planner is null)
            {
                planner = new VisitPlanner
                {
                    TouristId = tourist.Id,
                    Title = "My Calendar",
                    StartDate = DateOnly.FromDateTime(scheduledLocal),
                    EndDate = DateOnly.FromDateTime(scheduledLocal),
                    IsPublic = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.VisitPlanners.Add(planner);
                await _db.SaveChangesAsync();
            }

            var scheduledDate = DateOnly.FromDateTime(scheduledLocal);
            if (planner.StartDate is null || scheduledDate < planner.StartDate.Value)
            {
                var shiftDays = planner.StartDate is null ? 0 : planner.StartDate.Value.DayNumber - scheduledDate.DayNumber;
                if (shiftDays > 0)
                {
                    var existingItems = await _db.PlannerItems
                        .Where(pi => pi.PlannerId == planner.Id)
                        .ToListAsync();

                    foreach (var item in existingItems)
                        item.DayNumber = (byte)Math.Clamp(item.DayNumber + shiftDays, 1, byte.MaxValue);
                }

                planner.StartDate = scheduledDate;
            }

            if (planner.EndDate is null || scheduledDate > planner.EndDate.Value)
                planner.EndDate = scheduledDate;

            planner.UpdatedAt = DateTime.UtcNow;
            var dayNumber = (byte)Math.Clamp(scheduledDate.DayNumber - planner.StartDate.Value.DayNumber + 1, 1, byte.MaxValue);

            // Same route on the same date is a duplicate; different dates produce a new entry.
            var notesForDate = BuildCalendarItemNotes(scheduledDate);
            var existingRouteItem = await _db.PlannerItems
                .FirstOrDefaultAsync(pi => pi.PlannerId == planner.Id
                    && pi.RouteId == (uint)routeId
                    && pi.Notes == notesForDate);

            if (existingRouteItem is not null)
            {
                existingRouteItem.DayNumber = dayNumber;
                existingRouteItem.Notes = notesForDate;
                existingRouteItem.ScheduledTime = TimeOnly.FromDateTime(scheduledLocal);
                await _db.SaveChangesAsync();
                return Ok(new { message = "Calendar item updated.", alreadyAdded = true, updated = true });
            }

            var order = (byte)(await _db.PlannerItems.CountAsync(pi => pi.PlannerId == planner.Id) + 1);

            _db.PlannerItems.Add(new PlannerItem
            {
                PlannerId = planner.Id,
                RouteId = (uint)routeId,
                DayNumber = dayNumber,
                OrderInDay = order,
                Notes = notesForDate,
                ScheduledTime = TimeOnly.FromDateTime(scheduledLocal)
            });
            _db.Notifications.Add(new Notification
            {
                TouristId = tourist.Id,
                Type = "calendar",
                Title = "Added to calendar",
                Body = $"{route.Name} is now in your travel calendar.",
                Payload = System.Text.Json.JsonSerializer.Serialize(new { routeId }),
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            return Ok(new { message = "Added to calendar." });
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

            await _touristNotificationService.BroadcastNotificationReadAsync(tourist.Id, notif.Id);
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
            await _touristNotificationService.BroadcastAllReadAsync(tourist.Id);
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
            await _touristNotificationService.BroadcastNotificationDeletedAsync(tourist.Id, notif.Id);
            return Ok(new { success = true });
        }

        // GET /api/tourist-auth/notification-preferences
        [Authorize(Roles = "tourist")]
        [HttpGet("notification-preferences")]
        public async Task<IActionResult> GetNotificationPreferences()
        {
            var touristId = GetTouristId();
            if (touristId is null) return Unauthorized();

            var preferences = await _touristNotificationService.GetPreferencesAsync(touristId.Value);
            return Ok(new { data = preferences, success = true });
        }

        // PUT /api/tourist-auth/notification-preferences
        [Authorize(Roles = "tourist")]
        [HttpPut("notification-preferences")]
        public async Task<IActionResult> UpdateNotificationPreferences(
            [FromBody] List<TouristNotificationPreferenceUpdateDto> updates)
        {
            var touristId = GetTouristId();
            if (touristId is null) return Unauthorized();

            try
            {
                var preferences = await _touristNotificationService.UpdatePreferencesAsync(
                    touristId.Value,
                    updates ?? new List<TouristNotificationPreferenceUpdateDto>());

                return Ok(new { data = preferences, success = true });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message, success = false });
            }
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

            if (!PasswordHelper.Verify(dto.CurrentPassword, tourist.PasswordHash))
                return BadRequest(new { message = "Current password is incorrect." });

            if (PasswordPolicy.GetValidationError(dto.NewPassword, "Nova lozinka") is { } passwordError)
                return BadRequest(new { message = passwordError });

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

            if (PasswordPolicy.GetValidationError(dto.NewPassword, "Nova lozinka") is { } passwordError)
                return BadRequest(new { message = passwordError });

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
                PendingEmail = tourist.PendingEmail,
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
                    var configuredClientId = _configuration["SocialAuth:GoogleClientId"];
                    if (string.IsNullOrWhiteSpace(configuredClientId))
                        return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Google sign-in is not configured." });

                    var http = _httpClientFactory.CreateClient("GoogleTokenInfo");
                    var res = await http.GetAsync(
                        $"tokeninfo?id_token={Uri.EscapeDataString(dto.Credential)}");
                    if (!res.IsSuccessStatusCode)
                        return Unauthorized(new { message = "Invalid Google token." });

                    var body = await res.Content.ReadAsStringAsync();
                    var payload = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(body);
                    if (payload is null)
                        return Unauthorized(new { message = "Could not parse Google token payload." });

                    email      = payload.TryGetValue("email", out var e)      ? e?.ToString() : null;
                    name       = payload.TryGetValue("name", out var n)        ? n?.ToString() : null;
                    providerId = payload.TryGetValue("sub", out var sub)       ? sub?.ToString() : null;
                    var audience = payload.TryGetValue("aud", out var aud) ? aud?.ToString() : null;
                    var emailVerified = payload.TryGetValue("email_verified", out var ev) ? ev?.ToString() : null;

                    if (!string.Equals(audience, configuredClientId, StringComparison.Ordinal))
                    {
                        return Unauthorized(new { message = "Google token audience is not trusted." });
                    }

                    if (!string.Equals(emailVerified, "true", StringComparison.OrdinalIgnoreCase))
                    {
                        return Unauthorized(new { message = "Google email is not verified." });
                    }
                }
                else if (dto.Provider == "apple")
                {
                    return BadRequest(new { message = "Apple sign-in is disabled until server-side JWKS validation is configured." });
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

        /// <summary>Reads the post id of the first waypoint from a route's waypoints JSON.</summary>
        private static uint? ExtractFirstWaypointPostId(string? waypointsJson)
        {
            if (string.IsNullOrWhiteSpace(waypointsJson)) return null;
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(waypointsJson);
                if (doc.RootElement.ValueKind != System.Text.Json.JsonValueKind.Array) return null;

                foreach (var element in doc.RootElement.EnumerateArray())
                {
                    if (element.ValueKind == System.Text.Json.JsonValueKind.Object
                        && element.TryGetProperty("id", out var idProp)
                        && idProp.ValueKind == System.Text.Json.JsonValueKind.Number
                        && idProp.TryGetInt64(out var id)
                        && id > 0)
                    {
                        return (uint)id;
                    }

                    return null; // only the first stop counts
                }

                return null;
            }
            catch { return null; }
        }

        private const string CalendarDateNotePrefix = "calendarDate:";

        private static string BuildCalendarItemNotes(DateOnly scheduledDate) =>
            $"{CalendarDateNotePrefix}{scheduledDate:yyyy-MM-dd}";

        private static string NormalizeTravelMode(string? mode)
        {
            var normalized = mode?.Trim().ToLowerInvariant();
            return normalized is "walking" or "cycling" or "driving" ? normalized : "driving";
        }

        private static DateOnly? GetCalendarItemDate(PlannerItem item)
        {
            if (item.Notes?.StartsWith(CalendarDateNotePrefix, StringComparison.OrdinalIgnoreCase) == true
                && DateOnly.TryParse(item.Notes[CalendarDateNotePrefix.Length..], out var noteDate))
                return noteDate;

            return null;
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
