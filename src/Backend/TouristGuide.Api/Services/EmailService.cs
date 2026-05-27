using System.Net;
using System.Net.Mail;

namespace TouristGuide.Api.Services
{
    /// <summary>
    /// Servis za slanje emailova putem SMTP-a.
    /// Konfiguracija se cita iz appsettings.json → sekcija "Email".
    /// Emailovi se šalju u jeziku korisnika.
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

        public bool IsConfigured =>
            !string.IsNullOrWhiteSpace(_configuration["Email:SmtpHost"]) &&
            !string.IsNullOrWhiteSpace(_configuration["Email:SmtpUser"]) &&
            !string.IsNullOrWhiteSpace(_configuration["Email:SmtpPass"]) &&
            !string.IsNullOrWhiteSpace(_configuration["Email:From"]);

        // ─── Lokalizovani stringovi ───────────────────────────────────────────

        private static readonly Dictionary<string, (string Subject, string Title, string Intro, string Body, string Button, string Footer)>
            VerificationStrings = new(StringComparer.OrdinalIgnoreCase)
            {
                ["en"] = (
                    "Verify your email address - AdriGo",
                    "Welcome, {name}!",
                    "Thank you for registering on AdriGo.",
                    "<p>Click the button below to confirm your email address and activate your account.</p>",
                    "Verify email address",
                    "Link valid for 24 hours. If you did not create an account, you can ignore this email."),
                ["sr"] = (
                    "Potvrdite vašu email adresu - AdriGo",
                    "Dobrodošli, {name}!",
                    "Hvala vam na registraciji na AdriGo.",
                    "<p>Kliknite na dugme ispod da potvrdite vašu email adresu i aktivirate nalog.</p>",
                    "Potvrdi email adresu",
                    "Link je važeći 24 sata. Ako niste kreirali nalog, možete ignorisati ovaj email."),
                ["de"] = (
                    "E-Mail-Adresse bestätigen - AdriGo",
                    "Willkommen, {name}!",
                    "Danke für Ihre Registrierung bei AdriGo.",
                    "<p>Klicken Sie auf die Schaltfläche unten, um Ihre E-Mail-Adresse zu bestätigen und Ihr Konto zu aktivieren.</p>",
                    "E-Mail-Adresse bestätigen",
                    "Der Link ist 24 Stunden gültig. Wenn Sie kein Konto erstellt haben, können Sie diese E-Mail ignorieren."),
                ["fr"] = (
                    "Vérifiez votre adresse e-mail - AdriGo",
                    "Bienvenue, {name} !",
                    "Merci de vous être inscrit sur AdriGo.",
                    "<p>Cliquez sur le bouton ci-dessous pour confirmer votre adresse e-mail et activer votre compte.</p>",
                    "Vérifier l'adresse e-mail",
                    "Le lien est valable 24 heures. Si vous n'avez pas créé de compte, vous pouvez ignorer cet e-mail."),
                ["it"] = (
                    "Verifica il tuo indirizzo email - AdriGo",
                    "Benvenuto, {name}!",
                    "Grazie per esserti registrato su AdriGo.",
                    "<p>Clicca sul pulsante qui sotto per confermare il tuo indirizzo email e attivare il tuo account.</p>",
                    "Verifica indirizzo email",
                    "Il link è valido per 24 ore. Se non hai creato un account, puoi ignorare questa email."),
                ["es"] = (
                    "Verifica tu dirección de correo electrónico - AdriGo",
                    "¡Bienvenido, {name}!",
                    "Gracias por registrarte en AdriGo.",
                    "<p>Haz clic en el botón de abajo para confirmar tu dirección de correo y activar tu cuenta.</p>",
                    "Verificar dirección de correo",
                    "El enlace es válido durante 24 horas. Si no creaste una cuenta, puedes ignorar este correo."),
                ["ru"] = (
                    "Подтвердите ваш адрес электронной почты - AdriGo",
                    "Добро пожаловать, {name}!",
                    "Спасибо за регистрацию на AdriGo.",
                    "<p>Нажмите на кнопку ниже, чтобы подтвердить ваш адрес электронной почты и активировать аккаунт.</p>",
                    "Подтвердить адрес эл. почты",
                    "Ссылка действительна 24 часа. Если вы не создавали аккаунт, просто проигнорируйте это письмо."),
                ["nl"] = (
                    "Bevestig uw e-mailadres - AdriGo",
                    "Welkom, {name}!",
                    "Bedankt voor uw registratie bij AdriGo.",
                    "<p>Klik op de knop hieronder om uw e-mailadres te bevestigen en uw account te activeren.</p>",
                    "E-mailadres bevestigen",
                    "De link is 24 uur geldig. Als u geen account heeft aangemaakt, kunt u deze e-mail negeren."),
            };

        private static readonly Dictionary<string, (string Subject, string Title, string Intro, string Body, string Button, string Footer)>
            PasswordResetStrings = new(StringComparer.OrdinalIgnoreCase)
            {
                ["en"] = (
                    "Password reset - AdriGo",
                    "Password reset, {name}",
                    "We received a request to reset the password for your account.",
                    "<p>Click the button below to create a new password. The link is valid for 1 hour.</p><p style='color:#666;font-size:13px;'>If you didn't initiate this action, you can ignore this email.</p>",
                    "Reset password",
                    "Link valid for 1 hour. If you did not request a password reset, your account is safe and no action is needed."),
                ["sr"] = (
                    "Resetovanje lozinke - AdriGo",
                    "Resetovanje lozinke, {name}",
                    "Primili smo zahtev za resetovanje lozinke za vaš nalog.",
                    "<p>Kliknite na dugme ispod da kreirate novu lozinku. Link je važeći 1 sat.</p><p style='color:#666;font-size:13px;'>Ako niste vi pokrenuli ovu akciju, možete zanemariti ovaj email.</p>",
                    "Resetuj lozinku",
                    "Link je važeći 1 sat. Ako niste zatražili resetovanje lozinke, vaš nalog je bezbedan i ne morate preduzimati nikakve akcije."),
                ["de"] = (
                    "Passwort zurücksetzen - AdriGo",
                    "Passwort zurücksetzen, {name}",
                    "Wir haben eine Anfrage zum Zurücksetzen des Passworts für Ihr Konto erhalten.",
                    "<p>Klicken Sie auf die Schaltfläche unten, um ein neues Passwort zu erstellen. Der Link ist 1 Stunde gültig.</p><p style='color:#666;font-size:13px;'>Wenn Sie diese Aktion nicht ausgelöst haben, können Sie diese E-Mail ignorieren.</p>",
                    "Passwort zurücksetzen",
                    "Der Link ist 1 Stunde gültig. Wenn Sie kein Passwort-Reset angefordert haben, ist Ihr Konto sicher."),
                ["fr"] = (
                    "Réinitialisation du mot de passe - AdriGo",
                    "Réinitialisation du mot de passe, {name}",
                    "Nous avons reçu une demande de réinitialisation du mot de passe pour votre compte.",
                    "<p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe. Le lien est valable 1 heure.</p><p style='color:#666;font-size:13px;'>Si vous n'avez pas initié cette action, vous pouvez ignorer cet e-mail.</p>",
                    "Réinitialiser le mot de passe",
                    "Le lien est valable 1 heure. Si vous n'avez pas demandé de réinitialisation, votre compte est en sécurité."),
                ["it"] = (
                    "Reimposta la password - AdriGo",
                    "Reimposta la password, {name}",
                    "Abbiamo ricevuto una richiesta di reimpostazione della password per il tuo account.",
                    "<p>Clicca sul pulsante qui sotto per creare una nuova password. Il link è valido per 1 ora.</p><p style='color:#666;font-size:13px;'>Se non hai avviato questa azione, puoi ignorare questa email.</p>",
                    "Reimposta la password",
                    "Il link è valido per 1 ora. Se non hai richiesto il reset della password, il tuo account è al sicuro."),
                ["es"] = (
                    "Restablecer contraseña - AdriGo",
                    "Restablecer contraseña, {name}",
                    "Recibimos una solicitud para restablecer la contraseña de tu cuenta.",
                    "<p>Haz clic en el botón de abajo para crear una nueva contraseña. El enlace es válido durante 1 hora.</p><p style='color:#666;font-size:13px;'>Si no iniciaste esta acción, puedes ignorar este correo.</p>",
                    "Restablecer contraseña",
                    "El enlace es válido durante 1 hora. Si no solicitaste el restablecimiento, tu cuenta está segura."),
                ["ru"] = (
                    "Сброс пароля - AdriGo",
                    "Сброс пароля, {name}",
                    "Мы получили запрос на сброс пароля для вашего аккаунта.",
                    "<p>Нажмите на кнопку ниже, чтобы создать новый пароль. Ссылка действительна 1 час.</p><p style='color:#666;font-size:13px;'>Если вы не инициировали это действие, просто проигнорируйте письмо.</p>",
                    "Сбросить пароль",
                    "Ссылка действительна 1 час. Если вы не запрашивали сброс пароля, ваш аккаунт в безопасности."),
                ["nl"] = (
                    "Wachtwoord opnieuw instellen - AdriGo",
                    "Wachtwoord opnieuw instellen, {name}",
                    "We hebben een verzoek ontvangen om het wachtwoord voor uw account opnieuw in te stellen.",
                    "<p>Klik op de knop hieronder om een nieuw wachtwoord aan te maken. De link is 1 uur geldig.</p><p style='color:#666;font-size:13px;'>Als u deze actie niet heeft geïnitieerd, kunt u deze e-mail negeren.</p>",
                    "Wachtwoord opnieuw instellen",
                    "De link is 1 uur geldig. Als u geen wachtwoordreset heeft aangevraagd, is uw account veilig."),
            };

        // ─── Public API ───────────────────────────────────────────────────────

        /// <summary>
        /// Šalje email za potvrdu registracije turisti u njegovom jeziku.
        /// </summary>
        public async Task SendVerificationEmailAsync(string toEmail, string toName, string verificationToken, string? language = null)
        {
            var lang = NormalizeLanguage(language, VerificationStrings);
            var verificationLink = BuildFrontendUrl(
                configKey: "Email:TouristBaseUrl",
                fallbackBaseUrl: "http://localhost:4201",
                pathAndQuery: $"/verify-email?token={Uri.EscapeDataString(verificationToken)}&lang={Uri.EscapeDataString(lang)}");

            var s = VerificationStrings[lang];

            var subject = s.Subject;
            var body = BuildEmailTemplate(
                title: s.Title.Replace("{name}", HtmlEncode(toName)),
                intro: s.Intro,
                bodyHtml: s.Body,
                actionLabel: s.Button,
                actionUrl: verificationLink,
                footerNote: s.Footer);

            await SendEmailAsync(toEmail, subject, body);
        }

        public async Task SendEmailChangeVerificationEmailAsync(string toEmail, string toName, string verificationToken, string? language = null)
        {
            var lang = NormalizeLanguage(language, VerificationStrings);
            var verificationLink = BuildFrontendUrl(
                configKey: "Email:TouristBaseUrl",
                fallbackBaseUrl: "http://localhost:4201",
                pathAndQuery: $"/verify-email?token={Uri.EscapeDataString(verificationToken)}&lang={Uri.EscapeDataString(lang)}");

            var body = BuildEmailTemplate(
                title: $"Potvrdite novu email adresu, {HtmlEncode(toName)}",
                intro: "Primili smo zahtev za promenu email adrese na AdriGo nalogu.",
                bodyHtml: "<p>Kliknite na dugme ispod da potvrdite novu email adresu. Promena ce biti prihvacena tek nakon potvrde.</p>",
                actionLabel: "Potvrdi novu email adresu",
                actionUrl: verificationLink,
                footerNote: "Link je vazeci 24 sata. Ako niste trazili promenu emaila, ignorisite ovu poruku.");

            await SendEmailAsync(toEmail, "Potvrdite novu email adresu - AdriGo", body);
        }

        /// <summary>
        /// Šalje email za resetovanje lozinke turisti u njegovom jeziku.
        /// </summary>
        public async Task SendPasswordResetEmailAsync(string toEmail, string toName, string resetToken, string? language = null)
        {
            var resetLink = BuildFrontendUrl(
                configKey: "Email:TouristBaseUrl",
                fallbackBaseUrl: "http://localhost:4201",
                pathAndQuery: $"/reset-password?token={Uri.EscapeDataString(resetToken)}");

            var lang = NormalizeLanguage(language, PasswordResetStrings);
            var s = PasswordResetStrings[lang];

            var subject = s.Subject;
            var body = BuildEmailTemplate(
                title: s.Title.Replace("{name}", HtmlEncode(toName)),
                intro: s.Intro,
                bodyHtml: s.Body,
                actionLabel: s.Button,
                actionUrl: resetLink,
                footerNote: s.Footer);

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
                intro: "Primili smo vaš zahtev za admin nalog na platformi AdriGo.",
                bodyHtml: $@"
<p>Pre pregleda dokumentacije potrebno je da potvrdite email adresu koju ste prijavili.</p>
<p style='margin-top: 12px;'>Nakon verifikacije zahtev ostaje na čekanju dok ga superadmin ne odobri ili odbije.</p>
<p style='margin-top: 16px; font-size: 13px; color: #64748b;'>
  Ako već imate pristup admin aplikaciji, prijava je dostupna ovde:
  <a href='{loginLink}' style='color: #2c7be5;'>Admin prijava</a>
</p>",
                actionLabel: "Potvrdi email adresu",
                actionUrl: verificationLink,
                footerNote: "Link je važeći 24 sata. Ako niste poslali ovaj zahtev, slobodno zanemarite poruku.");

            await SendEmailAsync(toEmail, "Potvrdite admin registraciju - AdriGo", body);
        }

        public async Task SendAdminRegistrationApprovedEmailAsync(string toEmail, string toName)
        {
            var loginLink = BuildFrontendUrl("Email:AdminBaseUrl", "http://localhost:4200", "/login");

            var body = BuildEmailTemplate(
                title: $"Registracija je odobrena, {HtmlEncode(toName)}",
                intro: "Vaš zahtev za admin nalog je uspešno odobren.",
                bodyHtml: "<p>Možete se prijaviti u admin aplikaciju i nastaviti sa radom.</p>",
                actionLabel: "Otvori admin prijavu",
                actionUrl: loginLink,
                footerNote: "Ako ste već verifikovali email, nije potrebna nikakva dodatna potvrda.");

            await SendEmailAsync(toEmail, "Admin nalog je odobren - AdriGo", body);
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
                intro: "Vaš zahtev za admin nalog je odbijen.",
                bodyHtml: $"{reasonHtml}<p>Ako želite, možete ispraviti podatke i poslati novi zahtev.</p>",
                actionLabel: "Pošalji novi zahtev",
                actionUrl: registerLink,
                footerNote: "Ako smatrate da je došlo do greške, obratite se superadmin timu ili pokušajte ponovo sa kompletnom dokumentacijom.");

            await SendEmailAsync(toEmail, "Admin registracija je odbijena - AdriGo", body);
        }

        // ─── Helpers ──────────────────────────────────────────────────────────

        private static string NormalizeLanguage<T>(string? language, Dictionary<string, T> dict)
        {
            if (!string.IsNullOrWhiteSpace(language))
            {
                var code = language.Trim().ToLowerInvariant();
                if (dict.ContainsKey(code)) return code;
            }
            return "en";
        }

        private async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
        {
            var smtpHost = _configuration["Email:SmtpHost"];
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var smtpUser = _configuration["Email:SmtpUser"];
            var smtpPass = _configuration["Email:SmtpPass"];
            var fromEmail = _configuration["Email:From"] ?? "noreply@adrigo.com";
            var fromName = _configuration["Email:FromName"] ?? "AdriGo";

            if (!IsConfigured)
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
<html lang='en'>
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
      AdriGo © {year}
    </p>
  </div>
</body>
</html>";
        }

        private static string HtmlEncode(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);
    }
}
