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
        private static readonly HashSet<string> AllowedFolders = ["posts", "profiles", "regions"];
        private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5MB

        public CloudinaryService(IConfiguration config, ILogger<CloudinaryService> logger)
        {
            _logger = logger;

            var cloudName = GetRequiredConfig(config, "Cloudinary:CloudName");
            var apiKey = GetRequiredConfig(config, "Cloudinary:ApiKey");
            var apiSecret = GetRequiredConfig(config, "Cloudinary:ApiSecret");

            var account = new Account(cloudName, apiKey, apiSecret);
            _cloudinary = new Cloudinary(account);
            _cloudinary.Api.Secure = true;
        }

        public async Task<string> UploadImageAsync(IFormFile file, string folder)
        {
            if (!AllowedFolders.Contains(folder))
                throw new ArgumentException("Folder za upload nije dozvoljen.");

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

            if (!await HasAllowedImageSignatureAsync(file, ext))
                throw new ArgumentException("Sadrzaj fajla ne odgovara dozvoljenom tipu slike.");

            // Upload na Cloudinary
            await using var stream = file.OpenReadStream();

            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription($"{Guid.NewGuid():N}{ext}", stream),
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
                throw new InvalidOperationException("Greška pri uploadu slike.");
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

        private static async Task<bool> HasAllowedImageSignatureAsync(IFormFile file, string extension)
        {
            var header = new byte[12];
            await using var stream = file.OpenReadStream();
            var read = await stream.ReadAsync(header);

            return extension switch
            {
                ".jpg" or ".jpeg" => read >= 3 &&
                    header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
                ".png" => read >= 8 &&
                    header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
                    header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A,
                ".webp" => read >= 12 &&
                    header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
                    header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50,
                _ => false
            };
        }

        private static string GetRequiredConfig(IConfiguration config, string key)
        {
            var value = config[key];
            return !string.IsNullOrWhiteSpace(value)
                ? value
                : throw new InvalidOperationException($"{key} nije postavljen.");
        }
    }
}
