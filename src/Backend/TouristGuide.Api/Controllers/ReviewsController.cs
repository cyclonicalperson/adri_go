using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TouristGuide.Api.Interfaces;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewsController : ControllerBase
    {
        private readonly IReviewService _reviewService;

        public ReviewsController(IReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        [HttpGet]
        [Authorize(Roles = "admin,superadmin")]
        public async Task<IActionResult> GetAll()
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            var currentAdminId = GetAuthorizedAdminId();

            if (currentAdminId is null)
                return Unauthorized(new { message = "Admin nije autentifikovan." });

            var reviews = await _reviewService.GetAllReviews(role ?? string.Empty, currentAdminId.Value);

            return Ok(new
            {
                total = reviews.Count,
                data = reviews
            });
        }

        private uint? GetAuthorizedAdminId()
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            if (!string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(role, "superadmin", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            return uint.TryParse(value, out var adminId) ? adminId : null;
        }
    }
}
