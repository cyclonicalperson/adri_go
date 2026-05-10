using System.Net;
using System.Net.Mail;

namespace TouristGuide.Api.Services
{
    /// <summary>
    /// Servis za slanje emailova putem SMTP-a.
    /// Konfiguracija se cita iz appsettings.json → sekcija "Email".
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
        /// Salje email za potvrdu registracije turisti.
        /// </summary>
        public async Task SendVerificationEmailAsync(string toEmail, string toName, string verificationToken)
        {
            var verificationLink = BuildFrontendUrl(
                configKey: "Email:TouristBaseUrl",
                fallbackBaseUrl: "http://localhost:4201",
                pathAndQuery: $"/verify-email?token={Uri.EscapeDataString(verificationToken)}");

            var subject = "Potvrdite vasu email adresu - TouristGuide";
            var body = BuildEmailTemplate(
                title: $"Dobrodosli, {HtmlEncode(toName)}!",
                intro: "Hvala vam na registraciji na TouristGuide.",
                bodyHtml: "<p>Kliknite na dugme ispod da potvrdite vasu email adresu i aktivirate nalog.</p>",
                actionLabel: "Potvrdi email adresu",
                actionUrl: verificationLink,
                footerNote: "Link je vazeci 24 sata. Ako niste kreirali nalog, mozete ignorisati ovaj email.");

            await SendEmailAsync(toEmail, subject, body);
        }

        /// <summary>
        /// Salje email za resetovanje lozinke turisti.
        /// </summary>
        public async Task SendPasswordResetEmailAsync(string toEmail, string toName, string resetToken)
        {
            var resetLink = BuildFrontendUrl(
                configKey: "Email:TouristBaseUrl",
                fallbackBaseUrl: "http://localhost:4201",
                pathAndQuery: $"/reset-password?token={Uri.EscapeDataString(resetToken)}");

            var subject = "Resetovanje lozinke - TouristGuide";
            var body = BuildEmailTemplate(
                title: $"Resetovanje lozinke, {HtmlEncode(toName)}",
                intro: "Primili smo zahtev za resetovanje lozinke za vas nalog.",
                bodyHtml: "<p>Kliknite na dugme ispod da kreirate novu lozinku. Link je vazeci 1 sat.</p><p style='color:#666;font-size:13px;'>Ako niste vi pokrenuli ovu akciju, mozete zanemariti ovaj email.</p>",
                actionLabel: "Resetuj lozinku",
                actionUrl: resetLink,
                footerNote: "Link je vazeci 1 sat. Ako niste zatrazili resetovanje lozinke, vas nalog je bezbedan i ne morate preduzimati nikakve akcije.");

            await SendEmailAsync(toEmail, subject, body);
        }

        public async Task SendAdminRegistrationVerificationEmailAsync(string toEmail, string toName, string verificationToken)
        {
            var verificationLink = BuildFrontendUrl(
                configKey: "Email:AdminBaseUrl",
                fallbackBaseUrl: "http://localhost:4200",
                pathAndQuery: $"/register/verify-email?token={Uri.EscapeDataString(verificationToken)}");
            var loginLink = BuildFrontendUrl("Email:AdminBaseUrl", "http://localhost:4200", "/login");

            var body = BuildEmailTemplate(
                title: $"Potvrdite email adresu, {HtmlEncode(toName)}",
                intro: "Primili smo vas zahtev za admin nalog na platformi TouristGuide.",
                bodyHtml: $@"
<p>Pre pregleda dokumentacije potrebno je da potvrdite email adresu koju ste prijavili.</p>
<p style='margin-top: 12px;'>Nakon verifikacije zahtev ostaje na cekanju dok ga superadmin ne odobri ili odbije.</p>
<p style='margin-top: 16px; font-size: 13px; color: #64748b;'>
  Ako vec imate pristup admin aplikaciji, prijava je dostupna ovde:
  <a href='{loginLink}' style='color: #2c7be5;'>Admin prijava</a>
</p>",
                actionLabel: "Potvrdi email adresu",
                actionUrl: verificationLink,
                footerNote: "Link je vazeci 24 sata. Ako niste poslali ovaj zahtev, slobodno zanemarite poruku.");

            await SendEmailAsync(toEmail, "Potvrdite admin registraciju - TouristGuide", body);
        }

        public async Task SendAdminRegistrationApprovedEmailAsync(string toEmail, string toName)
        {
            var loginLink = BuildFrontendUrl("Email:AdminBaseUrl", "http://localhost:4200", "/login");

            var body = BuildEmailTemplate(
                title: $"Registracija je odobrena, {HtmlEncode(toName)}",
                intro: "Vas zahtev za admin nalog je uspesno odobren.",
                bodyHtml: "<p>Mozete se prijaviti u admin aplikaciju i nastaviti sa radom.</p>",
                actionLabel: "Otvori admin prijavu",
                actionUrl: loginLink,
                footerNote: "Ako ste vec verifikovali email, nije potrebna nikakva dodatna potvrda.");

            await SendEmailAsync(toEmail, "Admin nalog je odobren - TouristGuide", body);
        }

        public async Task SendAdminRegistrationRejectedEmailAsync(string toEmail, string toName, string? rejectionReason)
        {
            var registerLink = BuildFrontendUrl("Email:AdminBaseUrl", "http://localhost:4200", "/register");
            var reasonHtml = string.IsNullOrWhiteSpace(rejectionReason)
                ? string.Empty
                : $@"
<div style='margin: 16px 0; padding: 14px 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;'>
  <div style='font-weight: 700; color: #991b1b; margin-bottom: 6px;'>Razlog odbijanja</div>
  <div style='color: #7f1d1d; font-size: 14px; line-height: 1.6;'>{HtmlEncode(rejectionReason)}</div>
</div>";

            var body = BuildEmailTemplate(
                title: $"Registracija nije odobrena, {HtmlEncode(toName)}",
                intro: "Vas zahtev za admin nalog je odbijen.",
                bodyHtml: $"{reasonHtml}<p>Ako zelite, mozete ispraviti podatke i poslati novi zahtev.</p>",
                actionLabel: "Posalji novi zahtev",
                actionUrl: registerLink,
                footerNote: "Ako smatrate da je doslo do greske, obratite se superadmin timu ili pokusajte ponovo sa kompletnom dokumentacijom.");

            await SendEmailAsync(toEmail, "Admin registracija je odbijena - TouristGuide", body);
        }

        /// <summary>
        /// Interno: salje email sa zadatim parametrima.
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
                _logger.LogInformation("Email uspesno poslat na {To}", toEmail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Greska pri slanju emaila na {To}", toEmail);
                throw;
            }
        }

        private string BuildFrontendUrl(string configKey, string fallbackBaseUrl, string pathAndQuery)
        {
            var configuredBaseUrl = _configuration[configKey]
                ?? _configuration["Email:BaseUrl"]
                ?? fallbackBaseUrl;

            return $"{configuredBaseUrl.TrimEnd('/')}{pathAndQuery}";
        }

        private static string BuildEmailTemplate(
            string title,
            string intro,
            string bodyHtml,
            string actionLabel,
            string actionUrl,
            string footerNote)
        {
            var year = DateTime.UtcNow.Year;

            return $@"
<!DOCTYPE html>
<html lang='sr'>
<head><meta charset='UTF-8'/></head>
<body style='font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;'>
  <div style='max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 32px;'>
    <h2 style='color: #2c7be5; margin-top: 0;'>{title}</h2>
    <p style='color: #334155; font-size: 15px; line-height: 1.6;'>{intro}</p>
    <div style='color: #334155; font-size: 14px; line-height: 1.7;'>
      {bodyHtml}
    </div>
    <div style='text-align: center; margin: 32px 0;'>
      <a href='{actionUrl}'
         style='background: #2c7be5; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;'>
        {actionLabel}
      </a>
    </div>
    <p style='color: #666; font-size: 13px; line-height: 1.6;'>
      {footerNote}
    </p>
    <hr style='border: none; border-top: 1px solid #eee; margin: 24px 0;'/>
    <p style='color: #aaa; font-size: 12px; text-align: center; margin-bottom: 0;'>
      TouristGuide © {year}
    </p>
  </div>
</body>
</html>";
        }

        private static string HtmlEncode(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);
    }
}
