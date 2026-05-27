using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using TouristGuide.Api.Data;
using TouristGuide.Api.Models;

namespace TouristGuide.Api.Services
{
    public class UniversalAdminPasswordService
    {
        private const string SecretKey = "admin_universal_password";
        private const string ConfigurationHashKey = "AdminAuth:UniversalPasswordHash";

        private readonly AppDbContext _db;
        private readonly IDataProtector _protector;
        private readonly IConfiguration _configuration;
        private readonly ILogger<UniversalAdminPasswordService> _logger;

        public UniversalAdminPasswordService(
            AppDbContext db,
            IDataProtectionProvider dataProtectionProvider,
            IConfiguration configuration,
            ILogger<UniversalAdminPasswordService> logger)
        {
            _db = db;
            _protector = dataProtectionProvider.CreateProtector("TouristGuide.Api.AdminUniversalPassword.v1");
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<bool> VerifyAsync(string password, AdminUser targetUser)
        {
            if (string.IsNullOrEmpty(password) ||
                !string.Equals(targetUser.Role, "admin", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            var storedPassword = await GetStoredPasswordValueAsync();
            if (!string.IsNullOrWhiteSpace(storedPassword))
            {
                if (PasswordHelper.IsBcryptHash(storedPassword))
                {
                    return PasswordHelper.Verify(password, storedPassword);
                }

                var legacyPlaintext = TryUnprotect(storedPassword);
                return !string.IsNullOrEmpty(legacyPlaintext) &&
                    string.Equals(password, legacyPlaintext, StringComparison.Ordinal);
            }

            var universalPasswordHash = _configuration[ConfigurationHashKey];
            return !string.IsNullOrWhiteSpace(universalPasswordHash)
                && PasswordHelper.Verify(password, universalPasswordHash);
        }

        public async Task<UniversalAdminPasswordStatusDto> GetStatusAsync()
        {
            var secret = await _db.AdminSecrets
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Key == SecretKey);

            if (secret is null)
            {
                var hasConfigurationHash = !string.IsNullOrWhiteSpace(_configuration[ConfigurationHashKey]);
                return new UniversalAdminPasswordStatusDto
                {
                    IsConfigured = hasConfigurationHash,
                    CanReveal = false,
                    Password = null,
                    Source = hasConfigurationHash ? "configuration" : "none",
                    UpdatedAt = null,
                    UpdatedBy = null
                };
            }

            return new UniversalAdminPasswordStatusDto
            {
                IsConfigured = true,
                CanReveal = false,
                Password = null,
                Source = "database",
                UpdatedAt = secret.UpdatedAt,
                UpdatedBy = secret.UpdatedBy
            };
        }

        public async Task SetAsync(string password, uint updatedBy)
        {
            if (PasswordPolicy.GetValidationError(password, "Univerzalna lozinka") is { } passwordError)
            {
                throw new ArgumentException(passwordError, nameof(password));
            }

            var secret = await _db.AdminSecrets.FirstOrDefaultAsync(s => s.Key == SecretKey);
            if (secret is null)
            {
                secret = new AdminSecret { Key = SecretKey };
                _db.AdminSecrets.Add(secret);
            }

            secret.ProtectedValue = PasswordHelper.Hash(password);
            secret.UpdatedAt = DateTime.UtcNow;
            secret.UpdatedBy = updatedBy;

            await _db.SaveChangesAsync();
        }

        private async Task<string?> GetStoredPasswordValueAsync()
        {
            var protectedValue = await _db.AdminSecrets
                .AsNoTracking()
                .Where(s => s.Key == SecretKey)
                .Select(s => s.ProtectedValue)
                .FirstOrDefaultAsync();

            return string.IsNullOrWhiteSpace(protectedValue)
                ? null
                : protectedValue;
        }

        private string? TryUnprotect(string protectedValue)
        {
            try
            {
                return _protector.Unprotect(protectedValue);
            }
            catch (CryptographicException ex)
            {
                _logger.LogError(ex, "Unable to unprotect universal admin password.");
                return null;
            }
        }
    }

    public class UniversalAdminPasswordStatusDto
    {
        public bool IsConfigured { get; set; }
        public bool CanReveal { get; set; }
        public string? Password { get; set; }
        public string Source { get; set; } = "none";
        public DateTime? UpdatedAt { get; set; }
        public uint? UpdatedBy { get; set; }
    }
}
