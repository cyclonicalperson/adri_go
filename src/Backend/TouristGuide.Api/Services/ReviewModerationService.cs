using System.Text;
using System.Text.Json;
using TouristGuide.Api.Interfaces;

namespace TouristGuide.Api.Services
{
    public sealed class ReviewModerationService : IReviewModerationService
    {
        // ── Gemini ────────────────────────────────────────────────────────────
        private const string GeminiApiUrl =
            "https://generativelanguage.googleapis.com/v1beta/models/{0}:generateContent?key={1}";

        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            PropertyNamingPolicy        = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        // ── Keyword lista (sloj 1) ─────────────────────────────────────────
        // Srpski / Hrvatski / Bosanski (latinica + ćirilica) + English
        private static readonly HashSet<string> BannedKeywords = new(StringComparer.OrdinalIgnoreCase)
        {
            // Srpski/BCS - latinica
            "kurac", "kurац", "pička", "picka", "pizda", "jebem", "jebiga", "jebo",
            "jebote", "jebeni", "jebi", "govno", "govno", "sranje", "usrao", "usrala",
            "usrali", "idi u pičku", "idi u picku", "majku ti", "mater ti",
            "šupak", "supak", "dupak", "papak", "kretен", "kreten", "idiot",
            "debil", "invalid", "retard", "glupan", "tupan", "seljak", "primitivac",
            "smrdljivac", "zaostal", "zaostao", "seljačina", "prostак", "prostak",
            "svinjo", "svinja", "magare", "magarac", "kučka", "kucka", "kurva",
            "prostitutka", "drolja", "šljakinja", "pedер", "peder", "pederčina",
            "homić", "homic", "cigane", "cigan", "ciganin",
            // Srpski - ćirilica
            "курац", "пичка", "пизда", "јебем", "јебига", "јебо", "јеботе",
            "говно", "срање", "шупак", "дупак", "кретен", "идиот", "дебил",
            "глупан", "тупан", "сељак", "кучка", "курва", "педер", "циган",
            // English
            "fuck", "fucking", "fucked", "fucker", "fuckhead", "fck", "f*ck",
            "shit", "bullshit", "shithole", "crap",
            "bitch", "bastard", "asshole", "ass", "dickhead", "dick",
            "cunt", "pussy", "nigger", "nigga", "faggot", "fag",
            "retard", "retarded", "idiot", "moron", "imbecile",
            "whore", "slut", "hoe",
            "kill yourself", "kys", "go die", "drop dead",
            "hate you", "i hate",
            // Zamaskirana slova (l33t speak)
            "f@ck", "sh!t", "b!tch", "a$$", "a55",
            // Nemački
            "scheiße", "scheisse", "scheiß", "wichser", "arschloch", "fick",
            "fotze", "hurе", "hure", "vollidiot",
            // Albanski
            "pidh", "kar", "byth", "rrot", "qij", "qifte",
            // Mađarski
            "kurva", "fasz", "bazdmeg", "baszd meg", "picsa", "szar",
            // Turski
            "orospu", "sik", "amk", "bok", "oç", "piç",
            // Spam / bot signali
            "click here", "free money", "casino", "porn", "xxx",
            "buy now", "discount", "offer expires", "limited time",
            "http://", "https://", "www.", ".com", ".net", ".org", ".xyz"
        };

        // Minimalna dužina komentara (samo razmaci, cifre, jedno slovo → sumnjivo)
        private const int MinMeaningfulLength = 3;
        private const int MaxCommentLength    = 2000;

        private readonly IHttpClientFactory              _httpClientFactory;
        private readonly IConfiguration                  _configuration;
        private readonly ILogger<ReviewModerationService> _logger;

        public ReviewModerationService(
            IHttpClientFactory              httpClientFactory,
            IConfiguration                  configuration,
            ILogger<ReviewModerationService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration     = configuration;
            _logger            = logger;
        }

        // ═══════════════════════════════════════════════════════════════════
        //  JAVNI ULAZ
        // ═══════════════════════════════════════════════════════════════════
        public async Task<ModerationResult> ModerateAsync(
            string?           comment,
            CancellationToken cancellationToken = default)
        {
            // Komentari bez teksta su OK (turista je ostavio samo ocenu)
            if (string.IsNullOrWhiteSpace(comment))
                return Safe();

            // ── Sloj 1: lokalna logika ────────────────────────────────────
            var localResult = RunLocalChecks(comment);
            if (!localResult.IsSafe)
            {
                _logger.LogInformation(
                    "ReviewModeration [LOCAL] uhvatio: {Reason}", localResult.FlagReason);
                return localResult;
            }

            // ── Sloj 2: Gemini AI ─────────────────────────────────────────
            return await RunGeminiCheckAsync(comment, cancellationToken);
        }

        // ═══════════════════════════════════════════════════════════════════
        //  SLOJ 1 — LOKALNA LOGIKA
        // ═══════════════════════════════════════════════════════════════════
        private static ModerationResult RunLocalChecks(string comment)
        {
            // 1a. Previše kratko da bi imalo smisla
            var stripped = comment.Trim();
            if (stripped.Length < MinMeaningfulLength)
                return Flag("LOCAL_TOO_SHORT");

            // 1b. Previše dugo
            if (stripped.Length > MaxCommentLength)
                return Flag("LOCAL_TOO_LONG");

            // 1c. Keyword match — prolazimo kroz zabranjene reči
            //     Koristimo Contains kako bi uhvatili i delove reči (npr. "jebiga" u "ajebiga")
            var lower = stripped.ToLowerInvariant();
            foreach (var keyword in BannedKeywords)
            {
                if (lower.Contains(keyword.ToLowerInvariant()))
                    return Flag($"LOCAL_KEYWORD:{keyword}");
            }

            // 1d. Razbijene reči ("j e b i g a", "k.u.r.a.c", "f-u-c-k")
            var collapsed = System.Text.RegularExpressions.Regex
                .Replace(lower, @"([\s.\-_*@!#])", "");
            if (collapsed != lower)
            {
                foreach (var keyword in BannedKeywords)
                {
                    var kw = keyword.ToLowerInvariant();
                    if (kw.Length >= 4 && collapsed.Contains(kw))
                        return Flag($"LOCAL_SPACED_KEYWORD:{keyword}");
                }
            }

            // 1e. URL/link detekcija (spam)
            if (ContainsUrl(lower))
                return Flag("LOCAL_URL_DETECTED");

            // 1f. Ponavljanje istog karaktera (aaaaaaaa, !!!!!!, ???????)
            if (HasExcessiveRepetition(stripped))
                return Flag("LOCAL_REPETITION");

            // 1g. Samo cifre i interpunkcija — nema stvarnog sadržaja
            if (IsContentless(stripped))
                return Flag("LOCAL_NO_CONTENT");

            return Safe();
        }

        private static bool ContainsUrl(string lower) =>
            lower.Contains("http://")  ||
            lower.Contains("https://") ||
            lower.Contains("www.")     ||
            System.Text.RegularExpressions.Regex.IsMatch(lower, @"\.(com|net|org|xyz|info|biz|io)\b");

        private static bool HasExcessiveRepetition(string text)
        {
            if (text.Length < 6) return false;
            // Ako isti karakter čini >60% teksta — spam/troll
            var groups = text.GroupBy(c => c);
            return groups.Any(g => (double)g.Count() / text.Length > 0.60);
        }

        private static bool IsContentless(string text)
        {
            var letters = text.Count(char.IsLetter);
            return letters < 2;
        }

        // ═══════════════════════════════════════════════════════════════════
        //  SLOJ 2 — GEMINI AI
        // ═══════════════════════════════════════════════════════════════════
        private async Task<ModerationResult> RunGeminiCheckAsync(
            string            comment,
            CancellationToken cancellationToken)
        {
            var apiKey = _configuration["Gemini:ApiKey"];
            var model  = _configuration["Gemini:Model"] ?? "gemini-2.5-flash-lite";

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning(
                    "ReviewModeration [GEMINI] API key nije konfigurisan — recenzija se automatski odobrava.");
                return Safe();
            }

            var prompt = BuildModerationPrompt(comment);

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[] { new { text = prompt } }
                    }
                },
                generationConfig = new
                {
                    temperature     = 0.1,
                    maxOutputTokens = 120,
                    responseMimeType = "application/json"
                }
            };

            var json        = JsonSerializer.Serialize(requestBody, JsonOpts);
            var httpContent = new StringContent(json, Encoding.UTF8, "application/json");
            var url         = string.Format(GeminiApiUrl, model, apiKey);
            var client      = _httpClientFactory.CreateClient("Gemini");

            HttpResponseMessage response;
            try
            {
                response = await client.PostAsync(url, httpContent, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "ReviewModeration [GEMINI] HTTP poziv nije uspio — recenzija se automatski odobrava.");
                return Safe();
            }

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning(
                    "ReviewModeration [GEMINI] vratio {Status}: {Body}",
                    (int)response.StatusCode, body);
                return Safe();
            }

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
            return ParseGeminiResponse(responseJson);
        }

        private static string BuildModerationPrompt(string comment)
        {
            // Eksplicitno tražimo JSON bez markdowna
            return $"""
                You are a content moderator for a tourist review platform.
                Analyze the following review comment and determine if it is safe to publish.

                Flag the comment (safe: false) if it contains ANY of the following:
                - Offensive language, insults, or hate speech in ANY language
                  (Serbian, English, German, Albanian, Hungarian, Turkish, or any other)
                - Spam, promotional content, or links
                - Threats or calls to violence
                - Discriminatory content based on race, religion, nationality, or gender
                - Subtle insults, sarcasm used to demean, or disguised offensive content
                - Content completely unrelated to a tourist location or experience

                A comment is SAFE if it is a genuine review of a tourist location,
                even if it expresses dissatisfaction or criticism in a constructive way.

                Respond ONLY with a valid JSON object, no markdown, no explanation:
                {{"safe": true, "reason": null}}
                or
                {{"safe": false, "reason": "SHORT_REASON_IN_CAPS"}}

                Comment to analyze:
                "{comment.Replace("\"", "\\\"")}"
                """;
        }

        private ModerationResult ParseGeminiResponse(string responseJson)
        {
            try
            {
                using var doc  = JsonDocument.Parse(responseJson);
                var candidates = doc.RootElement.GetProperty("candidates");
                var first      = candidates[0];
                var content    = first.GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();

                if (string.IsNullOrWhiteSpace(content))
                {
                    _logger.LogWarning("ReviewModeration [GEMINI] prazan odgovor — odobravamo.");
                    return Safe();
                }

                // Gemini ponekad obavije JSON u ```json ``` blok uprkos uputstvima
                var cleanJson = content
                    .Replace("```json", "")
                    .Replace("```", "")
                    .Trim();

                using var resultDoc = JsonDocument.Parse(cleanJson);
                var root            = resultDoc.RootElement;

                var isSafe = root.GetProperty("safe").GetBoolean();
                string? reason = null;

                if (!isSafe && root.TryGetProperty("reason", out var reasonProp))
                    reason = reasonProp.ValueKind == JsonValueKind.String
                        ? $"GEMINI:{reasonProp.GetString()}"
                        : "GEMINI:FLAGGED";

                _logger.LogInformation(
                    "ReviewModeration [GEMINI] safe={Safe} reason={Reason}", isSafe, reason);

                return isSafe ? Safe() : Flag(reason ?? "GEMINI:FLAGGED");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "ReviewModeration [GEMINI] greška pri parsiranju odgovora — odobravamo.");
                return Safe();
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        //  HELPERI
        // ═══════════════════════════════════════════════════════════════════
        private static ModerationResult Safe() =>
            new(IsSafe: true, FlagReason: null, ToxicityScore: 0);

        private static ModerationResult Flag(string reason) =>
            new(IsSafe: false, FlagReason: reason, ToxicityScore: 1);
    }
}
