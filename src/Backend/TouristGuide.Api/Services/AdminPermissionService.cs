using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;

namespace TouristGuide.Api.Services
{
    /// <summary>
    /// Centralizovana provera dozvola za prijavljene admin korisnike.
    /// Superadmin automatski prolazi sve provere.
    /// </summary>
    public class AdminPermissionService
    {
        private readonly AppDbContext _dbContext;
        private readonly AdminIdentityService _adminIdentityService;

        public AdminPermissionService(AppDbContext dbContext, AdminIdentityService adminIdentityService)
        {
            _dbContext = dbContext;
            _adminIdentityService = adminIdentityService;
        }

        public uint? GetAdminId() => _adminIdentityService.GetAdminId();

        public bool IsSuperAdmin() => _adminIdentityService.IsSuperAdmin();

        public Task<bool> CanViewAnalyticsAsync() => HasPermissionInAnyScopeAsync("view_analytics");

        public Task<bool> CanManageReviewsAsync() => HasPermissionAsync("manage_reviews");

        public Task<bool> CanManageTagsAsync() => HasPermissionAsync("manage_tags");

        public Task<bool> CanViewTouristsAsync() => HasPermissionAsync("view_tourists");

        public async Task<bool> CanManageOwnContentAsync(uint ownerAdminId, uint? regionId = null)
        {
            if (IsSuperAdmin())
                return true;

            var adminId = GetAdminId();
            if (adminId is null || adminId.Value != ownerAdminId)
                return false;

            return await HasPermissionAsync("manage_own_posts", regionId);
        }

        public async Task<bool> HasPermissionAsync(string code, uint? regionId = null)
        {
            if (IsSuperAdmin())
                return true;

            var adminId = GetAdminId();
            if (adminId is null || string.IsNullOrWhiteSpace(code))
                return false;

            var normalizedCode = code.Trim().ToLowerInvariant();

            var query = _dbContext.AdminUserPermissions
                .AsNoTracking()
                .Where(up =>
                    up.AdminUserId == adminId.Value &&
                    up.Permission.Code.ToLower() == normalizedCode);

            query = ApplyRegionScope(query, regionId);

            return await query.AnyAsync();
        }

        public async Task<bool> HasAnyPermissionAsync(uint? regionId = null, params string[] codes)
        {
            if (IsSuperAdmin())
                return true;

            var adminId = GetAdminId();
            if (adminId is null)
                return false;

            var normalizedCodes = codes
                .Where(code => !string.IsNullOrWhiteSpace(code))
                .Select(code => code.Trim().ToLowerInvariant())
                .Distinct()
                .ToList();

            if (normalizedCodes.Count == 0)
                return false;

            var query = _dbContext.AdminUserPermissions
                .AsNoTracking()
                .Where(up =>
                    up.AdminUserId == adminId.Value &&
                    normalizedCodes.Contains(up.Permission.Code.ToLower()));

            query = ApplyRegionScope(query, regionId);

            return await query.AnyAsync();
        }

        public async Task<bool> HasPermissionInAnyScopeAsync(string code)
        {
            if (IsSuperAdmin())
                return true;

            var adminId = GetAdminId();
            if (adminId is null || string.IsNullOrWhiteSpace(code))
                return false;

            var normalizedCode = code.Trim().ToLowerInvariant();

            return await _dbContext.AdminUserPermissions
                .AsNoTracking()
                .AnyAsync(up =>
                    up.AdminUserId == adminId.Value &&
                    up.Permission.Code.ToLower() == normalizedCode);
        }

        public async Task<bool> HasGlobalPermissionAsync(string code)
        {
            if (IsSuperAdmin())
                return true;

            var adminId = GetAdminId();
            if (adminId is null || string.IsNullOrWhiteSpace(code))
                return false;

            var normalizedCode = code.Trim().ToLowerInvariant();

            return await _dbContext.AdminUserPermissions
                .AsNoTracking()
                .AnyAsync(up =>
                    up.AdminUserId == adminId.Value &&
                    up.RegionId == null &&
                    up.Permission.Code.ToLower() == normalizedCode);
        }

        public async Task<IReadOnlyCollection<uint>> GetScopedRegionIdsAsync(string code)
        {
            if (IsSuperAdmin())
                return Array.Empty<uint>();

            var adminId = GetAdminId();
            if (adminId is null || string.IsNullOrWhiteSpace(code))
                return Array.Empty<uint>();

            var normalizedCode = code.Trim().ToLowerInvariant();

            return await _dbContext.AdminUserPermissions
                .AsNoTracking()
                .Where(up =>
                    up.AdminUserId == adminId.Value &&
                    up.RegionId != null &&
                    up.Permission.Code.ToLower() == normalizedCode)
                .Select(up => up.RegionId!.Value)
                .Distinct()
                .ToListAsync();
        }

        private static IQueryable<Models.AdminUserPermission> ApplyRegionScope(
            IQueryable<Models.AdminUserPermission> query,
            uint? regionId)
        {
            return regionId.HasValue
                ? query.Where(up => up.RegionId == null || up.RegionId == regionId.Value)
                : query.Where(up => up.RegionId == null);
        }
    }
}
