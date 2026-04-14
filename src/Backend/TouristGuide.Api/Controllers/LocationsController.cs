using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TouristGuide.Api.Services;

namespace TouristGuide.Api.Controllers
{
    /// <summary>
    /// Kontroler za upravljanje lokacijama (regionima) u Admin panelu.
    ///
    /// Pristup:
    ///   GET /api/locations  →  Super Admin vidi sve; Admin vidi samo svoje.
    /// </summary>
    [ApiController]
    [Route("api/locations")]
    [Authorize(Roles = "admin,superadmin")]
    public class LocationsController : ControllerBase
    {
        private readonly ILocationService _locationService;

        public LocationsController(ILocationService locationService)
        {
            _locationService = locationService;
        }

        /// <summary>
        /// Vraća listu lokacija u zavisnosti od uloge prijavljenog korisnika.
        ///
        /// Super Admin → sve lokacije u sistemu
        /// Admin       → samo lokacije na kojima ima bar jednu objavu
        /// </summary>
        /// <param name="search">Pretraga po nazivu ili opisu (opciono)</param>
        /// <param name="type">Filter po tipu lokacije: city, mountain, lake… (opciono)</param>
        /// <param name="isActive">Filter po statusu aktivnosti (opciono)</param>
        /// <param name="page">Broj stranice, počinje od 1 (podrazumevano: 1)</param>
        /// <param name="pageSize">Veličina stranice, max 100 (podrazumevano: 20)</param>
        [HttpGet]
        public async Task<IActionResult> GetLocations(
            [FromQuery] string? search,
            [FromQuery] string? type,
            [FromQuery] bool? isActive,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var role = User.FindFirstValue(ClaimTypes.Role);

            // ── Super Admin: vidi sve lokacije ──────────────────────
            if (string.Equals(role, "superadmin", StringComparison.OrdinalIgnoreCase))
            {
                var result = await _locationService.GetAllLocationsAsync(
                    search, type, isActive, page, pageSize);

                return Ok(result);
            }

            // ── Admin: vidi samo svoje lokacije ─────────────────────
            if (string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase))
            {
                var adminId = GetCurrentAdminId();
                if (adminId is null)
                    return Unauthorized(new { message = "Nije moguće utvrditi identitet admina." });

                var result = await _locationService.GetLocationsByAdminAsync(
                    adminId.Value, search, type, isActive, page, pageSize);

                return Ok(result);
            }

            // ── Nepoznata uloga (ne bi trebalo da se desi) ───────────
            return Forbid();
        }

        // ────────────────────────────────────────────────────────────
        // Privatna pomoćna metoda
        // ────────────────────────────────────────────────────────────

        /// <summary>
        /// Čita ID prijavljenog admina iz JWT tokena.
        /// Claim "sub" sadrži uint ID korisnika.
        /// </summary>
        private uint? GetCurrentAdminId()
        {
            var value = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                     ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

            return uint.TryParse(value, out var id) ? id : null;
        }
    }
}
