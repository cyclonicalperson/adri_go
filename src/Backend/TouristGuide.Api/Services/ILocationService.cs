using TouristGuide.Api.DTOs;

namespace TouristGuide.Api.Services
{
    /// <summary>
    /// Servis za rad sa lokacijama (regionima) u Admin panelu.
    /// </summary>
    public interface ILocationService
    {
        /// <summary>
        /// Vraća paginiranu listu svih lokacija.
        /// Dostupno samo Super Adminu.
        /// </summary>
        Task<LocationListResponseDto> GetAllLocationsAsync(
            string? search,
            string? type,
            bool? isActive,
            int page,
            int pageSize);

        /// <summary>
        /// Vraća paginiranu listu lokacija kojima dati admin upravlja.
        /// "Admin upravlja lokacijom" = ima bar jednu objavu vezanu za tu lokaciju.
        /// </summary>
        Task<LocationListResponseDto> GetLocationsByAdminAsync(
            uint adminId,
            string? search,
            string? type,
            bool? isActive,
            int page,
            int pageSize);
    }
}
