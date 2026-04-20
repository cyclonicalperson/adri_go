using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TouristGuide.Api.Controllers
{
    /// <summary>
    /// Kontroler za upload slika.
    /// Slike se čuvaju na disku (u /images/posts/ folderu backenda),
    /// a URL putanja se vraća frontendu da je doda u JSON niz "images" polja.
    ///
    /// Tok:
    ///   1. Frontend šalje POST /api/images/upload sa slikom (multipart/form-data)
    ///   2. Backend čuva fajl na disku i vraća { url: "/images/posts/uuid.jpg" }
    ///   3. Frontend dodaje taj URL u niz i šalje ga pri kreiranju/editovanju posta
    ///   4. Post.Images = JSON.stringify(["/images/posts/uuid.jpg", ...])
    /// </summary>
    [ApiController]
    [Route("api/images")]
    [Authorize] // Samo admin može upload-ati slike
    public class ImageUploadController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<ImageUploadController> _logger;

        // Dozvoljeni tipovi fajlova
        private static readonly HashSet<string> AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
        private static readonly HashSet<string> AllowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

        // Maksimalna veličina: 5MB
        private const long MaxFileSizeBytes = 5 * 1024 * 1024;

        public ImageUploadController(IWebHostEnvironment env, ILogger<ImageUploadController> logger)
        {
            _env = env;
            _logger = logger;
        }

        /// <summary>
        /// Upload jedne slike za objavu.
        /// Returns: { url: "/images/posts/abc123.jpg" }
        /// </summary>
        [HttpPost("upload")]
        public async Task<IActionResult> UploadPostImage(IFormFile file)
        {
            return await UploadToFolder(file, "posts");
        }

        /// <summary>
        /// Upload profilne slike za admina.
        /// Returns: { url: "/images/profiles/abc123.jpg" }
        /// </summary>
        [HttpPost("upload/profile")]
        public async Task<IActionResult> UploadProfileImage(IFormFile file)
        {
            return await UploadToFolder(file, "profiles");
        }

        /// <summary>
        /// Upload cover slike za regiju.
        /// Returns: { url: "/images/regions/abc123.jpg" }
        /// </summary>
        [HttpPost("upload/region")]
        public async Task<IActionResult> UploadRegionImage(IFormFile file)
        {
            return await UploadToFolder(file, "regions");
        }

        /// <summary>
        /// Upload više slika odjednom (do 10).
        /// Returns: { urls: ["/images/posts/abc.jpg", "/images/posts/def.jpg"] }
        /// </summary>
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
                var result = await SaveFile(file, "posts");
                if (result.Error != null)
                    return BadRequest(new { error = result.Error });

                urls.Add(result.Url!);
            }

            return Ok(new { urls });
        }

        // ── Interni helper metodi ────────────────────────────────────────────

        private async Task<IActionResult> UploadToFolder(IFormFile file, string subfolder)
        {
            var result = await SaveFile(file, subfolder);
            if (result.Error != null)
                return BadRequest(new { error = result.Error });

            return Ok(new { url = result.Url });
        }

        private async Task<(string? Url, string? Error)> SaveFile(IFormFile file, string subfolder)
        {
            // 1. Provjera da je fajl poslan
            if (file == null || file.Length == 0)
                return (null, "Fajl je prazan ili nije poslan.");

            // 2. Provjera veličine
            if (file.Length > MaxFileSizeBytes)
                return (null, $"Slika je prevelika. Maksimum je 5MB.");

            // 3. Provjera tipa fajla (ekstenzija)
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                return (null, $"Tip fajla nije dozvoljen. Koristite: jpg, jpeg, png, webp.");

            // 4. Provjera MIME tipa (content type koji browser šalje)
            if (!AllowedMimeTypes.Contains(file.ContentType.ToLowerInvariant()))
                return (null, $"Content-Type nije ispravan. Pošaljite sliku.");

            // 5. Generisanje jedinstvenog naziva fajla (UUID sprečava kolizije)
            var uniqueName = $"{Guid.NewGuid()}{ext}";

            // 6. Kreiranje putanje za čuvanje
            var imagesRoot = Path.Combine(_env.ContentRootPath, "images");
            var subfolderPath = Path.Combine(imagesRoot, subfolder);

            if (!Directory.Exists(subfolderPath))
                Directory.CreateDirectory(subfolderPath);

            var filePath = Path.Combine(subfolderPath, uniqueName);

            // 7. Čuvanje fajla na disk
            try
            {
                await using var stream = new FileStream(filePath, FileMode.Create);
                await file.CopyToAsync(stream);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Greška pri čuvanju slike: {FileName}", uniqueName);
                return (null, "Greška pri čuvanju slike. Pokušajte ponovo.");
            }

            // 8. URL koji frontend treba da sačuva u bazi
            // Ovaj URL odgovara StaticFiles konfiguraciji iz Program.cs:
            //   /images → ContentRootPath/images
            var url = $"/images/{subfolder}/{uniqueName}";

            _logger.LogInformation("Slika uploadovana: {Url}", url);
            return (url, null);
        }
    }
}