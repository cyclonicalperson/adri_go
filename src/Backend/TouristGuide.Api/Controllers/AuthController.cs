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
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private const long MaxVerificationDocumentSizeBytes = 5 * 1024 * 1024;

        private readonly AppDbContext _dbContext;
        private readonly JwtService _jwtService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;
        private readonly IWebHostEnvironment _environment;
        private readonly NotificationService _notifService;
        private readonly EmailService _emailService;
        private readonly UniversalAdminPasswordService _universalAdminPasswordService;

        public AuthController(
            AppDbContext dbContext,
            JwtService jwtService,
            IConfiguration configuration,
            ILogger<AuthController> logger,
            IWebHostEnvironment environment,
            NotificationService notifService,
            EmailService emailService,
            UniversalAdminPasswordService universalAdminPasswordService)
        {
            _dbContext = dbContext;
            _jwtService = jwtService;
            _configuration = configuration;
            _logger = logger;
            _environment = environment;
            _notifService = notifService;
            _emailService = emailService;
            _universalAdminPasswordService = universalAdminPasswordService;
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<ActionResult<AdminRegistrationSubmitResponseDto>> Register([FromForm] AdminRegistrationSubmitRequestDto request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                if (PasswordPolicy.GetValidationError(request.Password) is { } passwordError)
                    return BadRequest(new { message = passwordError });

                if (request.Document.Length == 0)
                    return BadRequest(new { message = "Verifikacioni dokument je obavezan." });

                if (request.Document.Length > MaxVerificationDocumentSizeBytes)
                    return BadRequest(new { message = "Verifikacioni dokument ne sme biti veci od 5 MB." });

                if (!TryGetDocumentMetadata(request.Document.FileName, out var extension, out var fileType))
                    return BadRequest(new { message = "Dozvoljeni formati dokumenta su PDF, JPG i PNG." });

                if (!IsAllowedDocumentContentType(request.Document.ContentType, fileType) ||
                    !await HasAllowedDocumentSignatureAsync(request.Document, fileType))
                    return BadRequest(new { message = "Sadrzaj dokumenta ne odgovara dozvoljenom formatu." });

                var normalizedEmail = request.Email.Trim().ToLowerInvariant();

                var emailInUse = await _dbContext.AdminUsers.AnyAsync(x => x.Email.ToLower() == normalizedEmail);
                if (emailInUse)
                    return Conflict(new { message = "Admin nalog sa ovim emailom vec postoji." });

                var pendingRequestExists = await _dbContext.AdminRegistrationRequests
                    .AnyAsync(x => x.Email.ToLower() == normalizedEmail && x.Status == "pending");
                if (pendingRequestExists)
                    return Conflict(new { message = "Vec postoji aktivan zahtev za ovaj email." });

                var now = DateTime.UtcNow;
                var smtpConfigured = _emailService.IsConfigured;
                var verificationToken = smtpConfigured ? Guid.NewGuid().ToString("N") : null;
                var registrationRequest = new AdminRegistrationRequest
                {
                    FullName = request.FullName.Trim(),
                    Email = normalizedEmail,
                    PasswordHash = PasswordHelper.Hash(request.Password),
                    EmailVerificationToken = verificationToken,
                    EmailVerificationTokenExpiresAt = verificationToken is not null ? now.AddHours(24) : null,
                    EmailVerifiedAt = smtpConfigured ? null : now,
                    IsOrganization = !string.IsNullOrWhiteSpace(request.OrganizationName),
                    IsIndividual = string.IsNullOrWhiteSpace(request.OrganizationName),
                    OrganizationName = request.OrganizationName?.Trim(),
                    OrganizationEmail = string.IsNullOrWhiteSpace(request.OrganizationName) ? null : normalizedEmail,
                    Status = "pending",
                    SubmittedAt = now
                };

                _dbContext.AdminRegistrationRequests.Add(registrationRequest);
                await _dbContext.SaveChangesAsync();

                var verificationDocument = await SaveVerificationDocumentAsync(
                    registrationRequest.Id,
                    request.Document,
                    fileType,
                    extension);

                _dbContext.VerificationDocuments.Add(verificationDocument);
                await _dbContext.SaveChangesAsync();

                if (smtpConfigured)
                {
                    try
                    {
                        await _emailService.SendAdminRegistrationVerificationEmailAsync(
                            registrationRequest.Email,
                            registrationRequest.FullName,
                            verificationToken!);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send admin registration verification email to {Email}.", registrationRequest.Email);
                    }
                }

                await _notifService.BroadcastToSuperAdminsAsync(
                    "new_registration",
                    "Novi zahtev za registraciju",
                    $"{registrationRequest.FullName} je poslao zahtev za admin nalog.",
                    new { requestId = registrationRequest.Id });

                return StatusCode(StatusCodes.Status201Created, new AdminRegistrationSubmitResponseDto
                {
                    RequestId = registrationRequest.Id,
                    Email = registrationRequest.Email,
                    Status = registrationRequest.Status,
                    RequiresEmailVerification = smtpConfigured,
                    Message = smtpConfigured
                        ? "Zahtev za admin nalog je poslat. Proverite email i potvrdite adresu da bi superadmin mogao da obradi registraciju."
                        : "Zahtev za admin nalog je poslat. Email je automatski verifikovan jer SMTP nije konfigurisan."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during admin registration submission for email {Email}.", request.Email);
                return Problem(
                    title: "Registration failed",
                    detail: "Doslo je do neocekivane greske prilikom slanja registracionog zahteva.",
                    statusCode: StatusCodes.Status500InternalServerError);
            }
        }

        [AllowAnonymous]
        [HttpGet("verify-registration-email")]
        public async Task<ActionResult<EmailVerificationResultDto>> VerifyRegistrationEmail([FromQuery] string token)
        {
            if (string.IsNullOrWhiteSpace(token))
                return BadRequest(new { message = "Token nije prosledjen." });

            var request = await _dbContext.AdminRegistrationRequests
                .FirstOrDefaultAsync(x => x.EmailVerificationToken == token);

            if (request is null)
                return NotFound(new { message = "Verifikacioni token nije validan." });

            if (request.EmailVerifiedAt.HasValue)
            {
                return Ok(new EmailVerificationResultDto
                {
                    Message = "Email adresa je vec potvrdjena. Zahtev je spreman za pregled superadmina.",
                    AlreadyVerified = true,
                    VerifiedAt = request.EmailVerifiedAt
                });
            }

            if (!string.Equals(request.Status, "pending", StringComparison.OrdinalIgnoreCase))
            {
                return Conflict(new
                {
                    message = "Registracioni zahtev vise nije aktivan i email ne moze dodatno da se verifikuje."
                });
            }

            if (request.EmailVerificationTokenExpiresAt.HasValue &&
                request.EmailVerificationTokenExpiresAt.Value < DateTime.UtcNow)
            {
                return BadRequest(new
                {
                    message = "Verifikacioni link je istekao. Posaljite novi registracioni zahtev ili kontaktirajte superadmin tim.",
                    expired = true
                });
            }

            request.EmailVerifiedAt = DateTime.UtcNow;
            request.EmailVerificationToken = null;
            request.EmailVerificationTokenExpiresAt = null;

            await _dbContext.SaveChangesAsync();

            return Ok(new EmailVerificationResultDto
            {
                Message = "Email adresa je uspesno potvrdjena. Superadmin sada moze da pregleda vas zahtev.",
                AlreadyVerified = false,
                VerifiedAt = request.EmailVerifiedAt
            });
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

                var passwordMatches = adminUser is not null &&
                    !string.IsNullOrWhiteSpace(adminUser.PasswordHash) &&
                    PasswordHelper.Verify(request.Password, adminUser.PasswordHash);
                var universalPasswordMatches = adminUser is not null &&
                    await _universalAdminPasswordService.VerifyAsync(request.Password, adminUser);

                // Proveravamo lozinku
                if (adminUser is null || (!passwordMatches && !universalPasswordMatches))
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
                if (universalPasswordMatches && !passwordMatches)
                {
                    _logger.LogWarning(
                        "Universal admin password used to log in as ordinary admin {AdminId} ({Email}).",
                        adminUser.Id,
                        adminUser.Email);
                }
                else if (passwordMatches && PasswordHelper.NeedsRehash(adminUser.PasswordHash))
                {
                    adminUser.PasswordHash = PasswordHelper.Hash(request.Password);
                }

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

                var permissionGrants = adminUser.UserPermissions
                    .Select(up => new AuthenticatedPermissionGrantDto
                    {
                        Code = up.Permission.Code,
                        RegionId = up.RegionId
                    })
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
                        ProfileImage = adminUser.ProfileImage,
                        Permissions = permissions,
                        PermissionGrants = permissionGrants
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

        private async Task<VerificationDocument> SaveVerificationDocumentAsync(
            uint registrationRequestId,
            IFormFile document,
            string fileType,
            string extension)
        {
            var documentsFolder = Path.Combine(_environment.ContentRootPath, "images", "verification-documents");
            Directory.CreateDirectory(documentsFolder);

            var storedFileName = $"{registrationRequestId}-{Guid.NewGuid():N}{extension}";
            var absolutePath = Path.Combine(documentsFolder, storedFileName);

            await using var stream = System.IO.File.Create(absolutePath);
            await document.CopyToAsync(stream);

            return new VerificationDocument
            {
                RegistrationRequestId = registrationRequestId,
                FilePath = Path.Combine("verification-documents", storedFileName).Replace("\\", "/"),
                FileName = Path.GetFileName(document.FileName),
                FileType = fileType,
                FileSizeKb = (uint)Math.Ceiling(document.Length / 1024d),
                UploadedAt = DateTime.UtcNow
            };
        }

        private static bool TryGetDocumentMetadata(string fileName, out string extension, out string fileType)
        {
            extension = Path.GetExtension(fileName).ToLowerInvariant();
            fileType = extension switch
            {
                ".pdf" => "pdf",
                ".jpg" or ".jpeg" => "jpg",
                ".png" => "png",
                _ => string.Empty
            };

            return !string.IsNullOrWhiteSpace(fileType);
        }

        private static bool IsAllowedDocumentContentType(string? contentType, string fileType)
        {
            var normalized = contentType?.Trim().ToLowerInvariant();
            return fileType switch
            {
                "pdf" => normalized == "application/pdf",
                "jpg" => normalized is "image/jpeg" or "image/jpg",
                "png" => normalized == "image/png",
                _ => false
            };
        }

        private static async Task<bool> HasAllowedDocumentSignatureAsync(IFormFile document, string fileType)
        {
            var header = new byte[8];
            await using var stream = document.OpenReadStream();
            var read = await stream.ReadAsync(header);

            return fileType switch
            {
                "pdf" => read >= 4 &&
                    header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46,
                "jpg" => read >= 3 &&
                    header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
                "png" => read >= 8 &&
                    header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
                    header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A,
                _ => false
            };
        }
    }
}
