using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.DTOs;
using TouristGuide.Api.Models;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/admin-registration")]
    public class AdminRegistrationController : ControllerBase
    {
        private readonly AppDbContext _dbContext;

        public AdminRegistrationController(AppDbContext dbContext)
        {
            _dbContext = dbContext;
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
                .OrderBy(x => x.SubmittedAt)
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
        [HttpPost("{id:uint}/approve")]
        public async Task<ActionResult<AdminRegistrationActionResponseDto>> Approve(
            uint id,
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
                existingAdmin.OrganizationId = organizationId ?? existingAdmin.OrganizationId;
                existingAdmin.UpdatedAt = DateTime.UtcNow;
            }

            request.Status = "approved";
            request.RejectionReason = null;
            request.ReviewedAt = DateTime.UtcNow;
            request.ReviewedBy = decision?.ReviewedBy;

            await _dbContext.SaveChangesAsync();

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
        [HttpPost("{id:uint}/reject")]
        public async Task<ActionResult<AdminRegistrationActionResponseDto>> Reject(
            uint id,
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

            request.Status = "rejected";
            request.RejectionReason = string.IsNullOrWhiteSpace(decision?.RejectionReason)
                ? null
                : decision.RejectionReason.Trim();
            request.ReviewedAt = DateTime.UtcNow;
            request.ReviewedBy = decision?.ReviewedBy;

            await _dbContext.SaveChangesAsync();

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
    }
}
