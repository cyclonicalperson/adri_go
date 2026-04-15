using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace TouristGuide.Api.Services
{
    /// <summary>
    /// Pomocni servis koji kontroleri koriste da procitaju
    /// identitet prijavljenog admin korisnika iz JWT tokena.
    /// </summary>
    public class AdminIdentityService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AdminIdentityService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        private ClaimsPrincipal? CurrentUser => _httpContextAccessor.HttpContext?.User;

        /// <summary>
        /// Vraca ID prijavljenog admin korisnika.
        /// Vraca null ako korisnik nije prijavljen ili ID nije citljiv.
        /// </summary>
        public uint? GetAdminId()
        {
            var value = CurrentUser?.FindFirstValue(JwtRegisteredClaimNames.Sub)
                     ?? CurrentUser?.FindFirstValue(ClaimTypes.NameIdentifier);

            return uint.TryParse(value, out var id) ? id : null;
        }

        /// <summary>
        /// Vraca true ako je prijavljeni korisnik SuperAdmin.
        /// </summary>
        public bool IsSuperAdmin()
        {
            var role = CurrentUser?.FindFirstValue(ClaimTypes.Role);
            return string.Equals(role, "superadmin", StringComparison.OrdinalIgnoreCase);
        }
    }
}
