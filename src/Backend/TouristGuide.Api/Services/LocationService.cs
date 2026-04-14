using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.DTOs;
using TouristGuide.Api.Models;

namespace TouristGuide.Api.Services
{
    /// <summary>
    /// Implementacija servisa za lokacije.
    ///
    /// Logika vidljivosti:
    ///   - Super Admin  → vidi SVE lokacije (regione) u sistemu
    ///   - Admin        → vidi samo lokacije za koje je vlasnik
    ///                    bar jedne objave (Post.AdminId == adminId)
    /// </summary>
    public class LocationService : ILocationService
    {
        private readonly AppDbContext _context;

        public LocationService(AppDbContext context)
        {
            _context = context;
        }

        // ────────────────────────────────────────────────────────────
        // Super Admin: sve lokacije
        // ────────────────────────────────────────────────────────────
        public async Task<LocationListResponseDto> GetAllLocationsAsync(
            string? search,
            string? type,
            bool? isActive,
            int page,
            int pageSize)
        {
            var query = BuildBaseQuery(search, type, isActive);
            return await ProjectAndPaginateAsync(query, page, pageSize);
        }

        // ────────────────────────────────────────────────────────────
        // Admin: samo lokacije sa kojima je admin povezan kroz Post-ove
        // ────────────────────────────────────────────────────────────
        public async Task<LocationListResponseDto> GetLocationsByAdminAsync(
            uint adminId,
            string? search,
            string? type,
            bool? isActive,
            int page,
            int pageSize)
        {
            // ID-evi regiona na kojima ovaj admin ima bar jednu objavu
            var managedRegionIds = await _context.Posts
                .Where(p => p.AdminId == adminId && p.RegionId != null)
                .Select(p => p.RegionId!.Value)
                .Distinct()
                .ToListAsync();

            var query = BuildBaseQuery(search, type, isActive)
                .Where(r => managedRegionIds.Contains(r.Id));

            return await ProjectAndPaginateAsync(query, page, pageSize);
        }

        // ────────────────────────────────────────────────────────────
        // Privatne pomoćne metode
        // ────────────────────────────────────────────────────────────

        /// <summary>
        /// Gradi osnovni IQueryable sa filterima zajedničkim za oba slučaja.
        /// </summary>
        private IQueryable<Region> BuildBaseQuery(
            string? search,
            string? type,
            bool? isActive)
        {
            var query = _context.Regions.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(r =>
                    r.Name.ToLower().Contains(term) ||
                    (r.Description != null && r.Description.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(type))
            {
                var typeLower = type.Trim().ToLower();
                query = query.Where(r => r.Type.ToLower() == typeLower);
            }

            if (isActive.HasValue)
            {
                query = query.Where(r => r.IsActive == isActive.Value);
            }

            return query;
        }

        /// <summary>
        /// Projektuje Region → DTO, broji postove i primenjuje paginaciju.
        /// </summary>
        private async Task<LocationListResponseDto> ProjectAndPaginateAsync(
            IQueryable<Region> query,
            int page,
            int pageSize)
        {
            // Normalizacija parametara
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var total = await query.CountAsync();

            var regions = await query
                .OrderBy(r => r.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Dohvatamo broj postova za svaki region odjednom (jedan upit)
            var regionIds = regions.Select(r => r.Id).ToList();
            var postCountsPerRegion = await _context.Posts
                .Where(p => p.RegionId != null && regionIds.Contains(p.RegionId!.Value))
                .GroupBy(p => p.RegionId!.Value)
                .Select(g => new { RegionId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.RegionId, x => x.Count);

            var data = regions.Select(r => new LocationListItemDto
            {
                Id = r.Id,
                Name = r.Name,
                Type = r.Type,
                Description = r.Description,
                Country = r.Country,
                Lat = r.Lat,
                Lng = r.Lng,
                CoverImage = r.CoverImage,
                IsActive = r.IsActive,
                CreatedAt = r.CreatedAt,
                PostCount = postCountsPerRegion.TryGetValue(r.Id, out var count) ? count : 0
            }).ToList();

            return new LocationListResponseDto
            {
                Total = total,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)total / pageSize),
                Data = data
            };
        }
    }
}
