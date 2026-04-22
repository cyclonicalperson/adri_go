using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace TouristGuide.Api.Services
{
    public interface ICloudinaryService
    {
        Task<string> UploadImageAsync(IFormFile file, string folder);
        Task<bool> DeleteImageAsync(string publicId);
    }

    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;
        private readonly ILogger<CloudinaryService> _logger;

        private static readonly HashSet<string> AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
        private static readonly HashSet<string> AllowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
        private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5MB

        public CloudinaryService(IConfiguration config, ILogger<CloudinaryService> logger)
        {
            _logger = logger;

            var cloudName = config["Cloudinary:CloudName"]
                ?? throw new InvalidOperationException("Cloudinary:CloudName nije postavljen.");
            var apiKey = config["Cloudinary:ApiKey"]
                ?? throw new InvalidOperationException("Cloudinary:ApiKey nije postavljen.");
            var apiSecret = config["Cloudinary:ApiSecret"]
                ?? throw new InvalidOperationException("Cloudinary:ApiSecret nije postavljen.");

            var account = new Account(cloudName, apiKey, apiSecret);
            _cloudinary = new Cloudinary(account);
            _cloudinary.Api.Secure = true;
        }

        public async Task<string> UploadImageAsync(IFormFile file, string folder)
        {
            // Validacija
            if (file == null || file.Length == 0)
                throw new ArgumentException("Fajl je prazan ili nije poslan.");

            if (file.Length > MaxFileSizeBytes)
                throw new ArgumentException("Slika je prevelika. Maksimum je 5MB.");

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                throw new ArgumentException("Tip fajla nije dozvoljen. Koristite: jpg, jpeg, png, webp.");

            if (!AllowedMimeTypes.Contains(file.ContentType.ToLowerInvariant()))
                throw new ArgumentException("Content-Type nije ispravan.");

            // Upload na Cloudinary
            await using var stream = file.OpenReadStream();

            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = $"tourist-guide/{folder}",
                // Automatska optimizacija kvaliteta i formata
                Transformation = new Transformation()
                    .Quality("auto")
                    .FetchFormat("auto"),
                UniqueFilename = true,
                Overwrite = false
            };

            var result = await _cloudinary.UploadAsync(uploadParams);

            if (result.Error != null)
            {
                _logger.LogError("Cloudinary greška: {Error}", result.Error.Message);
                throw new Exception($"Greška pri uploadu: {result.Error.Message}");
            }

            _logger.LogInformation("Slika uploadovana na Cloudinary: {Url}", result.SecureUrl);
            return result.SecureUrl.ToString();
        }

        public async Task<bool> DeleteImageAsync(string publicId)
        {
            var deleteParams = new DeletionParams(publicId);
            var result = await _cloudinary.DestroyAsync(deleteParams);
            return result.Result == "ok";
        }
    }
}