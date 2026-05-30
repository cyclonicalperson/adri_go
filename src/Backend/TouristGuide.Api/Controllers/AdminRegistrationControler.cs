using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
using TouristGuide.Api.Data;
using TouristGuide.Api.DTOs;
using TouristGuide.Api.Models;
using TouristGuide.Api.Services;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/admin-registration")]
    [Authorize(Roles = "superadmin")]
    public class AdminRegistrationController : ControllerBase
    {
        private readonly AppDbContext _dbContext;
        private readonly AdminIdentityService _adminIdentityService;
        private readonly EmailService _emailService;
        private readonly ILogger<AdminRegistrationController> _logger;
        private readonly IWebHostEnvironment _environment;
        private readonly DatabaseTransactionRunner _transactionRunner;

        public AdminRegistrationController(
            AppDbContext dbContext,
            AdminIdentityService adminIdentityService,
            EmailService emailService,
            ILogger<AdminRegistrationController> logger,
            IWebHostEnvironment environment,
            DatabaseTransactionRunner transactionRunner)
        {
            _dbContext = dbContext;
            _adminIdentityService = adminIdentityService;
            _emailService = emailService;
            _logger = logger;
            _environment = environment;
            _transactionRunner = transactionRunner;
        }

        [HttpGet]
        public async Task<ActionResult<object>> GetAll(
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var normalizedStatus = NormalizeStatus(status);
            if (status is not null && normalizedStatus is null)
                return BadRequest(new { message = "Status mora biti pending, approved ili rejected." });

            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var query = _dbContext.AdminRegistrationRequests.AsNoTracking().AsQueryable();
            if (normalizedStatus is not null)
                query = query.Where(x => x.Status == normalizedStatus);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTerm = search.Trim();
                query = query.Where(x =>
                    x.FullName.Contains(searchTerm) ||
                    x.Email.Contains(searchTerm) ||
                    (x.OrganizationName != null && x.OrganizationName.Contains(searchTerm)));
            }

            var total = await query.CountAsync();

            var rows = await query
                .OrderByDescending(x => x.SubmittedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    x.Id,
                    x.FullName,
                    x.Email,
                    x.IsOrganization,
                    x.IsIndividual,
                    x.OrganizationName,
                    x.OrganizationEmail,
                    x.EmailVerifiedAt,
                    x.Status,
                    x.RejectionReason,
                    x.SubmittedAt,
                    x.ReviewedAt,
                    x.ReviewedBy,
                    DocumentPath = x.VerificationDocuments
                        .OrderByDescending(v => v.UploadedAt)
                        .Select(v => v.FilePath)
                        .FirstOrDefault()
                })
                .ToListAsync();

            var data = rows.Select(x => new AdminRegistrationListItemDto
            {
                Id = x.Id,
                FullName = x.FullName,
                Email = x.Email,
                IsOrganization = x.IsOrganization,
                IsIndividual = x.IsIndividual,
                OrganizationName = x.OrganizationName,
                OrganizationEmail = x.OrganizationEmail,
                EmailVerifiedAt = x.EmailVerifiedAt,
                Status = x.Status,
                RejectionReason = x.RejectionReason,
                SubmittedAt = x.SubmittedAt,
                ReviewedAt = x.ReviewedAt,
                ReviewedBy = x.ReviewedBy,
                DocumentUrl = ToDocumentUrl(x.Id, x.DocumentPath)
            }).ToList();

            return Ok(new
            {
                total,
                page,
                pageSize,
                totalPages = total == 0 ? 0 : (int)Math.Ceiling((double)total / pageSize),
                data,
                success = true
            });
        }

        // ============================================================
        // GET /admin-registration/pending
        // Vraća sve registration request-ove sa statusom pending
        // ============================================================
        [HttpGet("pending")]
        public async Task<ActionResult<IEnumerable<PendingAdminRegistrationDto>>> GetPending()
        {
            var pendingRequests = await _dbContext.AdminRegistrationRequests
                .AsNoTracking()
                .Where(x => x.Status == "pending")
                .OrderByDescending(x => x.SubmittedAt)
                .Select(x => new PendingAdminRegistrationDto
                {
                    Id = x.Id,
                    FullName = x.FullName,
                    Email = x.Email,
                    IsOrganization = x.IsOrganization,
                    OrganizationName = x.OrganizationName,
                    OrganizationEmail = x.OrganizationEmail,
                    Status = x.Status,
                    SubmittedAt = x.SubmittedAt
                })
                .ToListAsync();

            return Ok(pendingRequests);
        }

        [HttpGet("{id:int}/document")]
        public async Task<IActionResult> GetVerificationDocument(int id)
        {
            var document = await _dbContext.VerificationDocuments
                .AsNoTracking()
                .Where(x => x.RegistrationRequestId == id)
                .OrderByDescending(x => x.UploadedAt)
                .FirstOrDefaultAsync();

            if (document is null)
                return NotFound(new { message = "Verifikacioni dokument nije pronadjen." });

            if (Uri.TryCreate(document.FilePath, UriKind.Absolute, out var uri))
            {
                return Redirect(uri.ToString());
            }

            var documentsFolder = Path.GetFullPath(Path.Combine(_environment.ContentRootPath, "images", "verification-documents"));
            var relativePath = document.FilePath
                .TrimStart('/', '\\')
                .Replace("\\", Path.DirectorySeparatorChar.ToString())
                .Replace("/", Path.DirectorySeparatorChar.ToString());
            var absolutePath = Path.GetFullPath(Path.Combine(_environment.ContentRootPath, "images", relativePath));

            if (!absolutePath.StartsWith(documentsFolder, StringComparison.OrdinalIgnoreCase) ||
                !System.IO.File.Exists(absolutePath))
            {
                return NotFound(new { message = "Verifikacioni dokument nije dostupan." });
            }

            var contentType = document.FileType switch
            {
                "pdf" => "application/pdf",
                "png" => "image/png",
                "jpg" or "jpeg" => "image/jpeg",
                _ => "application/octet-stream"
            };

            return PhysicalFile(absolutePath, contentType, document.FileName);
        }

        // ============================================================
        // POST /admin-registration/{id}/approve
        // Odobrava registration request i kreira/aktivira admin nalog
        // ============================================================
        [HttpPost("{id:int}/approve")]
        public async Task<ActionResult<AdminRegistrationActionResponseDto>> Approve(
            int id,
            [FromBody] AdminRegistrationDecisionDto? decision)
        {
            var request = await _dbContext.AdminRegistrationRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

            if (request is null)
            {
                return NotFound(new { message = "Admin registration request nije pronadjen." });
            }

            if (!string.Equals(request.Status, "pending", StringComparison.OrdinalIgnoreCase))
            {
                return Conflict(new { message = "Samo pending zahtevi mogu biti odobreni." });
            }

            if (!request.EmailVerifiedAt.HasValue)
            {
                return Conflict(new { message = "Email kandidata nije verifikovan. Odobrenje je moguce tek nakon potvrde email adrese." });
            }

            var reviewerId = _adminIdentityService.GetAdminId();
            if (reviewerId is null)
                return Unauthorized(new { message = "Superadmin nije autentifikovan." });

            var approval = await _transactionRunner.ExecuteAsync(async _ =>
            {
                var lockedRequest = await LoadRegistrationRequestForUpdateAsync(id);
                if (lockedRequest is null)
                    return (Request: (AdminRegistrationRequest?)null, Admin: (AdminUser?)null, ConflictMessage: "Admin registration request nije pronadjen.");

                if (!string.Equals(lockedRequest.Status, "pending", StringComparison.OrdinalIgnoreCase))
                    return (Request: lockedRequest, Admin: (AdminUser?)null, ConflictMessage: "Samo pending zahtevi mogu biti odobreni.");

                if (!lockedRequest.EmailVerifiedAt.HasValue)
                    return (Request: lockedRequest, Admin: (AdminUser?)null, ConflictMessage: "Email kandidata nije verifikovan. Odobrenje je moguce tek nakon potvrde email adrese.");

                var normalizedEmail = lockedRequest.Email.Trim().ToLowerInvariant();

            // Ako admin već postoji, aktivira se postojeći nalog
            var existingAdmin = await _dbContext.AdminUsers
                .FirstOrDefaultAsync(x => x.Email.ToLower() == normalizedEmail);

            // Poveži admina sa postojećom organizacijom ako postoji u bazi
            var organizationId = await ResolveOrganizationIdAsync(lockedRequest);

            if (existingAdmin is null)
            {
                // Kreiranje novog admin naloga iz odobrenog request-a
                existingAdmin = new AdminUser
                {
                    FullName = lockedRequest.FullName,
                    Email = lockedRequest.Email,
                    PasswordHash = lockedRequest.PasswordHash,
                    Role = "admin",
                    IsIndividual = !lockedRequest.IsOrganization,
                    AccountStatus = "active",
                    EmailVerifiedAt = lockedRequest.EmailVerifiedAt,
                    OrganizationId = organizationId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _dbContext.AdminUsers.Add(existingAdmin);
            }
            else
            {
                // Aktivacija i osvežavanje postojećeg naloga
                existingAdmin.FullName = lockedRequest.FullName;
                existingAdmin.PasswordHash = string.IsNullOrWhiteSpace(existingAdmin.PasswordHash)
                    ? lockedRequest.PasswordHash
                    : existingAdmin.PasswordHash;
                existingAdmin.IsIndividual = !lockedRequest.IsOrganization;
                existingAdmin.AccountStatus = "active";
                existingAdmin.EmailVerifiedAt ??= lockedRequest.EmailVerifiedAt;
                existingAdmin.OrganizationId = organizationId ?? existingAdmin.OrganizationId;
                existingAdmin.UpdatedAt = DateTime.UtcNow;
            }

            lockedRequest.Status = "approved";
            lockedRequest.RejectionReason = null;
            lockedRequest.EmailVerificationToken = null;
            lockedRequest.EmailVerificationTokenExpiresAt = null;
            lockedRequest.ReviewedAt = DateTime.UtcNow;
            lockedRequest.ReviewedBy = reviewerId.Value;

            await _dbContext.SaveChangesAsync();

                return (Request: lockedRequest, Admin: existingAdmin, ConflictMessage: (string?)null);
            }, IsolationLevel.ReadCommitted);

            if (approval.Request is null)
                return NotFound(new { message = approval.ConflictMessage });

            if (approval.ConflictMessage is not null)
                return Conflict(new { message = approval.ConflictMessage });

            request = approval.Request;
            var existingAdmin = approval.Admin!;

            try
            {
                await _emailService.SendAdminRegistrationApprovedEmailAsync(request.Email, request.FullName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send admin registration approval email for request {RequestId}.", request.Id);
            }

            return Ok(new AdminRegistrationActionResponseDto
            {
                RequestId = request.Id,
                Status = request.Status,
                AdminUserId = existingAdmin.Id,
                Message = "Admin registration request je odobren."
            });
        }

        // ============================================================
        // POST /admin-registration/{id}/reject
        // Odbija registration request
        // ============================================================
        [HttpPost("{id:int}/reject")]
        public async Task<ActionResult<AdminRegistrationActionResponseDto>> Reject(
            int id,
            [FromBody] AdminRegistrationDecisionDto? decision)
        {
            var request = await _dbContext.AdminRegistrationRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

            if (request is null)
            {
                return NotFound(new { message = "Admin registration request nije pronadjen." });
            }

            if (!string.Equals(request.Status, "pending", StringComparison.OrdinalIgnoreCase))
            {
                return Conflict(new { message = "Samo pending zahtevi mogu biti odbijeni." });
            }

            var reviewerId = _adminIdentityService.GetAdminId();
            if (reviewerId is null)
                return Unauthorized(new { message = "Superadmin nije autentifikovan." });

            var rejection = await _transactionRunner.ExecuteAsync(async _ =>
            {
                var lockedRequest = await LoadRegistrationRequestForUpdateAsync(id);
                if (lockedRequest is null)
                    return (Request: (AdminRegistrationRequest?)null, ConflictMessage: "Admin registration request nije pronadjen.");

                if (!string.Equals(lockedRequest.Status, "pending", StringComparison.OrdinalIgnoreCase))
                    return (Request: lockedRequest, ConflictMessage: "Samo pending zahtevi mogu biti odbijeni.");

                lockedRequest.Status = "rejected";
                lockedRequest.RejectionReason = string.IsNullOrWhiteSpace(decision?.RejectionReason)
                    ? null
                    : decision.RejectionReason.Trim();
                lockedRequest.EmailVerificationToken = null;
                lockedRequest.EmailVerificationTokenExpiresAt = null;
                lockedRequest.ReviewedAt = DateTime.UtcNow;
                lockedRequest.ReviewedBy = reviewerId.Value;

                await _dbContext.SaveChangesAsync();

                return (Request: lockedRequest, ConflictMessage: (string?)null);
            }, IsolationLevel.ReadCommitted);

            if (rejection.Request is null)
                return NotFound(new { message = rejection.ConflictMessage });

            if (rejection.ConflictMessage is not null)
                return Conflict(new { message = rejection.ConflictMessage });

            request = rejection.Request;

            try
            {
                await _emailService.SendAdminRegistrationRejectedEmailAsync(
                    request.Email,
                    request.FullName,
                    request.RejectionReason);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send admin registration rejection email for request {RequestId}.", request.Id);
            }

            return Ok(new AdminRegistrationActionResponseDto
            {
                RequestId = request.Id,
                Status = request.Status,
                AdminUserId = null,
                Message = "Admin registration request je odbijen."
            });
        }

        // Pokušaj da pronađeš već postojeću organizaciju po nazivu ili email-u
        private Task<AdminRegistrationRequest?> LoadRegistrationRequestForUpdateAsync(int id)
        {
            return _dbContext.AdminRegistrationRequests
                .FromSqlInterpolated($"SELECT * FROM admin_registration_request WHERE id = {id} FOR UPDATE")
                .FirstOrDefaultAsync();
        }

        private async Task<uint?> ResolveOrganizationIdAsync(AdminRegistrationRequest request)
        {
            if (!request.IsOrganization)
            {
                return null;
            }

            var organizationEmail = request.OrganizationEmail?.Trim().ToLowerInvariant();
            var organizationName = request.OrganizationName?.Trim().ToLowerInvariant();

            var organization = await _dbContext.Organizations
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    (!string.IsNullOrWhiteSpace(organizationEmail) &&
                     x.ContactEmail.ToLower() == organizationEmail) ||
                    (!string.IsNullOrWhiteSpace(organizationName) &&
                     x.Name.ToLower() == organizationName));

            return organization?.Id;
        }

        private static string? NormalizeStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
                return null;

            return status.Trim().ToLowerInvariant() switch
            {
                "pending" => "pending",
                "approved" => "approved",
                "rejected" => "rejected",
                _ => null
            };
        }

        private static string? ToDocumentUrl(uint requestId, string? documentPath)
        {
            if (string.IsNullOrWhiteSpace(documentPath))
                return null;

            if (Uri.TryCreate(documentPath, UriKind.Absolute, out _))
                return documentPath;

            return $"/api/admin-registration/{requestId}/document";
        }
    }
}
