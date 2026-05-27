using System.Security.Cryptography;
using System.Text;

namespace TouristGuide.Api.Services
{
    public static class PasswordHelper
    {
        private const int WorkFactor = 12;

        public static string Hash(string password)
        {
            if (string.IsNullOrWhiteSpace(password))
                throw new ArgumentException("Password is required.", nameof(password));

            return BCrypt.Net.BCrypt.HashPassword(password, workFactor: WorkFactor);
        }

        public static bool IsBcryptHash(string? storedHash) =>
            !string.IsNullOrWhiteSpace(storedHash) &&
            storedHash.StartsWith("$2", StringComparison.Ordinal);

        public static bool NeedsRehash(string? storedHash) =>
            !IsBcryptHash(storedHash);

        public static bool Verify(string password, string storedHash)
        {
            if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(storedHash))
                return false;

            if (IsBcryptHash(storedHash))
            {
                try
                {
                    return BCrypt.Net.BCrypt.Verify(password, storedHash);
                }
                catch
                {
                    return false;
                }
            }

            // Legacy compatibility only. Successful legacy logins are upgraded by callers.
            var sha256Bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
            var sha256Hex = Convert.ToHexString(sha256Bytes);
            var sha256Base64 = Convert.ToBase64String(sha256Bytes);

            return string.Equals(storedHash, sha256Hex, StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(storedHash, sha256Base64, StringComparison.Ordinal);
        }
    }
}
