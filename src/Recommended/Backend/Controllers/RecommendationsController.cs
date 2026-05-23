using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using TouristGuide.Api.Services;
using TouristGuide.Api.Services.Interfaces;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecommendationsController : ControllerBase
    {
        private readonly IRecommendationService _recommendationService;
        private readonly TouristNotificationService _touristNotificationService;

        public RecommendationsController(
            IRecommendationService recommendationService,
            TouristNotificationService touristNotificationService)
        {
            _recommendationService = recommendationService;
            _touristNotificationService = touristNotificationService;
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

            var authorizedTouristId = GetAuthorizedTouristId();
            var resolvedTouristId = touristId ?? authorizedTouristId;
            var data = await _recommendationService.GetRecommendationsAsync(
                regionId,
                resolvedTouristId,
                contextMode,
                take);

            if (authorizedTouristId.HasValue && resolvedTouristId == authorizedTouristId.Value)
            {
                await _touristNotificationService.NotifyPersonalizedRecommendationsAsync(
                    authorizedTouristId.Value,
                    regionId,
                    data);
            }

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
