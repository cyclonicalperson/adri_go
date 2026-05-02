using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using TouristGuide.Api.Services.Interfaces;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecommendationsController : ControllerBase
    {
        private readonly IRecommendationService _recommendationService;

        public RecommendationsController(IRecommendationService recommendationService)
        {
            _recommendationService = recommendationService;
        }

        // Jedan glavni recommender endpoint.
        // Servis sam odlucuje da li krece od popularity fallback-a
        // ili od personalizovanog ranking-a.
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetRecommendations(
            [FromQuery] uint regionId,
            [FromQuery] uint? touristId,
            [FromQuery] string contextMode = "onsite",
            [FromQuery] int take = 10)
        {
            if (regionId == 0)
                return BadRequest(new { message = "regionId je obavezan." });

            var resolvedTouristId = touristId ?? GetAuthorizedTouristId();
            var data = await _recommendationService.GetRecommendationsAsync(
                regionId,
                resolvedTouristId,
                contextMode,
                take);

            return Ok(data);
        }

        private uint? GetAuthorizedTouristId()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

            return uint.TryParse(value, out var touristId) ? touristId : null;
        }
    }
}
