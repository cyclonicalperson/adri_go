using Microsoft.AspNetCore.Mvc;
using MontenegroTourGuide.Api.Services.Interfaces;

namespace MontenegroTourGuide.Api.Controllers
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

        [HttpGet("cross-category")]
        public async Task<IActionResult> GetCrossCategoryRecommendations(
            [FromQuery] string sourceCategory,
            [FromQuery] int destinationId)
        {
            if (string.IsNullOrWhiteSpace(sourceCategory))
                return BadRequest("sourceCategory je obavezan.");

            if (destinationId <= 0)
                return BadRequest("destinationId mora biti validan.");

            var data = await _recommendationService.GetCrossCategoryRecommendationsAsync(sourceCategory, destinationId);
            return Ok(data);
        }
    }
}