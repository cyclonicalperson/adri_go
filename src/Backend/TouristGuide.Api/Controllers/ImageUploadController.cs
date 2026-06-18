using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TouristGuide.Api.Services;

namespace TouristGuide.Api.Controllers
{
    /// <summary>
    /// Kontroler za upload slika.
    /// Slike se čuvaju na Cloudinary cloud storage-u.
    /// URL koji Cloudinary vrati čuva se u bazi umjesto lokalne putanje.
    ///
    /// Tok:
    ///   1. Frontend šalje POST /api/images/upload sa slikom (multipart/form-data)
    ///   2. Backend uploaduje na Cloudinary i vraća { url: "https://res.cloudinary.com/..." }
    ///   3. Frontend dodaje taj URL u niz i šalje ga pri kreiranju/editovanju posta
    ///   4. Post.Images = JSON.stringify(["https://res.cloudinary.com/...", ...])
    /// </summary>
    [ApiController]
    [Route("api/images")]
    public class ImageUploadController : ControllerBase
    {
        private readonly ICloudinaryService _cloudinaryService;
        private readonly ILogger<ImageUploadController> _logger;

        public ImageUploadController(ICloudinaryService cloudinaryService, ILogger<ImageUploadController> logger)
        {
            _cloudinaryService = cloudinaryService;
            _logger = logger;
        }

        /// <summary>
        /// Upload jedne slike za objavu.
        /// Returns: { url: "https://res.cloudinary.com/..." }
        /// </summary>
        [Authorize(Roles = "admin,superadmin")]
        [HttpPost("upload")]
        public async Task<IActionResult> UploadPostImage(IFormFile file)
            => await UploadToFolder(file, "posts");

        /// <summary>
        /// Upload profilne slike za admina ili turistu.
        /// </summary>
        [Authorize(Roles = "admin,superadmin,tourist")]
        [HttpPost("upload/profile")]
        public async Task<IActionResult> UploadProfileImage(IFormFile file)
            => await UploadToFolder(file, "profiles");

        /// <summary>
        /// Upload cover slike za regiju.
        /// </summary>
        [Authorize(Roles = "admin,superadmin")]
        [HttpPost("upload/region")]
        public async Task<IActionResult> UploadRegionImage(IFormFile file)
            => await UploadToFolder(file, "regions");

        /// <summary>
        /// Upload više slika odjednom (do 10).
        /// Returns: { urls: ["https://res.cloudinary.com/...", ...] }
        /// </summary>
        [Authorize(Roles = "admin,superadmin")]
        [HttpPost("upload/multiple")]
        public async Task<IActionResult> UploadMultiple(List<IFormFile> files)
        {
            if (files == null || files.Count == 0)
                return BadRequest(new { error = "Nema fajlova za upload." });

            if (files.Count > 10)
                return BadRequest(new { error = "Maksimalno 10 slika odjednom." });

            var urls = new List<string>();

            foreach (var file in files)
            {
                try
                {
                    var url = await _cloudinaryService.UploadImageAsync(file, "posts");
                    urls.Add(url);
                }
                catch (ArgumentException ex)
                {
                    return BadRequest(new { error = ex.Message });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Greška pri uploadu slike.");
                    return StatusCode(500, new { error = "Greška pri uploadu slike. Pokušajte ponovo." });
                }
            }

            return Ok(new { urls });
        }

        // ── Helper ──────────────────────────────────────────────────────────

        private async Task<IActionResult> UploadToFolder(IFormFile file, string folder)
        {
            try
            {
                var url = await _cloudinaryService.UploadImageAsync(file, folder);
                return Ok(new { url });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Greška pri uploadu slike.");
                return StatusCode(500, new { error = "Greška pri uploadu slike. Pokušajte ponovo." });
            }
        }
    }
}
