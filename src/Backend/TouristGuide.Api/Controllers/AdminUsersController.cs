using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.Models;
using TouristGuide.Api.Services;

namespace TouristGuide.Api.Controllers
{
    /// <summary>
    /// CRUD za admin korisnike + upravljanje permisijama.
    /// Svi endpointi zahtijevaju superadmin rolu osim GET-a koji je dostupan i adminu.
    /// </summary>
    [ApiController]
    [Route("api/admin-users")]
    [Authorize(Roles = "admin,superadmin")]
    public class AdminUsersController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly UniversalAdminPasswordService _universalAdminPasswordService;
        private static readonly HashSet<string> AllowedRoles = ["admin", "superadmin"];
        private static readonly HashSet<string> AllowedAccountStatuses = ["active", "suspended", "pending"];

        public AdminUsersController(AppDbContext db, UniversalAdminPasswordService universalAdminPasswordService)
        {
            _db = db;
            _universalAdminPasswordService = universalAdminPasswordService;
        }

        // ── GET /api/admin-users ──────────────────────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? role,
            [FromQuery] string? accountStatus,
            [FromQuery] uint? organizationId,
            [FromQuery] string? search,
            [FromQuery] string? sortBy,
            [FromQuery] string? sortDir,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            // Samo superadmin vidi sve admins
            if (!IsSuperAdmin())
                return Ok(new { total = 0, page, pageSize, totalPages = 0, data = Array.Empty<object>() });

            var query = _db.AdminUsers
                .Include(u => u.Organization)
                .Include(u => u.UserPermissions)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(role))
                query = query.Where(u => u.Role == role);
            if (!string.IsNullOrWhiteSpace(accountStatus))
                query = query.Where(u => u.AccountStatus == accountStatus);
            if (organizationId.HasValue)
                query = query.Where(u => u.OrganizationId == organizationId.Value);
            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(u => u.FullName.Contains(search) || u.Email.Contains(search));

            query = (sortBy?.ToLower(), sortDir?.ToLower()) switch
            {
                ("email", "asc") => query.OrderBy(u => u.Email),
                ("email", "desc") => query.OrderByDescending(u => u.Email),
                ("fullname", "asc") => query.OrderBy(u => u.FullName),
                ("fullname", "desc") => query.OrderByDescending(u => u.FullName),
                ("createdat", "asc") => query.OrderBy(u => u.CreatedAt),
                _ => query.OrderByDescending(u => u.CreatedAt),
            };

            var total = await query.CountAsync();
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var users = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)total / pageSize),
                data = users.Select(MapToDto)
            });
        }

        // ── GET /api/admin-users/{id} ─────────────────────────────────────────
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(uint id)
        {
            if (!IsSuperAdmin() && GetCurrentAdminId() != id)
                return Forbid();

            var user = await _db.AdminUsers
                .Include(u => u.Organization)
                .Include(u => u.UserPermissions)
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user is null)
                return NotFound(new { message = $"Admin korisnik sa ID={id} nije pronađen." });

            return Ok(new { data = MapToDto(user), success = true });
        }

        // ── POST /api/admin-users ─────────────────────────────────────────────
        [HttpPost]
        [Authorize(Roles = "superadmin")]
        public async Task<IActionResult> Create([FromBody] CreateAdminUserDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if (PasswordPolicy.GetValidationError(dto.Password) is { } passwordError)
                return BadRequest(new { message = passwordError });

            var role = NormalizeRole(dto.Role);
            if (role is null)
                return BadRequest(new { message = "Rola mora biti admin ili superadmin." });

            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
            if (await _db.AdminUsers.AnyAsync(u => u.Email == normalizedEmail))
                return Conflict(new { message = "Email adresa je već zauzeta." });

            var user = new AdminUser
            {
                FullName = dto.FullName.Trim(),
                Email = normalizedEmail,
                PasswordHash = PasswordHelper.Hash(dto.Password),
                Role = role,
                IsIndividual = dto.IsIndividual,
                OrganizationId = dto.OrganizationId,
                AccountStatus = "active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                EmailVerifiedAt = DateTime.UtcNow
            };

            _db.AdminUsers.Add(user);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = user.Id },
                new { data = MapToDto(user), success = true });
        }

        // ── PUT /api/admin-users/{id} ─────────────────────────────────────────
        [HttpPut("{id}")]
        [Authorize(Roles = "superadmin")]
        public async Task<IActionResult> Update(uint id, [FromBody] UpdateAdminUserDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var user = await _db.AdminUsers
                .Include(u => u.Organization)
                .Include(u => u.UserPermissions)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user is null)
                return NotFound(new { message = $"Admin korisnik sa ID={id} nije pronađen." });

            if (dto.FullName is not null) user.FullName = dto.FullName.Trim();
            if (dto.Email is not null)
            {
                var normalized = dto.Email.Trim().ToLowerInvariant();
                if (await _db.AdminUsers.AnyAsync(u => u.Email == normalized && u.Id != id))
                    return Conflict(new { message = "Email adresa je već zauzeta." });
                user.Email = normalized;
            }
            if (dto.Role is not null)
            {
                var role = NormalizeRole(dto.Role);
                if (role is null)
                    return BadRequest(new { message = "Rola mora biti admin ili superadmin." });
                user.Role = role;
            }
            if (dto.OrganizationId.HasValue) user.OrganizationId = dto.OrganizationId.Value == 0 ? null : dto.OrganizationId;
            if (dto.IsIndividual.HasValue) user.IsIndividual = dto.IsIndividual.Value;
            if (dto.AccountStatus is not null)
            {
                var accountStatus = NormalizeAccountStatus(dto.AccountStatus);
                if (accountStatus is null)
                    return BadRequest(new { message = "Status naloga mora biti active, suspended ili pending." });
                user.AccountStatus = accountStatus;
            }
            if (dto.ProfileImage is not null)
                user.ProfileImage = string.IsNullOrWhiteSpace(dto.ProfileImage) ? null : dto.ProfileImage.Trim();

            user.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            await _db.Entry(user).Reference(u => u.Organization).LoadAsync();

            return Ok(new { data = MapToDto(user), success = true });
        }

        // ── PATCH /api/admin-users/{id}/suspend ──────────────────────────────
        [HttpPatch("{id}/suspend")]
        [Authorize(Roles = "superadmin")]
        public async Task<IActionResult> Suspend(uint id)
        {
            var user = await _db.AdminUsers.FindAsync(id);
            if (user is null) return NotFound(new { message = $"Admin korisnik sa ID={id} nije pronađen." });

            user.AccountStatus = "suspended";
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { data = MapToDto(user), success = true });
        }

        // ── PATCH /api/admin-users/{id}/activate ──────────────────────────────
        [HttpPatch("{id}/activate")]
        [Authorize(Roles = "superadmin")]
        public async Task<IActionResult> Activate(uint id)
        {
            var user = await _db.AdminUsers.FindAsync(id);
            if (user is null) return NotFound(new { message = $"Admin korisnik sa ID={id} nije pronađen." });

            user.AccountStatus = "active";
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { data = MapToDto(user), success = true });
        }

        // ── DELETE /api/admin-users/{id} ──────────────────────────────────────
        [HttpDelete("{id}")]
        [Authorize(Roles = "superadmin")]
        public async Task<IActionResult> Delete(uint id)
        {
            var currentId = GetCurrentAdminId();
            if (currentId == id)
                return BadRequest(new { message = "Ne možete obrisati vlastiti nalog." });

            var user = await _db.AdminUsers.FindAsync(id);
            if (user is null) return NotFound(new { message = $"Admin korisnik sa ID={id} nije pronađen." });

            _db.AdminUsers.Remove(user);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = $"Admin '{user.FullName}' je obrisan." });
        }

        // ── GET /api/admin-users/{id}/permissions ─────────────────────────────
        [HttpGet("{id}/permissions")]
        public async Task<IActionResult> GetPermissions(uint id)
        {
            if (!IsSuperAdmin() && GetCurrentAdminId() != id)
                return Forbid();

            var perms = await _db.AdminUserPermissions
                .Where(p => p.AdminUserId == id)
                .Include(p => p.Permission)
                .Include(p => p.Region)
                .AsNoTracking()
                .ToListAsync();

            return Ok(new
            {
                data = perms.Select(p => new
                {
                    id = p.Id,
                    adminUserId = p.AdminUserId,
                    permission = new
                    {
                        id = p.Permission.Id,
                        code = p.Permission.Code,
                        label = p.Permission.Label,
                        category = p.Permission.Category,
                        description = p.Permission.Description
                    },
                    regionId = p.RegionId,
                    grantedBy = p.GrantedBy,
                    grantedAt = p.GrantedAt
                }),
                success = true
            });
        }

        // ── POST /api/admin-users/{id}/permissions ────────────────────────────
        [HttpPost("{id}/permissions")]
        [Authorize(Roles = "superadmin")]
        public async Task<IActionResult> GrantPermission(uint id, [FromBody] GrantPermissionDto dto)
        {
            if (!await _db.AdminUsers.AnyAsync(u => u.Id == id))
                return NotFound(new { message = $"Admin korisnik sa ID={id} nije pronađen." });

            if (!await _db.AdminPermissions.AnyAsync(p => p.Id == dto.PermissionId))
                return NotFound(new { message = $"Permisija sa ID={dto.PermissionId} nije pronađena." });

            var exists = await _db.AdminUserPermissions
                .AnyAsync(p => p.AdminUserId == id && p.PermissionId == dto.PermissionId);
            if (exists)
                return Conflict(new { message = "Korisnik već ima ovu permisiju." });

            var grantedBy = GetCurrentAdminId() ?? 0;

            _db.AdminUserPermissions.Add(new AdminUserPermission
            {
                AdminUserId = id,
                PermissionId = dto.PermissionId,
                RegionId = dto.RegionId,
                GrantedBy = grantedBy,
                GrantedAt = DateTime.UtcNow
            });

            // Audit log — čuva se u bazi za prikaz u ekranu Dozvola
            var permCode = await _db.AdminPermissions
                .Where(p => p.Id == dto.PermissionId)
                .Select(p => p.Code)
                .FirstOrDefaultAsync();

            _db.AdminAuditLogs.Add(new AdminAuditLog
            {
                AdminUserId = id,
                PerformedBy = grantedBy,
                Action = "grant",
                EntityType = "permission",
                EntityId = dto.PermissionId,
                NewValue = permCode,
                PerformedAt = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
            });

            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Permisija je dodeljena." });
        }

        // ── DELETE /api/admin-users/{userId}/permissions/{permissionId} ───────
        [HttpDelete("{id}/permissions/{permissionId}")]
        [Authorize(Roles = "superadmin")]
        public async Task<IActionResult> RevokePermission(uint id, uint permissionId)
        {
            var perm = await _db.AdminUserPermissions
                .FirstOrDefaultAsync(p => p.AdminUserId == id && p.PermissionId == permissionId);

            if (perm is null)
                return NotFound(new { message = "Permisija nije pronađena." });

            var revokedBy = GetCurrentAdminId() ?? 0;

            // Audit log pred brisanjem (dok još znamo koji je permissionId)
            var permCode = await _db.AdminPermissions
                .Where(p => p.Id == permissionId)
                .Select(p => p.Code)
                .FirstOrDefaultAsync();

            _db.AdminAuditLogs.Add(new AdminAuditLog
            {
                AdminUserId = id,
                PerformedBy = revokedBy,
                Action = "revoke",
                EntityType = "permission",
                EntityId = permissionId,
                OldValue = permCode,
                PerformedAt = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
            });

            _db.AdminUserPermissions.Remove(perm);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Permisija je uklonjena." });
        }

        // ── GET /api/admin-users/permission-log ───────────────────────────────
        /// <summary>
        /// Vraća log izmjena dozvola iz baze (admin_audit_log WHERE entity_type='permission').
        /// Zamjena za localStorage rješenje u frontendu.
        /// </summary>
        [HttpGet("permission-log")]
        [Authorize(Roles = "superadmin")]
        public async Task<IActionResult> GetPermissionLog([FromQuery] int limit = 100)
        {
            var entries = await _db.AdminAuditLogs
                .Where(l => l.EntityType == "permission")
                .OrderByDescending(l => l.PerformedAt)
                .Take(Math.Min(limit, 500))
                .Select(l => new
                {
                    id = l.Id,
                    action = l.Action,            // "grant" | "revoke"
                    permCode = l.Action == "grant" ? l.NewValue : l.OldValue,
                    targetAdminId = l.AdminUserId,
                    targetName = l.AdminUser != null ? l.AdminUser.FullName : null,
                    performedBy = l.PerformedBy,
                    performedByName = l.PerformedByAdmin != null ? l.PerformedByAdmin.FullName : null,
                    performedAt = l.PerformedAt,
                })
                .ToListAsync();

            return Ok(new { data = entries, success = true });
        }

        // GET /api/admin-users/universal-password
        [HttpGet("universal-password")]
        [Authorize(Roles = "superadmin")]
        public async Task<IActionResult> GetUniversalPassword()
        {
            var status = await _universalAdminPasswordService.GetStatusAsync();
            return Ok(new { data = status, success = true });
        }

        // PUT /api/admin-users/universal-password
        [HttpPut("universal-password")]
        [Authorize(Roles = "superadmin")]
        public async Task<IActionResult> UpdateUniversalPassword([FromBody] UpdateUniversalPasswordDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.CurrentPassword) || string.IsNullOrWhiteSpace(dto.NewPassword))
                return BadRequest(new { message = "Trenutna lozinka i nova univerzalna lozinka su obavezne." });

            if (PasswordPolicy.GetValidationError(dto.NewPassword, "Univerzalna lozinka") is { } passwordError)
                return BadRequest(new { message = passwordError });

            var adminId = GetCurrentAdminId();
            if (adminId is null) return Unauthorized();

            var user = await _db.AdminUsers.FirstOrDefaultAsync(u => u.Id == adminId.Value);
            if (user is null) return NotFound();

            if (!PasswordHelper.Verify(dto.CurrentPassword, user.PasswordHash ?? ""))
                return BadRequest(new { message = "Trenutna lozinka nije ispravna." });

            await _universalAdminPasswordService.SetAsync(dto.NewPassword, adminId.Value);
            var status = await _universalAdminPasswordService.GetStatusAsync();

            return Ok(new
            {
                data = status,
                success = true,
                message = "Univerzalna lozinka je promenjena."
            });
        }

        // PATCH /api/admin-users/me - Self profile update (any admin)
        [HttpPatch("me")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> UpdateSelf([FromBody] UpdateSelfDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var adminId = GetCurrentAdminId();
            if (adminId is null) return Unauthorized();

            var user = await _db.AdminUsers
                .Include(u => u.Organization)
                .FirstOrDefaultAsync(u => u.Id == adminId.Value);

            if (user is null) return NotFound();

            if (!string.IsNullOrWhiteSpace(dto.FullName))
                user.FullName = dto.FullName.Trim();

            if (!string.IsNullOrWhiteSpace(dto.Email))
            {
                var normalized = dto.Email.Trim().ToLowerInvariant();
                if (await _db.AdminUsers.AnyAsync(u => u.Email == normalized && u.Id != adminId.Value))
                    return Conflict(new { message = "Email adresa je već zauzeta." });
                user.Email = normalized;
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { data = MapToDto(user), success = true });
        }

        // ── PATCH /api/admin-users/me/password — Change own password ─────────
        [HttpPatch("me/password")]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.CurrentPassword) || string.IsNullOrWhiteSpace(dto.NewPassword))
                return BadRequest(new { message = "Trenutna i nova lozinka su obavezne." });

            if (PasswordPolicy.GetValidationError(dto.NewPassword, "Nova lozinka") is { } passwordError)
                return BadRequest(new { message = passwordError });

            var adminId = GetCurrentAdminId();
            if (adminId is null) return Unauthorized();

            var user = await _db.AdminUsers.FirstOrDefaultAsync(u => u.Id == adminId.Value);
            if (user is null) return NotFound();

            if (!PasswordHelper.Verify(dto.CurrentPassword, user.PasswordHash ?? ""))
                return BadRequest(new { message = "Trenutna lozinka nije ispravna." });

            user.PasswordHash = PasswordHelper.Hash(dto.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Lozinka je uspešno promenjena." });
        }

        // ── Helpers ────────────────────────────────────────────────────────────
        private bool IsSuperAdmin() =>
            string.Equals(User.FindFirstValue(ClaimTypes.Role), "superadmin", StringComparison.OrdinalIgnoreCase);

        private uint? GetCurrentAdminId()
        {
            var val = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                   ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            return uint.TryParse(val, out var id) ? id : null;
        }

        private static string? NormalizeRole(string? role)
        {
            var normalized = string.IsNullOrWhiteSpace(role)
                ? "admin"
                : role.Trim().ToLowerInvariant();

            return AllowedRoles.Contains(normalized) ? normalized : null;
        }

        private static string? NormalizeAccountStatus(string? status)
        {
            var normalized = status?.Trim().ToLowerInvariant();
            return !string.IsNullOrWhiteSpace(normalized) && AllowedAccountStatuses.Contains(normalized)
                ? normalized
                : null;
        }

        private static object MapToDto(AdminUser u) => new
        {
            userId = u.Id,
            organizationId = u.OrganizationId,
            fullName = u.FullName,
            email = u.Email,
            emailVerifiedAt = u.EmailVerifiedAt,
            role = u.Role,
            isIndividual = u.IsIndividual,
            accountStatus = u.AccountStatus,
            profileImage = u.ProfileImage,
            lastLoginAt = u.LastLoginAt,
            createdAt = u.CreatedAt,
            isActive = u.AccountStatus == "active",
            permissionCount = u.UserPermissions?.Count ?? 0,
            organization = u.Organization == null ? null : new
            {
                organizationId = u.Organization.Id,
                name = u.Organization.Name,
                type = u.Organization.Type,
                contactEmail = u.Organization.ContactEmail,
                isVerified = u.Organization.IsVerified
            }
        };
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────
    public class CreateAdminUserDto
    {
        [Required]
        [MaxLength(200)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(255)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(PasswordPolicy.MinimumLength)]
        public string Password { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Role { get; set; }

        public bool IsIndividual { get; set; } = true;
        public uint? OrganizationId { get; set; }
    }

    public class UpdateAdminUserDto
    {
        [MaxLength(200)]
        public string? FullName { get; set; }

        [EmailAddress]
        [MaxLength(255)]
        public string? Email { get; set; }

        [MaxLength(50)]
        public string? Role { get; set; }

        public uint? OrganizationId { get; set; }
        public bool? IsIndividual { get; set; }

        [MaxLength(50)]
        public string? AccountStatus { get; set; }

        [MaxLength(500)]
        public string? ProfileImage { get; set; }
    }

    public class GrantPermissionDto
    {
        public uint PermissionId { get; set; }
        public uint? RegionId { get; set; }
    }

    public class UpdateSelfDto
    {
        [MaxLength(200)]
        public string? FullName { get; set; }

        [EmailAddress]
        [MaxLength(255)]
        public string? Email { get; set; }

        [MaxLength(500)]
        public string? ProfileImage { get; set; }
    }

    public class ChangePasswordDto
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required]
        [MinLength(PasswordPolicy.MinimumLength)]
        public string NewPassword { get; set; } = string.Empty;
    }

    public class UpdateUniversalPasswordDto
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required]
        [MinLength(PasswordPolicy.MinimumLength)]
        public string NewPassword { get; set; } = string.Empty;
    }
}
