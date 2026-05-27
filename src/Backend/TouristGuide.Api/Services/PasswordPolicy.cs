namespace TouristGuide.Api.Services
{
    public static class PasswordPolicy
    {
        public const int MinimumLength = 8;

        public static string? GetValidationError(string? password, string label = "Lozinka")
        {
            if (string.IsNullOrWhiteSpace(password))
                return $"{label} je obavezna.";

            if (password.Length < MinimumLength)
                return $"{label} mora imati najmanje {MinimumLength} karaktera.";

            if (!password.Any(char.IsUpper))
                return $"{label} mora sadrzati najmanje jedno veliko slovo.";

            if (!password.Any(ch => char.IsDigit(ch) || char.IsPunctuation(ch) || char.IsSymbol(ch)))
                return $"{label} mora sadrzati najmanje jedan broj ili specijalni karakter.";

            return null;
        }
    }
}
