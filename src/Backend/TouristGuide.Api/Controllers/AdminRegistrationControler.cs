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
    [Route("api/admin-registration")]
    [Authorize(Roles = "superadmin")]
    public class AdminRegistrationController : ControllerBase
    {
        private readonly AppDbContext _dbContext;
        private readonly AdminIdentityService _adminIdentityService;
        private readonly EmailService _emailService;
        private readonly ILogger<AdminRegistrationController> _logger;

        public AdminRegistrationController(
            AppDbContext dbContext,
            AdminIdentityService adminIdentityService,
            EmailService emailService,
            ILogger<AdminRegistrationController> logger)
        {
            _dbContext = dbContext;
            _adminIdentityService = adminIdentityService;
            _emailService = emailService;
            _logger = logger;
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
                DocumentUrl = ToDocumentUrl(x.DocumentPath)
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

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            // Ako admin već postoji, aktivira se postojeći nalog
            var existingAdmin = await _dbContext.AdminUsers
                .FirstOrDefaultAsync(x => x.Email.ToLower() == normalizedEmail);

            // Poveži admina sa postojećom organizacijom ako postoji u bazi
            var organizationId = await ResolveOrganizationIdAsync(request);

            if (existingAdmin is null)
            {
                // Kreiranje novog admin naloga iz odobrenog request-a
                existingAdmin = new AdminUser
                {
                    FullName = request.FullName,
                    Email = request.Email,
                    PasswordHash = request.PasswordHash,
                    Role = "admin",
                    IsIndividual = !request.IsOrganization,
                    AccountStatus = "active",
                    EmailVerifiedAt = request.EmailVerifiedAt,
                    OrganizationId = organizationId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _dbContext.AdminUsers.Add(existingAdmin);
            }
            else
            {
                // Aktivacija i osvežavanje postojećeg naloga
                existingAdmin.FullName = request.FullName;
                existingAdmin.PasswordHash = string.IsNullOrWhiteSpace(existingAdmin.PasswordHash)
                    ? request.PasswordHash
                    : existingAdmin.PasswordHash;
                existingAdmin.IsIndividual = !request.IsOrganization;
                existingAdmin.AccountStatus = "active";
                existingAdmin.EmailVerifiedAt ??= request.EmailVerifiedAt;
                existingAdmin.OrganizationId = organizationId ?? existingAdmin.OrganizationId;
                existingAdmin.UpdatedAt = DateTime.UtcNow;
            }

            request.Status = "approved";
            request.RejectionReason = null;
            request.EmailVerificationToken = null;
            request.EmailVerificationTokenExpiresAt = null;
            request.ReviewedAt = DateTime.UtcNow;
            request.ReviewedBy = reviewerId.Value;

            await _dbContext.SaveChangesAsync();

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

            request.Status = "rejected";
            request.RejectionReason = string.IsNullOrWhiteSpace(decision?.RejectionReason)
                ? null
                : decision.RejectionReason.Trim();
            request.EmailVerificationToken = null;
            request.EmailVerificationTokenExpiresAt = null;
            request.ReviewedAt = DateTime.UtcNow;
            request.ReviewedBy = reviewerId.Value;

            await _dbContext.SaveChangesAsync();

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

        private static string? ToDocumentUrl(string? documentPath)
        {
            if (string.IsNullOrWhiteSpace(documentPath))
                return null;

            return $"/images/{documentPath.TrimStart('/').TrimStart('\\').Replace("\\", "/")}";
        }
    }
}
