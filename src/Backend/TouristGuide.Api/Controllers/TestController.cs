using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TestController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TestController(AppDbContext context)
        {
            _context = context;
        }

        // GET api/test/ping
        [HttpGet("ping")]
        public IActionResult Ping()
        {
            return Ok(new { message = "API radi!" });
        }

        // GET api/test/db
        [HttpGet("db")]
        public async Task<IActionResult> TestDb()
        {
            try
            {
                var canConnect = await _context.Database.CanConnectAsync();
                if (!canConnect)
                    return StatusCode(500, new { message = "Ne mogu da se povežem sa bazom." });

                var adminCount = await _context.AdminUsers.CountAsync();
                var touristCount = await _context.Tourists.CountAsync();
                var postCount = await _context.Posts.CountAsync();
                var regionCount = await _context.Regions.CountAsync();

                return Ok(new
                {
                    message = "Konekcija sa bazom uspešna!",
                    admins = adminCount,
                    tourists = touristCount,
                    posts = postCount,
                    regions = regionCount
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Greška", error = ex.Message });
            }
        }

        // GET api/test/regions
        [HttpGet("regions")]
        public async Task<IActionResult> GetRegions()
        {
            var regions = await _context.Regions
                .Select(r => new { r.Id, r.Name, r.Type, r.Country })
                .ToListAsync();

            return Ok(regions);
        }

        // GET api/test/posts
        [HttpGet("posts")]
        public async Task<IActionResult> GetPosts()
        {
            var posts = await _context.Posts
                .Select(p => new { p.Id, p.Title, p.PostType, p.Status })
                .Take(10)
                .ToListAsync();

            return Ok(posts);
        }
    }
}