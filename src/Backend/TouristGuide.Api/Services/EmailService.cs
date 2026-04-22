using System.Net;
using System.Net.Mail;

namespace TouristGuide.Api.Services
{
    /// <summary>
    /// Servis za slanje emailova putem SMTP-a.
    /// Konfiguracija se čita iz appsettings.json → sekcija "Email".
    /// </summary>
    public class EmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Šalje email za potvrdu registracije turisti.
        /// </summary>
        /// <param name="toEmail">Email adresa turiste</param>
        /// <param name="toName">Ime turiste</param>
        /// <param name="verificationToken">Token za verifikaciju</param>
        public async Task SendVerificationEmailAsync(string toEmail, string toName, string verificationToken)
        {
            var baseUrl = _configuration["Email:BaseUrl"] ?? "http://localhost:4201";
            var verificationLink = $"{baseUrl}/verify-email?token={verificationToken}";

            var subject = "Potvrdite vašu email adresu – TouristGuide";

            var body = $@"
<!DOCTYPE html>
<html lang='sr'>
<head><meta charset='UTF-8'/></head>
<body style='font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;'>
  <div style='max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 32px;'>
    <h2 style='color: #2c7be5;'>Dobrodošli, {toName}!</h2>
    <p>Hvala vam na registraciji na <strong>TouristGuide</strong>.</p>
    <p>Kliknite na dugme ispod da potvrdite vašu email adresu i aktivirate nalog:</p>
    <div style='text-align: center; margin: 32px 0;'>
      <a href='{verificationLink}'
         style='background: #2c7be5; color: #fff; padding: 14px 28px; border-radius: 6px;
                text-decoration: none; font-size: 16px; font-weight: bold;'>
        Potvrdi email adresu
      </a>
    </div>
    <p style='color: #666; font-size: 13px;'>
      Link je važeći <strong>24 sata</strong>. Ako niste kreirali nalog, možete ignorisati ovaj email.
    </p>
    <hr style='border: none; border-top: 1px solid #eee; margin: 24px 0;'/>
    <p style='color: #aaa; font-size: 12px; text-align: center;'>
      TouristGuide © {DateTime.UtcNow.Year}
    </p>
  </div>
</body>
</html>";

            await SendEmailAsync(toEmail, subject, body);
        }

        /// <summary>
        /// Interno: šalje email sa zadatim parametrima.
        /// U development modu samo loguje link umesto slanja.
        /// </summary>
        private async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
        {
            var smtpHost = _configuration["Email:SmtpHost"];
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var smtpUser = _configuration["Email:SmtpUser"];
            var smtpPass = _configuration["Email:SmtpPass"];
            var fromEmail = _configuration["Email:From"] ?? "noreply@touristguide.com";
            var fromName = _configuration["Email:FromName"] ?? "TouristGuide";

            // Ako SMTP nije konfigurisan → logujemo link (korisno za development)
            if (string.IsNullOrWhiteSpace(smtpHost) || string.IsNullOrWhiteSpace(smtpUser))
            {
                _logger.LogWarning(
                    "[EMAIL - DEV MODE] Nije konfigurisan SMTP. Email koji bi bio poslat na {To}: {Subject}\n{Body}",
                    toEmail, subject, htmlBody);
                return;
            }

            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(smtpUser, smtpPass)
            };

            var mail = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };
            mail.To.Add(new MailAddress(toEmail));

            try
            {
                await client.SendMailAsync(mail);
                _logger.LogInformation("Email uspešno poslat na {To}", toEmail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Greška pri slanju emaila na {To}", toEmail);
                throw;
            }
        }
    }
}
