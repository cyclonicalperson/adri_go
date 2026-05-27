using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace TouristGuide.Api.Services
{
    // Ovaj servis ima jedan jedini posao: da generiše JWT token
    // kada mu daš podatke o korisniku
    public class JwtService
    {
        private const string DevelopmentJwtSecret = "DevelopmentOnlyJwtSecretForLocalRuns-ChangeBeforeProduction-2026";

        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _environment;

        // IConfiguration je .NET servis koji čita iz appsettings.json
        // Ubrizgavamo ga kroz konstruktor (Dependency Injection)
        public JwtService(IConfiguration configuration, IWebHostEnvironment environment)
        {
            _configuration = configuration;
            _environment = environment;
        }

        public string GenerateToken(uint userId, string email, string role, uint? organizationId)
        {
            // Čitamo vrednosti iz appsettings.json
            var secret = GetJwtSecret();
            var issuer = _configuration["Jwt:Issuer"] ?? "TouristGuideApi";
            var audience = _configuration["Jwt:Audience"] ?? "TouristGuideClients";
            var expiresInHours = int.Parse(_configuration["Jwt:ExpiresInHours"] ?? "8");

            // Ključ za potpisivanje — pretvaramo string u bajte
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // Claims su podaci koji će biti upakovani u token
            // Svako ko ima token može ih pročitati (nisu šifrovani, ali su potpisani)
            var claims = new List<Claim>
            {
                // "sub" je standardni claim za ID korisnika
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                // "jti" je jedinstveni ID tokena (sprečava replay napade)
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                // Email i uloga korisnika
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Role, role),
                // Naša custom vrednost — ID organizacije (ako postoji)
                new Claim("organizationId", organizationId?.ToString() ?? "")
            };

            // Pravimo token sa svim informacijama
            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                // Token počinje da važi odmah
                notBefore: DateTime.UtcNow,
                // Token ističe za ExpiresInHours sati
                expires: DateTime.UtcNow.AddHours(expiresInHours),
                signingCredentials: credentials
            );

            // Pretvaramo token objekat u string koji šaljemo frontendu
            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private string GetJwtSecret()
        {
            var secret = _configuration["Jwt:Secret"];
            if (!string.IsNullOrWhiteSpace(secret) && secret.Length >= 32)
                return secret;

            if (_environment.IsDevelopment())
                return DevelopmentJwtSecret;

            throw new InvalidOperationException("JWT Secret nije konfigurisan.");
        }
    }
}
