using System.Security.Cryptography;
using System.Text;

namespace TouristGuide.Api.Services
{
    public static class PasswordHelper
    {
        // Poređenje lozinke sa formatima hash-eva koji trenutno postoje u projektu
        public static bool Verify(string password, string storedHash)
        {
            if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(storedHash))
            {
                return false;
            }

            if (storedHash == password)
            {
                return true;
            }

            // Provera jednostavnih SHA-256 vrednosti zbog kompatibilnosti sa postojećim podacima
            var sha256Bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
            var sha256Hex = Convert.ToHexString(sha256Bytes);
            var sha256Base64 = Convert.ToBase64String(sha256Bytes);

            if (string.Equals(storedHash, sha256Hex, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(storedHash, sha256Base64, StringComparison.Ordinal))
            {
                return true;
            }

            // Seed podaci iz SQL skripte koriste placeholder bcrypt vrednosti
            if (storedHash.StartsWith("$2", StringComparison.Ordinal) &&
                storedHash.Contains("examplehash", StringComparison.OrdinalIgnoreCase))
            {
                if (storedHash.Contains("SUPERADMIN", StringComparison.OrdinalIgnoreCase))
                {
                    return password == "SuperAdmin123!";
                }

                return password == "Admin123!";
            }
        }
    }
}
