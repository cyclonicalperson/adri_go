using TouristGuide.Ai.Contracts;
using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace Mcp.Services;

// ── Ulazni/Izlazni DTO-vi za Chat endpoint ────────────────────────────────────

public sealed record ChatMessage(
    [property: JsonPropertyName("role")] string Role,   // "user" | "model"
    [property: JsonPropertyName("text")] string Text);

public sealed record ChatRequest(
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("history")] IReadOnlyList<ChatMessage>? History = null,
    [property: JsonPropertyName("language")] string? Language = null);

public sealed record ChatResponse(
    [property: JsonPropertyName("reply")]     string Reply,
    [property: JsonPropertyName("toolsUsed")] IReadOnlyList<string> ToolsUsed,
    [property: JsonPropertyName("referencedPosts")] IReadOnlyList<ChatPostReference> ReferencedPosts,
    [property: JsonPropertyName("cards")] IReadOnlyList<ChatCard> Cards);

public sealed record ChatPostReference(
    [property: JsonPropertyName("id")] uint Id,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("postType")] string? PostType = null,
    [property: JsonPropertyName("rating")] double? Rating = null,
    [property: JsonPropertyName("reviewCount")] uint? ReviewCount = null,
    [property: JsonPropertyName("regionName")] string? RegionName = null);

public sealed record ChatCard(
    [property: JsonPropertyName("id")] uint Id,
    [property: JsonPropertyName("type")] string Type,            // "post" | "route" | "activity"
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("postType")] string? PostType,
    [property: JsonPropertyName("regionName")] string? RegionName,
    [property: JsonPropertyName("rating")] double? Rating,
    [property: JsonPropertyName("reviewCount")] uint? ReviewCount,
    [property: JsonPropertyName("imageUrl")] string? ImageUrl,
    [property: JsonPropertyName("detailUrl")] string? DetailUrl,   // URL za detalje objave
    [property: JsonPropertyName("mapUrl")] string? MapUrl,         // URL za prikaz rute na mapi (samo rute)
    [property: JsonPropertyName("distanceKm")] decimal? DistanceKm,
    [property: JsonPropertyName("durationMinutes")] int? DurationMinutes,
    [property: JsonPropertyName("difficulty")] string? Difficulty);

// ── Gemini API DTO-vi ─────────────────────────────────────────────────────────

internal sealed class GeminiContent
{
    [JsonPropertyName("role")]  public string       Role  { get; set; } = "user";
    [JsonPropertyName("parts")] public List<GeminiPart> Parts { get; set; } = [];
}

internal sealed class GeminiPart
{
    [JsonPropertyName("text")]             public string?              Text             { get; set; }
    [JsonPropertyName("functionCall")]     public GeminiFunctionCall?  FunctionCall     { get; set; }
    [JsonPropertyName("functionResponse")] public GeminiFunctionResponse? FunctionResponse { get; set; }
}

internal sealed class GeminiFunctionCall
{
    [JsonPropertyName("name")] public string      Name { get; set; } = string.Empty;
    [JsonPropertyName("args")] public JsonObject? Args { get; set; }
}

internal sealed class GeminiFunctionResponse
{
    [JsonPropertyName("name")]     public string     Name     { get; set; } = string.Empty;
    [JsonPropertyName("response")] public JsonObject Response { get; set; } = new();
}

internal sealed class GeminiTool
{
    [JsonPropertyName("functionDeclarations")]
    public List<GeminiFunctionDeclaration> FunctionDeclarations { get; set; } = [];
}

internal sealed class GeminiFunctionDeclaration
{
    [JsonPropertyName("name")]        public string     Name        { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string     Description { get; set; } = string.Empty;
    [JsonPropertyName("parameters")]  public JsonObject Parameters  { get; set; } = new();
}

internal sealed class GeminiGenerateRequest
{
    [JsonPropertyName("contents")]          public List<GeminiContent>     Contents          { get; set; } = [];
    [JsonPropertyName("tools")]             public List<GeminiTool>        Tools             { get; set; } = [];
    [JsonPropertyName("systemInstruction")] public GeminiSystemInstruction? SystemInstruction { get; set; }
    [JsonPropertyName("generationConfig")]  public GeminiGenerationConfig?  GenerationConfig  { get; set; }
}

/// <summary>
/// systemInstruction nema "role" polje — Gemini API ga prima kao poseban objekat.
/// Odvojen tip sprečava slanje nepotrebnog "role" polja.
/// </summary>
internal sealed class GeminiSystemInstruction
{
    [JsonPropertyName("parts")] public List<GeminiPart> Parts { get; set; } = [];
}

internal sealed class GeminiGenerationConfig
{
    [JsonPropertyName("maxOutputTokens")] public int    MaxOutputTokens { get; set; } = 2048;
    [JsonPropertyName("temperature")]     public double Temperature     { get; set; } = 0.7;
}

internal sealed class GeminiGenerateResponse
{
    [JsonPropertyName("candidates")] public List<GeminiCandidate>? Candidates { get; set; }
}

internal sealed class GeminiCandidate
{
    [JsonPropertyName("content")]      public GeminiContent? Content      { get; set; }
    [JsonPropertyName("finishReason")] public string?        FinishReason { get; set; }
}

// ── Interface ─────────────────────────────────────────────────────────────────

public interface IGeminiChatService
{
    Task<ChatResponse> ChatAsync(ChatRequest request, CancellationToken ct);
}

internal sealed class GeminiApiException : Exception
{
    public int StatusCode { get; }

    public GeminiApiException(int statusCode, string message) : base(message)
    {
        StatusCode = statusCode;
    }
}

// ── Implementacija ────────────────────────────────────────────────────────────

internal sealed class GeminiChatService : IGeminiChatService
{
    private readonly IHttpClientFactory      _httpClientFactory;
    private readonly ITourismQueryService    _tourismQueryService;
    private readonly ITourismWriteService    _tourismWriteService;
    private readonly IConfiguration          _configuration;
    private readonly ILogger<GeminiChatService> _logger;
    private readonly string _frontendBaseUrl;

    // FIX #1: JsonOpts nema PropertyNamingPolicy — svi property-ji imaju eksplicitne
    // [JsonPropertyName] atribute, pa automatska politika imenovanja nije potrebna
    // i mogla bi da pređe (camelCase) preko eksplicitno postavljenih atributa u edge-case-ovima.
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        DefaultIgnoreCondition  = JsonIgnoreCondition.WhenWritingNull,
        PropertyNameCaseInsensitive = true
    };

    // FIX #2: Alati se grade jednom (lazy) i kešuju za ceo životni vek aplikacije.
    // ParseSchema() parsira JSON stringove — skupo je to raditi na svakom requestu.
    private static readonly Lazy<List<GeminiTool>> CachedTools =
        new(BuildTourismTools, LazyThreadSafetyMode.ExecutionAndPublication);

    // Maksimalan broj agentic petlji radi zaštite od beskonačnih petlji
    private const int MaxToolRounds = 8;
    // Maksimalan broj poruka istorije koje se šalju modelu (context truncation)
    private const int DefaultMaxHistoryMessages = 6;
    private const string UserFriendlyOverloadMessage =
        "Sistem je trenutno preopterećen velikim brojem zahteva. Molimo Vas pokušajte ponovo za minut.";

    public GeminiChatService(
        IHttpClientFactory      httpClientFactory,
        ITourismQueryService    tourismQueryService,
        ITourismWriteService    tourismWriteService,
        IConfiguration          configuration,
        ILogger<GeminiChatService> logger)
    {
        _httpClientFactory   = httpClientFactory;
        _tourismQueryService = tourismQueryService;
        _tourismWriteService = tourismWriteService;
        _configuration       = configuration;
        _logger              = logger;
        _frontendBaseUrl     = configuration["Frontend:BaseUrl"]?.TrimEnd('/') ?? "";
        // FIX #4: ICurrentTouristContext uklonjen iz konstruktora — nije korišćen
        // u Gemini orkestratoru (JWT personalizacija ide kroz query service, ne ovde).
    }

    public async Task<ChatResponse> ChatAsync(ChatRequest request, CancellationToken ct)
    {
        var apiKey = _configuration["Gemini:ApiKey"];

        // FIX #5: Validacija da ključ nije placeholder vrednost
        if (string.IsNullOrWhiteSpace(apiKey) ||
            apiKey.Equals("YOUR_GEMINI_API_KEY_HERE", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException(
                "Gemini:ApiKey nije podešen. Unesite pravi API ključ u appsettings.json ili environment varijablu.");

        // Uitaj niz modela iz konfiguracije. Prioritet: prvi = primarni (najveća kvota).
        // Fallback na stari "Model" ključ radi backward-kompatibilnosti.
        var models = _configuration.GetSection("Gemini:Models").Get<string[]>();
        if (models is not { Length: > 0 })
        {
            var single = _configuration["Gemini:Model"] ?? "gemini-2.0-flash-lite";
            models = [single];
        }

        var maxTokens = _configuration.GetValue<int>   ("Gemini:MaxOutputTokens", 1024);
        var temp      = _configuration.GetValue<double>("Gemini:Temperature",     0.7);
        var client    = _httpClientFactory.CreateClient("GeminiApi");

        // Model Fallback Chain: probaj svaki model redom; preskoči na sljedeći samo na 429/503.
        for (int i = 0; i < models.Length; i++)
        {
            var model = models[i];
            try
            {
                _logger.LogInformation(
                    "Gemini fallback chain: pokušaj {Attempt}/{Total} sa modelom '{Model}'",
                    i + 1, models.Length, model);

                return await ChatWithModelAsync(request, client, apiKey, model, maxTokens, temp, ct);
            }
            catch (GeminiApiException ex) when (
                ex.StatusCode == StatusCodes.Status429TooManyRequests ||
                ex.StatusCode == StatusCodes.Status503ServiceUnavailable)
            {
                if (i < models.Length - 1)
                {
                    _logger.LogWarning(
                        ex,
                        "Model '{Model}' vratio {Status} — prelazim na sljedeći model u lancu ({Next}).",
                        model, ex.StatusCode, models[i + 1]);
                }
                else
                {
                    _logger.LogError(
                        ex,
                        "Svi modeli u lancu su iscrpljeni. Poslednji model koji je zakazao: '{Model}'.",
                        model);
                }
                // Nastavi na sljedeći model u lancu
            }
        }

        // Svi modeli su zakazali
        throw new GeminiApiException(
            StatusCodes.Status429TooManyRequests,
            UserFriendlyOverloadMessage);
    }

    private async Task<ChatResponse> ChatWithModelAsync(
        ChatRequest request,
        HttpClient client,
        string apiKey,
        string model,
        int maxTokens,
        double temp,
        CancellationToken ct)
    {
        var normalizedModel = NormalizeGeminiModelName(model);
        _logger.LogInformation("Gemini chat koristi model {Model}", normalizedModel);

        var maxHistory = _configuration.GetValue<int>("Gemini:MaxHistoryMessages", DefaultMaxHistoryMessages);
        var contents   = BuildContents(request, maxHistory);
        var toolsUsed  = new List<string>();
        var referencedPosts = new List<ChatPostReference>();
        var cards = new List<ChatCard>();

        // Agentic petlja: Gemini može pozvati više alata pre finalnog odgovora
        for (int round = 0; round < MaxToolRounds; round++)
        {
            var geminiRequest = new GeminiGenerateRequest
            {
                Contents          = contents,
                Tools             = CachedTools.Value,
                SystemInstruction = BuildSystemInstruction(request.Language),
                GenerationConfig  = new GeminiGenerationConfig
                {
                    MaxOutputTokens = maxTokens,
                    Temperature     = temp
                }
            };

            var requestJson = JsonSerializer.Serialize(geminiRequest, JsonOpts);
            var httpContent = new StringContent(requestJson, Encoding.UTF8, "application/json");

            // API ključ ide kao query parametar (standardni Gemini REST API pattern)
            var url          = $"https://generativelanguage.googleapis.com/v1beta/models/{normalizedModel}:generateContent?key={apiKey}";
            var httpResponse = await client.PostAsync(url, httpContent, ct);

            if (!httpResponse.IsSuccessStatusCode)
            {
                var errorBody = await httpResponse.Content.ReadAsStringAsync(ct);
                var apiMessage = TryExtractGeminiErrorMessage(errorBody);
                _logger.LogError("Gemini API greška {Status}: {Body}", httpResponse.StatusCode, errorBody);

                // 429 (TooManyRequests) i 503 (ServiceUnavailable) — retryable, fallback chain će pokušati sljedeći model.
                if (httpResponse.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    var retryDelay = TryExtractGeminiRetryDelay(errorBody);
                    _logger.LogWarning(
                        "Gemini model {Model} je vratio 429 quota/rate-limit. RetryDelay={RetryDelay}",
                        model,
                        retryDelay ?? "unknown");

                    throw new GeminiApiException(
                        StatusCodes.Status429TooManyRequests,
                        UserFriendlyOverloadMessage);
                }

                if (httpResponse.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable)
                {
                    throw new GeminiApiException(
                        StatusCodes.Status503ServiceUnavailable,
                        apiMessage ?? $"Gemini servis je nedostupan (503). Model: {model}");
                }

                // 401, 403, 404, 400 i ostali statusi su non-retryable — baca se odmah bez fallbacka.
                // Svi ti statusi se wrappuju u 401 kod koji catch(429 OR 503) filter NE hvata.
                var friendlyMsg = (int)httpResponse.StatusCode switch
                {
                    401 => $"Gemini API ključ je nevažeći ili ne postoji. Proverite Gemini:ApiKey u konfiguraciji.",
                    403 => $"Pristup odbijen za model '{model}'. Proverite da je model dostupan na vašem nalogu.",
                    404 => $"Model '{model}' nije pronađen. Proverite naziv modela u Gemini:Models konfiguraciji.",
                    _   => apiMessage ?? $"Gemini API je vratio grešku {(int)httpResponse.StatusCode}. Proverite API ključ i model."
                };
                throw new GeminiApiException(
                    StatusCodes.Status401Unauthorized,
                    friendlyMsg);
            }

            var responseJson  = await httpResponse.Content.ReadAsStringAsync(ct);
            var geminiResponse = JsonSerializer.Deserialize<GeminiGenerateResponse>(responseJson, JsonOpts);

            var candidate = geminiResponse?.Candidates?.FirstOrDefault();
            if (candidate?.Content is null)
            {
                _logger.LogWarning("Gemini vratio prazan odgovor u rundi {Round}", round);
                break;
            }

            // Dodajemo Gemini-jev model turn u istoriju konverzacije
            contents.Add(candidate.Content);

            // Proveravamo da li postoji zahtev za poziv alata
            var functionCalls = candidate.Content.Parts
                .Where(p => p.FunctionCall is not null)
                .Select(p => p.FunctionCall!)
                .ToList();

            // Nema function call-ova → Gemini je gotov, vraćamo tekstualni odgovor
            if (functionCalls.Count == 0)
            {
                var replyText = candidate.Content.Parts
                    .Where(p => p.Text is not null)
                    .Select(p => p.Text!)
                    .FirstOrDefault() ?? "Žao mi je, nisam mogao da generišem odgovor.";

                _logger.LogInformation(
                    "Gemini chat završen u {Rounds} rundi, korišćeni alati: [{Tools}]",
                    round + 1, string.Join(", ", toolsUsed));

                return new ChatResponse(
                    replyText,
                    toolsUsed.AsReadOnly(),
                    FilterReferencedPostsForReply(replyText, referencedPosts),
                    BuildCardsForReply(replyText, cards));
            }

            // FIX #6: Svi function response-ovi za jednu rundu idu zajedno
            // u JEDAN "user" turn (Gemini zahteva da model+tool exchange budu upareni).
            var functionResponseParts = new List<GeminiPart>(functionCalls.Count);

            foreach (var call in functionCalls)
            {
                var canonicalToolName = NormalizeToolName(call.Name);
                toolsUsed.Add(canonicalToolName);
                _logger.LogInformation(
                    "Runda {Round}: Gemini poziva alat [{Tool}] (canonical: {CanonicalTool}) sa args: {Args}",
                    round + 1, call.Name, canonicalToolName, call.Args?.ToJsonString() ?? "{}");

                var result = await ExecuteToolAsync(call.Name, call.Args, referencedPosts, cards, ct);

                functionResponseParts.Add(new GeminiPart
                {
                    FunctionResponse = new GeminiFunctionResponse
                    {
                        Name     = call.Name,
                        Response = result
                    }
                });
            }

            // Vraćamo rezultate Gemini-ju kao jedan user turn sa svim odgovorima
            contents.Add(new GeminiContent
            {
                Role  = "user",
                Parts = functionResponseParts
            });
        }

        _logger.LogWarning("Dostignut maksimalan broj rundi ({Max}) za Gemini chat", MaxToolRounds);
        return new ChatResponse(
            "Izvinite, zahtev je previše složen za obradu. Molim vas pokušajte sa specifičnijim pitanjem.",
            toolsUsed.AsReadOnly(),
            [],
            []);
    }

    // ── Dispatcher: ime alata → servis ───────────────────────────────────────

    private async Task<JsonObject> ExecuteToolAsync(
        string toolName,
        JsonObject? args,
        List<ChatPostReference> referencedPosts,
        List<ChatCard> cards,
        CancellationToken ct)
    {
        var canonicalToolName = NormalizeToolName(toolName);

        try
        {
            object? result = canonicalToolName switch
            {
                "tourism_search_regions"         => await ExecuteSearchRegionsAsync(args, ct),
                "tourism_get_region_summary"      => await ExecuteGetRegionSummaryAsync(args, ct),
                "tourism_search_posts"            => await ExecuteSearchPostsAsync(args, ct),
                "tourism_get_post_detail"         => await ExecuteGetPostDetailAsync(args, ct),
                "tourism_search_routes"           => await ExecuteSearchRoutesAsync(args, ct),
                "tourism_get_route_detail"        => await ExecuteGetRouteDetailAsync(args, ct),
                "tourism_get_reviews"             => await ExecuteGetReviewsAsync(args, ct),
                "tourism_get_route_reviews"       => await ExecuteGetRouteReviewsAsync(args, ct),
                "tourism_search_tags"             => await ExecuteSearchTagsAsync(args, ct),
                "tourism_get_nearby"              => await ExecuteGetNearbyAsync(args, ct),
                "tourism_get_similar_posts"       => await ExecuteGetSimilarPostsAsync(args, ct),
                "tourism_get_top_content"         => await ExecuteGetTopContentAsync(args, ct),
                "tourism_search_events"           => await ExecuteSearchEventsAsync(args, ct),
                "tourism_get_recommendations"     => await ExecuteGetRecommendationsAsync(args, ct),
                "tourism_get_new_content"         => await ExecuteGetNewContentAsync(args, ct),
                "tourism_search_activities"       => await ExecuteSearchActivitiesAsync(args, ct),
                // Write alati
                "tourism_submit_review"           => await ExecuteSubmitReviewAsync(args, ct),
                "tourism_save_location"           => await ExecuteSaveLocationAsync(args, ct),
                "tourism_unsave_location"         => await ExecuteUnsaveLocationAsync(args, ct),
                "tourism_like_location"           => await ExecuteLikeLocationAsync(args, ct),
                "tourism_unlike_location"         => await ExecuteUnlikeLocationAsync(args, ct),
                "tourism_add_to_planner"          => await ExecuteAddToPlannerAsync(args, ct),
                "tourism_remove_from_planner"     => await ExecuteRemoveFromPlannerAsync(args, ct),
                _ => (object)new { error = $"Nepoznat alat: {toolName}" }
            };

            AddReferencedPosts(result, referencedPosts);
            AddCards(result, cards, _frontendBaseUrl);
            return ToToolResponseObject(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Greška pri izvršavanju alata [{Tool}]", toolName);
            // Vraćamo grešku kao JsonObject, ne bacamo izuzetak —
            // Gemini može da obavi graceful fallback kada vidi error u response-u.
            return new JsonObject { ["error"] = ex.Message };
        }
    }

    // ── Implementacije poziva servisa ─────────────────────────────────────────

    private static string NormalizeToolName(string toolName) => toolName switch
    {
        "search_regions"           => "tourism_search_regions",
        "get_region_summary"       => "tourism_get_region_summary",
        "search_posts"             => "tourism_search_posts",
        "get_post_detail"          => "tourism_get_post_detail",
        "search_routes"            => "tourism_search_routes",
        "get_route_detail"         => "tourism_get_route_detail",
        "get_reviews"              => "tourism_get_reviews",
        "get_route_reviews"        => "tourism_get_route_reviews",
        "search_tags"              => "tourism_search_tags",
        "get_nearby"               => "tourism_get_nearby",
        "get_similar_posts"        => "tourism_get_similar_posts",
        "get_top_content"          => "tourism_get_top_content",
        "search_events"            => "tourism_search_events",
        "get_recommendations"      => "tourism_get_recommendations",
        "get_new_content"          => "tourism_get_new_content",
        "search_activities"        => "tourism_search_activities",
        "submit_review"            => "tourism_submit_review",
        "save_location"            => "tourism_save_location",
        "unsave_location"          => "tourism_unsave_location",
        "like_location"            => "tourism_like_location",
        "unlike_location"          => "tourism_unlike_location",
        "add_to_planner"           => "tourism_add_to_planner",
        "remove_from_planner"      => "tourism_remove_from_planner",
        _                          => toolName
    };

    private static JsonObject ToToolResponseObject(object? result)
    {
        if (result is null)
            return new JsonObject { ["result"] = null };

        var node = JsonSerializer.SerializeToNode(result, JsonOpts);

        return node switch
        {
            null             => new JsonObject { ["result"] = null },
            JsonObject obj   => obj,
            JsonArray array  => new JsonObject { ["result"] = array },
            JsonValue value  => new JsonObject { ["result"] = value },
            _                => new JsonObject { ["result"] = node }
        };
    }

    private static void AddReferencedPosts(object? result, List<ChatPostReference> posts)
    {
        switch (result)
        {
            case null:
                return;
            case PagedResult<PostSummary> pagedPosts:
                foreach (var post in pagedPosts.Items) AddPostReference(posts, FromPostSummary(post));
                return;
            case PostSummary post:
                AddPostReference(posts, FromPostSummary(post));
                return;
            case PostDetail detail:
                AddPostReference(posts, new ChatPostReference(
                    detail.Id, detail.Title, detail.PostType, detail.Rating, detail.ReviewCount, detail.RegionName));
                return;
            case IReadOnlyList<PostSummary> postList:
                foreach (var post in postList) AddPostReference(posts, FromPostSummary(post));
                return;
            case PagedResult<EventSummary> pagedEvents:
                foreach (var item in pagedEvents.Items)
                    AddPostReference(posts, new ChatPostReference(
                        item.Id, item.Title, "event", item.AvgRating, null, null));
                return;
            case EventSummary item:
                AddPostReference(posts, new ChatPostReference(
                    item.Id, item.Title, "event", item.AvgRating, null, null));
                return;
            case IReadOnlyList<RecommendationItem> recommendations:
                foreach (var rec in recommendations.Where(x => IsPostEntity(x.EntityType)))
                    AddPostReference(posts, new ChatPostReference(
                        rec.EntityId, rec.Title, rec.PostType, null, null, rec.RegionName));
                return;
            case PagedResult<RecommendationItem> pagedRecs:
                foreach (var rec in pagedRecs.Items.Where(x => IsPostEntity(x.EntityType)))
                    AddPostReference(posts, new ChatPostReference(
                        rec.EntityId, rec.Title, rec.PostType, null, null, rec.RegionName));
                return;
            case IReadOnlyList<NewContentItem> newContent:
                foreach (var item in newContent.Where(x => IsPostEntity(x.EntityType)))
                    AddPostReference(posts, new ChatPostReference(
                        item.EntityId, item.Title, item.PostType, item.Rating, null, item.RegionName));
                return;
            case PagedResult<NewContentItem> pagedNew:
                foreach (var item in pagedNew.Items.Where(x => IsPostEntity(x.EntityType)))
                    AddPostReference(posts, new ChatPostReference(
                        item.EntityId, item.Title, item.PostType, item.Rating, null, item.RegionName));
                return;
            case IReadOnlyList<TopContentItem> topContent:
                foreach (var item in topContent.Where(x => IsPostEntity(x.EntityType)))
                    AddPostReference(posts, new ChatPostReference(
                        item.EntityId, item.Title, item.PostType, item.AvgRating, (uint?)item.ReviewCount, null));
                return;
            case PagedResult<TopContentItem> pagedTop:
                foreach (var item in pagedTop.Items.Where(x => IsPostEntity(x.EntityType)))
                    AddPostReference(posts, new ChatPostReference(
                        item.EntityId, item.Title, item.PostType, item.AvgRating, (uint?)item.ReviewCount, null));
                return;
        }
    }

    private static ChatPostReference FromPostSummary(PostSummary post) =>
        new(post.Id, post.Title, post.PostType, post.Rating, post.ReviewCount, null);

    private static bool IsPostEntity(string? entityType) =>
        string.Equals(entityType, "post", StringComparison.OrdinalIgnoreCase);

    private static void AddPostReference(List<ChatPostReference> posts, ChatPostReference post)
    {
        if (post.Id == 0 || string.IsNullOrWhiteSpace(post.Title)) return;
        if (posts.Any(existing => existing.Id == post.Id)) return;
        posts.Add(post);
    }

    // ── Kartice ──────────────────────────────────────────────────────────────

    private static void AddCards(object? result, List<ChatCard> cards, string baseUrl)
    {
        switch (result)
        {
            case null:
                return;

            case PagedResult<PostSummary> pagedPosts:
                foreach (var p in pagedPosts.Items) TryAddPostCard(cards, p, baseUrl);
                return;

            case IReadOnlyList<PostSummary> postList:
                foreach (var p in postList) TryAddPostCard(cards, p, baseUrl);
                return;

            case PostDetail detail:
                TryAddPostCardFromDetail(cards, detail, baseUrl);
                return;

            case PagedResult<RouteSummary> pagedRoutes:
                foreach (var r in pagedRoutes.Items) TryAddRouteCard(cards, r, baseUrl);
                return;

            case RouteDetail routeDetail:
                TryAddRouteCardFromDetail(cards, routeDetail, baseUrl);
                return;

            case PagedResult<RecommendationItem> pagedRecs:
                foreach (var rec in pagedRecs.Items)
                {
                    if (string.Equals(rec.EntityType, "route", StringComparison.OrdinalIgnoreCase))
                        TryAddCard(cards, new ChatCard(rec.EntityId, "route", rec.Title, null, rec.RegionName, null, null, null, null, $"{baseUrl}/routes/{rec.EntityId}", null, null, null));
                    else if (IsPostEntity(rec.EntityType))
                        TryAddCard(cards, new ChatCard(rec.EntityId, "post", rec.Title, rec.PostType, rec.RegionName, null, null, null, $"{baseUrl}/posts/{rec.EntityId}", null, null, null, null));
                }
                return;

            case IReadOnlyList<RecommendationItem> recs:
                foreach (var rec in recs)
                {
                    if (string.Equals(rec.EntityType, "route", StringComparison.OrdinalIgnoreCase))
                        TryAddCard(cards, new ChatCard(rec.EntityId, "route", rec.Title, null, rec.RegionName, null, null, null, null, $"{baseUrl}/routes/{rec.EntityId}", null, null, null));
                    else if (IsPostEntity(rec.EntityType))
                        TryAddCard(cards, new ChatCard(rec.EntityId, "post", rec.Title, rec.PostType, rec.RegionName, null, null, null, $"{baseUrl}/posts/{rec.EntityId}", null, null, null, null));
                }
                return;

            case PagedResult<TopContentItem> pagedTop:
                foreach (var item in pagedTop.Items)
                {
                    if (string.Equals(item.EntityType, "route", StringComparison.OrdinalIgnoreCase))
                        TryAddCard(cards, new ChatCard(item.EntityId, "route", item.Title, null, null, item.AvgRating, (uint?)item.ReviewCount, null, null, $"{baseUrl}/routes/{item.EntityId}", null, null, null));
                    else if (IsPostEntity(item.EntityType))
                        TryAddCard(cards, new ChatCard(item.EntityId, "post", item.Title, item.PostType, null, item.AvgRating, (uint?)item.ReviewCount, null, $"{baseUrl}/posts/{item.EntityId}", null, null, null, null));
                }
                return;

            case IReadOnlyList<TopContentItem> topContent:
                foreach (var item in topContent)
                {
                    if (string.Equals(item.EntityType, "route", StringComparison.OrdinalIgnoreCase))
                        TryAddCard(cards, new ChatCard(item.EntityId, "route", item.Title, null, null, item.AvgRating, (uint?)item.ReviewCount, null, null, $"{baseUrl}/routes/{item.EntityId}", null, null, null));
                    else if (IsPostEntity(item.EntityType))
                        TryAddCard(cards, new ChatCard(item.EntityId, "post", item.Title, item.PostType, null, item.AvgRating, (uint?)item.ReviewCount, null, $"{baseUrl}/posts/{item.EntityId}", null, null, null, null));
                }
                return;

            case PagedResult<NewContentItem> pagedNew:
                foreach (var item in pagedNew.Items)
                {
                    if (string.Equals(item.EntityType, "route", StringComparison.OrdinalIgnoreCase))
                        TryAddCard(cards, new ChatCard(item.EntityId, "route", item.Title, null, item.RegionName, item.Rating, null, null, null, $"{baseUrl}/routes/{item.EntityId}", null, null, null));
                    else if (IsPostEntity(item.EntityType))
                        TryAddCard(cards, new ChatCard(item.EntityId, "post", item.Title, item.PostType, item.RegionName, item.Rating, null, null, $"{baseUrl}/posts/{item.EntityId}", null, null, null, null));
                }
                return;

            case IReadOnlyList<NewContentItem> newContent:
                foreach (var item in newContent)
                {
                    if (string.Equals(item.EntityType, "route", StringComparison.OrdinalIgnoreCase))
                        TryAddCard(cards, new ChatCard(item.EntityId, "route", item.Title, null, item.RegionName, item.Rating, null, null, null, $"{baseUrl}/routes/{item.EntityId}", null, null, null));
                    else if (IsPostEntity(item.EntityType))
                        TryAddCard(cards, new ChatCard(item.EntityId, "post", item.Title, item.PostType, item.RegionName, item.Rating, null, null, $"{baseUrl}/posts/{item.EntityId}", null, null, null, null));
                }
                return;

            case PagedResult<EventSummary> pagedEvents:
                foreach (var ev in pagedEvents.Items)
                    TryAddCard(cards, new ChatCard(ev.Id, "post", ev.Title, "event", null, ev.AvgRating, null, null, $"{baseUrl}/posts/{ev.Id}", null, null, null, null));
                return;
        }
    }

    private static void TryAddPostCard(List<ChatCard> cards, PostSummary p, string baseUrl) =>
        TryAddCard(cards, new ChatCard(
            p.Id, "post", p.Title, p.PostType, null, p.Rating, p.ReviewCount,
            null, $"{baseUrl}/posts/{p.Id}", null, null, null, null));

    private static void TryAddPostCardFromDetail(List<ChatCard> cards, PostDetail d, string baseUrl) =>
        TryAddCard(cards, new ChatCard(
            d.Id, "post", d.Title, d.PostType, d.RegionName, d.Rating, d.ReviewCount,
            d.Images.FirstOrDefault(), $"{baseUrl}/posts/{d.Id}", null, null, null, null));

    private static void TryAddRouteCard(List<ChatCard> cards, RouteSummary r, string baseUrl) =>
        TryAddCard(cards, new ChatCard(
            r.Id, "route", r.Name, null, null, null, null,
            null, null, $"{baseUrl}/routes/{r.Id}", r.DistanceKm, (int?)r.DurationMinutes, r.Difficulty));

    private static void TryAddRouteCardFromDetail(List<ChatCard> cards, RouteDetail r, string baseUrl) =>
        TryAddCard(cards, new ChatCard(
            r.Id, "route", r.Name, null, r.RegionName, null, null,
            r.Images.FirstOrDefault(), null, $"{baseUrl}/routes/{r.Id}", r.DistanceKm, (int?)r.DurationMinutes, r.Difficulty));

    private static void TryAddCard(List<ChatCard> cards, ChatCard card)
    {
        if (card.Id == 0 || string.IsNullOrWhiteSpace(card.Title)) return;
        if (cards.Any(c => c.Id == card.Id && c.Type == card.Type)) return;
        cards.Add(card);
    }

    private static IReadOnlyList<ChatCard> BuildCardsForReply(
        string reply,
        IReadOnlyList<ChatCard> cards)
    {
        if (cards.Count == 0 || string.IsNullOrWhiteSpace(reply)) return [];

        var normalizedReply = NormalizeReferenceText(reply);
        var mentioned = cards
            .Where(c => normalizedReply.Contains(NormalizeReferenceText(c.Title), StringComparison.Ordinal))
            .Take(6)
            .ToList();

        return mentioned.Count > 0 ? mentioned : cards.Take(4).ToList();
    }

    private static IReadOnlyList<ChatPostReference> FilterReferencedPostsForReply(
        string reply,
        IReadOnlyList<ChatPostReference> posts)
    {
        if (posts.Count == 0 || string.IsNullOrWhiteSpace(reply)) return [];

        var normalizedReply = NormalizeReferenceText(reply);
        var mentioned = posts
            .Where(post => normalizedReply.Contains(NormalizeReferenceText(post.Title), StringComparison.Ordinal))
            .Take(4)
            .ToList();

        return mentioned.Count > 0 ? mentioned : posts.Take(3).ToList();
    }

    private static string NormalizeReferenceText(string value)
    {
        var normalized = value.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);

        foreach (var ch in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                builder.Append(char.IsLetterOrDigit(ch) ? ch : ' ');
        }

        return string.Join(' ', builder.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    private Task<PagedResult<RegionSummary>> ExecuteSearchRegionsAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.SearchRegionsAsync(new SearchRegionsRequest(
            Query:          GetString(args, "query"),
            Type:           GetString(args, "type"),
            Country:        GetString(args, "country"),
            HasCoordinates: GetBool  (args, "hasCoordinates"),
            Limit:          GetInt   (args, "limit")  ?? 10,
            Offset:         GetInt   (args, "offset") ?? 0), ct);

    private async Task<RegionFullSummary?> ExecuteGetRegionSummaryAsync(JsonObject? args, CancellationToken ct)
    {
        var regionId = GetUint(args, "regionId");
        if (regionId is null || regionId == 0)
        {
            var name = GetString(args, "regionName");
            if (!string.IsNullOrWhiteSpace(name))
                regionId = await _tourismQueryService.ResolveRegionIdAsync(name, ct);
        }
        if (regionId is null || regionId == 0) return null;
        return await _tourismQueryService.GetRegionSummaryAsync(new GetRegionSummaryRequest(regionId.Value), ct);
    }

    private async Task<PagedResult<PostSummary>> ExecuteSearchPostsAsync(JsonObject? args, CancellationToken ct)
    {
        var regionId = GetUint(args, "regionId");
        if (regionId is null)
        {
            var regionName = GetString(args, "regionName");
            if (!string.IsNullOrWhiteSpace(regionName))
                regionId = await _tourismQueryService.ResolveRegionIdAsync(regionName, ct);
        }
        return await _tourismQueryService.SearchPostsAsync(new SearchPostsRequest(
            RegionId:       regionId,
            Query:          GetString    (args, "query"),
            PostTypes:      GetStringList(args, "postTypes"),
            MinRating:      GetDouble    (args, "minRating"),
            MaxRating:      GetDouble    (args, "maxRating"),
            UserLatitude:   GetDouble    (args, "userLatitude"),
            UserLongitude:  GetDouble    (args, "userLongitude"),
            RadiusKm:       GetDouble    (args, "radiusKm"),
            Tags:           GetStringList(args, "tags"),
            HasExternalUrl: GetBool      (args, "hasExternalUrl"),
            HasOpeningHours:GetBool      (args, "hasOpeningHours"),
            SortBy:         GetString    (args, "sortBy"),
            Limit:          GetInt       (args, "limit")  ?? 10,
            Offset:         GetInt       (args, "offset") ?? 0), ct);
    }

    private async Task<PostDetail?> ExecuteGetPostDetailAsync(JsonObject? args, CancellationToken ct)
    {
        var postId = GetUint(args, "postId");
        if (postId is null || postId == 0)
        {
            var name = GetString(args, "postName");
            if (!string.IsNullOrWhiteSpace(name))
            {
                var resolved = await _tourismQueryService.ResolvePostAsync(name, ct);
                if (resolved.Found) postId = resolved.Id;
            }
        }
        if (postId is null || postId == 0) return null;
        return await _tourismQueryService.GetPostDetailAsync(new PostDetailRequest(postId.Value), ct);
    }

    private async Task<PagedResult<RouteSummary>> ExecuteSearchRoutesAsync(JsonObject? args, CancellationToken ct)
    {
        var regionId = GetUint(args, "regionId");
        if (regionId is null)
        {
            var regionName = GetString(args, "regionName");
            if (!string.IsNullOrWhiteSpace(regionName))
                regionId = await _tourismQueryService.ResolveRegionIdAsync(regionName, ct);
        }
        return await _tourismQueryService.SearchRoutesAsync(new SearchRoutesRequest(
            RegionId:           regionId,
            Query:              GetString    (args, "query"),
            Difficulties:       GetStringList(args, "difficulties"),
            MaxDistanceKm:      GetDecimal   (args, "maxDistanceKm"),
            MinDistanceKm:      GetDecimal   (args, "minDistanceKm"),
            MaxDurationMinutes: GetInt       (args, "maxDurationMinutes"),
            MinDurationMinutes: GetInt       (args, "minDurationMinutes"),
            MaxElevationGain:   GetUint      (args, "maxElevationGain"),
            MinRating:          null,
            SortBy:             GetString    (args, "sortBy"),
            Limit:              GetInt       (args, "limit")  ?? 10,
            Offset:             GetInt       (args, "offset") ?? 0), ct);
    }

    private async Task<RouteDetail?> ExecuteGetRouteDetailAsync(JsonObject? args, CancellationToken ct)
    {
        var routeId = GetUint(args, "routeId");
        if (routeId is null || routeId == 0)
        {
            var name = GetString(args, "routeName");
            if (!string.IsNullOrWhiteSpace(name))
            {
                var resolved = await _tourismQueryService.ResolveRouteAsync(name, ct);
                if (resolved.Found) routeId = resolved.Id;
            }
        }
        if (routeId is null || routeId == 0) return null;
        return await _tourismQueryService.GetRouteDetailAsync(new RouteDetailRequest(routeId.Value), ct);
    }

    private async Task<PagedResult<ReviewSummary>> ExecuteGetReviewsAsync(JsonObject? args, CancellationToken ct)
    {
        var postId = GetUint(args, "postId");
        if (postId is null || postId == 0)
        {
            var name = GetString(args, "postName");
            if (!string.IsNullOrWhiteSpace(name))
            {
                var resolved = await _tourismQueryService.ResolvePostAsync(name, ct);
                if (resolved.Found) postId = resolved.Id;
            }
        }
        if (postId is null || postId == 0) return new PagedResult<ReviewSummary>([], 0, false);
        return await _tourismQueryService.GetReviewsAsync(new GetReviewsRequest(
            PostId:       postId.Value,
            OnlyApproved: GetBool  (args, "onlyApproved") ?? true,
            MinRating:    GetInt   (args, "minRating"),
            MaxRating:    GetInt   (args, "maxRating"),
            SortBy:       GetString(args, "sortBy"),
            Limit:        GetInt   (args, "limit")  ?? 20,
            Offset:       GetInt   (args, "offset") ?? 0), ct);
    }

    private async Task<PagedResult<ReviewSummary>> ExecuteGetRouteReviewsAsync(JsonObject? args, CancellationToken ct)
    {
        var routeId = GetUint(args, "routeId");
        if (routeId is null || routeId == 0)
        {
            var name = GetString(args, "routeName");
            if (!string.IsNullOrWhiteSpace(name))
            {
                var resolved = await _tourismQueryService.ResolveRouteAsync(name, ct);
                if (resolved.Found) routeId = resolved.Id;
            }
        }
        if (routeId is null || routeId == 0) return new PagedResult<ReviewSummary>([], 0, false);
        return await _tourismQueryService.GetRouteReviewsAsync(new GetRouteReviewsRequest(
            RouteId:      routeId.Value,
            OnlyApproved: GetBool  (args, "onlyApproved") ?? true,
            MinRating:    GetInt   (args, "minRating"),
            MaxRating:    GetInt   (args, "maxRating"),
            SortBy:       GetString(args, "sortBy"),
            Limit:        GetInt   (args, "limit")  ?? 20,
            Offset:       GetInt   (args, "offset") ?? 0), ct);
    }

    private Task<IReadOnlyList<TagSummary>> ExecuteSearchTagsAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.SearchTagsAsync(new SearchTagsRequest(
            Query:       GetString(args, "query"),
            Category:    GetString(args, "category"),
            Difficulty:  GetString(args, "difficulty"),
            HasCapacity: GetBool  (args, "hasCapacity"),
            Limit:       GetInt   (args, "limit") ?? 50), ct);

    private Task<PagedResult<PostSummary>> ExecuteGetNearbyAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.GetNearbyAsync(new GetNearbyRequest(
            Latitude:  GetDouble    (args, "latitude")  ?? 0,
            Longitude: GetDouble    (args, "longitude") ?? 0,
            RadiusKm:  GetDouble    (args, "radiusKm")  ?? 5.0,
            PostTypes: GetStringList(args, "postTypes"),
            MinRating: GetDouble    (args, "minRating"),
            Limit:     GetInt       (args, "limit") ?? 10,
            Offset:    GetInt       (args, "offset") ?? 0), ct);

    private async Task<IReadOnlyList<PostSummary>> ExecuteGetSimilarPostsAsync(JsonObject? args, CancellationToken ct)
    {
        var postId = GetUint(args, "postId");
        if (postId is null || postId == 0)
        {
            var name = GetString(args, "postName");
            if (!string.IsNullOrWhiteSpace(name))
            {
                var resolved = await _tourismQueryService.ResolvePostAsync(name, ct);
                if (resolved.Found) postId = resolved.Id;
            }
        }
        if (postId is null || postId == 0) return [];
        return await _tourismQueryService.GetSimilarPostsAsync(new GetSimilarPostsRequest(
            PostId: postId.Value,
            Limit:  GetInt(args, "limit") ?? 5), ct);
    }

    private async Task<PagedResult<TopContentItem>> ExecuteGetTopContentAsync(JsonObject? args, CancellationToken ct)
    {
        var regionId = GetUint(args, "regionId");
        if (regionId is null)
        {
            var regionName = GetString(args, "regionName");
            if (!string.IsNullOrWhiteSpace(regionName))
                regionId = await _tourismQueryService.ResolveRegionIdAsync(regionName, ct);
        }
        return await _tourismQueryService.GetTopContentUnifiedAsync(new GetTopContentUnifiedRequest(
            SortBy:        GetString(args, "sortBy")       ?? "views",
            PostType:      GetString(args, "postType"),
            IncludeRoutes: GetBool  (args, "includeRoutes") ?? true,
            RegionId:      regionId,
            Limit:         GetInt   (args, "limit")  ?? 10,
            Offset:        GetInt   (args, "offset") ?? 0), ct);
    }

    private async Task<PagedResult<EventSummary>> ExecuteSearchEventsAsync(JsonObject? args, CancellationToken ct)
    {
        var regionId = GetUint(args, "regionId");
        if (regionId is null)
        {
            var regionName = GetString(args, "regionName");
            if (!string.IsNullOrWhiteSpace(regionName))
                regionId = await _tourismQueryService.ResolveRegionIdAsync(regionName, ct);
        }
        return await _tourismQueryService.SearchEventsAsync(new SearchEventsRequest(
            RegionId:     regionId,
            Query:        GetString  (args, "query"),
            StartFrom:    GetDateTime(args, "startFrom"),
            StartTo:      GetDateTime(args, "startTo"),
            Category:     GetString  (args, "category"),
            HasTicketUrl: GetBool    (args, "hasTicketUrl"),
            SortBy:       GetString  (args, "sortBy"),
            Limit:        GetInt     (args, "limit")  ?? 10,
            Offset:       GetInt     (args, "offset") ?? 0), ct);
    }

    private async Task<PagedResult<RecommendationItem>> ExecuteGetRecommendationsAsync(JsonObject? args, CancellationToken ct)
    {
        var regionId = GetUint(args, "regionId");
        if (regionId is null || regionId == 0)
        {
            var regionName = GetString(args, "regionName");
            if (!string.IsNullOrWhiteSpace(regionName))
                regionId = await _tourismQueryService.ResolveRegionIdAsync(regionName, ct);
        }
        if (regionId is null || regionId == 0) return new PagedResult<RecommendationItem>([], 0, false);
        return await _tourismQueryService.GetRecommendationsAsync(new GetRecommendationsRequest(
            RegionId:    regionId.Value,
            TouristId:   null,
            ContextMode: GetString(args, "contextMode") ?? "onsite",
            Limit:       Math.Clamp(GetInt(args, "limit") ?? 10, 1, 20),
            Offset:      GetInt(args, "offset") ?? 0), ct);
    }

    private async Task<PagedResult<NewContentItem>> ExecuteGetNewContentAsync(JsonObject? args, CancellationToken ct)
    {
        var regionId = GetUint(args, "regionId");
        if (regionId is null)
        {
            var regionName = GetString(args, "regionName");
            if (!string.IsNullOrWhiteSpace(regionName))
                regionId = await _tourismQueryService.ResolveRegionIdAsync(regionName, ct);
        }
        return await _tourismQueryService.GetNewContentAsync(new GetNewContentRequest(
            RegionId: regionId,
            DaysBack: GetInt(args, "daysBack") ?? 30,
            Limit:    GetInt(args, "limit")    ?? 20,
            Offset:   GetInt(args, "offset")   ?? 0), ct);
    }

    private async Task<IReadOnlyList<TagSummary>> ExecuteSearchActivitiesAsync(JsonObject? args, CancellationToken ct)
    {
        var regionId = GetUint(args, "regionId");
        if (regionId is null)
        {
            var regionName = GetString(args, "regionName");
            if (!string.IsNullOrWhiteSpace(regionName))
                regionId = await _tourismQueryService.ResolveRegionIdAsync(regionName, ct);
        }
        return await _tourismQueryService.SearchActivitiesAsync(new SearchActivitiesRequest(
            Query:       GetString(args, "query"),
            Category:    GetString(args, "category"),
            Difficulty:  GetString(args, "difficulty"),
            MinCapacity: GetInt   (args, "minCapacity"),
            MaxCapacity: GetInt   (args, "maxCapacity"),
            Limit:       GetInt   (args, "limit") ?? 50,
            RegionId:    regionId), ct);
    }

    private async Task<IReadOnlyList<VisitTrendPoint>> ExecuteGetVisitTrendsAsync(JsonObject? args, CancellationToken ct)
    {
        var regionId = GetUint(args, "regionId");
        if (regionId is null)
        {
            var regionName = GetString(args, "regionName");
            if (!string.IsNullOrWhiteSpace(regionName))
                regionId = await _tourismQueryService.ResolveRegionIdAsync(regionName, ct);
        }
        return await _tourismQueryService.GetVisitTrendsAsync(new GetVisitTrendsRequest(
            RegionId: regionId,
            FromDate: GetDateTime(args, "fromDate"),
            ToDate:   GetDateTime(args, "toDate")), ct);
    }

    private async Task<IReadOnlyList<ExternalClickSummary>> ExecuteGetExternalClickStatsAsync(JsonObject? args, CancellationToken ct)
    {
        var regionId = GetUint(args, "regionId");
        if (regionId is null)
        {
            var regionName = GetString(args, "regionName");
            if (!string.IsNullOrWhiteSpace(regionName))
                regionId = await _tourismQueryService.ResolveRegionIdAsync(regionName, ct);
        }
        var postId = GetUint(args, "postId");
        if (postId is null)
        {
            var postName = GetString(args, "postName");
            if (!string.IsNullOrWhiteSpace(postName))
            {
                var resolved = await _tourismQueryService.ResolvePostAsync(postName, ct);
                if (resolved.Found) postId = resolved.Id;
            }
        }
        return await _tourismQueryService.GetExternalClickStatsAsync(new GetExternalClickStatsRequest(
            PostId:   postId,
            RegionId: regionId,
            Limit:    GetInt(args, "limit") ?? 20), ct);
    }

    private async Task<IReadOnlyList<DirectionRequestSummary>> ExecuteGetDirectionStatsAsync(JsonObject? args, CancellationToken ct)
    {
        var regionId = GetUint(args, "regionId");
        if (regionId is null)
        {
            var regionName = GetString(args, "regionName");
            if (!string.IsNullOrWhiteSpace(regionName))
                regionId = await _tourismQueryService.ResolveRegionIdAsync(regionName, ct);
        }
        return await _tourismQueryService.GetDirectionStatsAsync(new GetDirectionStatsRequest(
            RegionId: regionId,
            Limit:    GetInt(args, "limit") ?? 20), ct);
    }

    // ── Write Execute metode ────────────────────────────────────────────────

    private async Task<WriteResult> ExecuteSubmitReviewAsync(JsonObject? args, CancellationToken ct)
    {
        var postId = GetUint(args, "postId");
        if (postId is null || postId == 0)
        {
            var name = GetString(args, "postName");
            if (!string.IsNullOrWhiteSpace(name))
            {
                var resolved = await _tourismQueryService.ResolvePostAsync(name, ct);
                if (resolved.Found) postId = resolved.Id;
            }
        }
        if (postId is null || postId == 0)
            return new WriteResult(false, "Lokacija nije pronađena.");
        var rating = GetInt(args, "rating") ?? 0;
        var comment = GetString(args, "comment");
        return await _tourismWriteService.SubmitReviewAsync(postId.Value, rating, comment, ct);
    }

    private async Task<WriteResult> ExecuteSaveLocationAsync(JsonObject? args, CancellationToken ct)
    {
        var postId = await ResolveWritePostIdAsync(args, ct);
        if (postId is null) return new WriteResult(false, "Lokacija nije pronađena.");
        return await _tourismWriteService.SavePostAsync(postId.Value, ct);
    }

    private async Task<WriteResult> ExecuteUnsaveLocationAsync(JsonObject? args, CancellationToken ct)
    {
        var postId = await ResolveWritePostIdAsync(args, ct);
        if (postId is null) return new WriteResult(false, "Lokacija nije pronađena.");
        return await _tourismWriteService.UnsavePostAsync(postId.Value, ct);
    }

    private async Task<WriteResult> ExecuteLikeLocationAsync(JsonObject? args, CancellationToken ct)
    {
        var postId = await ResolveWritePostIdAsync(args, ct);
        if (postId is null) return new WriteResult(false, "Lokacija nije pronađena.");
        return await _tourismWriteService.LikePostAsync(postId.Value, ct);
    }

    private async Task<WriteResult> ExecuteUnlikeLocationAsync(JsonObject? args, CancellationToken ct)
    {
        var postId = await ResolveWritePostIdAsync(args, ct);
        if (postId is null) return new WriteResult(false, "Lokacija nije pronađena.");
        return await _tourismWriteService.UnlikePostAsync(postId.Value, ct);
    }

    private async Task<WriteResult> ExecuteAddToPlannerAsync(JsonObject? args, CancellationToken ct)
    {
        var postId = await ResolveWritePostIdAsync(args, ct);
        if (postId is null) return new WriteResult(false, "Lokacija nije pronađena.");
        return await _tourismWriteService.AddToCalendarAsync(postId.Value, ct);
    }

    private async Task<WriteResult> ExecuteRemoveFromPlannerAsync(JsonObject? args, CancellationToken ct)
    {
        var postId = await ResolveWritePostIdAsync(args, ct);
        if (postId is null) return new WriteResult(false, "Lokacija nije pronađena.");
        return await _tourismWriteService.RemoveFromCalendarAsync(postId.Value, ct);
    }

    private async Task<uint?> ResolveWritePostIdAsync(JsonObject? args, CancellationToken ct)
    {
        var postId = GetUint(args, "postId");
        if (postId is not null && postId > 0) return postId;
        var name = GetString(args, "postName");
        if (string.IsNullOrWhiteSpace(name)) return null;
        var resolved = await _tourismQueryService.ResolvePostAsync(name, ct);
        return resolved.Found ? resolved.Id : null;
    }

    // ── Pomoćne metode za čitanje argumenata ─────────────────────────────────

    private static string? TryExtractGeminiErrorMessage(string errorBody)
    {
        try
        {
            var root = JsonNode.Parse(errorBody);
            return root?["error"]?["message"]?.GetValue<string>();
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string? TryExtractGeminiRetryDelay(string errorBody)
    {
        try
        {
            var details = JsonNode.Parse(errorBody)?["error"]?["details"]?.AsArray();
            return details?
                .Select(d => d?["retryDelay"]?.GetValue<string>())
                .FirstOrDefault(delay => !string.IsNullOrWhiteSpace(delay));
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string NormalizeGeminiModelName(string model)
    {
        const string prefix = "models/";
        var trimmed = model.Trim();

        return trimmed.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            ? trimmed[prefix.Length..]
            : trimmed;
    }

    private static string? GetString(JsonObject? obj, string key) =>
        obj?.TryGetPropertyValue(key, out var node) == true
            ? node?.GetValueKind() == JsonValueKind.String ? node.GetValue<string>() : null
            : null;

    // FIX #7: GetInt koristi Convert.ToInt32 umesto direktnog casta kako bi
    // ispravno obradio double vrednosti poput 10.0 bez potencijalnog overflow-a.
    private static int? GetInt(JsonObject? obj, string key)
    {
        if (obj?.TryGetPropertyValue(key, out var node) != true || node is null) return null;
        return node.GetValueKind() switch
        {
            JsonValueKind.Number => Convert.ToInt32(node.GetValue<double>()),
            JsonValueKind.String => int.TryParse(node.GetValue<string>(), out var v) ? v : null,
            _ => null
        };
    }

    private static uint? GetUint(JsonObject? obj, string key)
    {
        var v = GetInt(obj, key);
        return v.HasValue && v.Value >= 0 ? (uint?)v.Value : null;
    }

    private static double? GetDouble(JsonObject? obj, string key)
    {
        if (obj?.TryGetPropertyValue(key, out var node) != true || node is null) return null;
        return node.GetValueKind() == JsonValueKind.Number ? node.GetValue<double>() : null;
    }

    private static decimal? GetDecimal(JsonObject? obj, string key) =>
        GetDouble(obj, key) is double d ? (decimal)d : null;

    private static bool? GetBool(JsonObject? obj, string key)
    {
        if (obj?.TryGetPropertyValue(key, out var node) != true || node is null) return null;
        return node.GetValueKind() switch
        {
            JsonValueKind.True  => true,
            JsonValueKind.False => false,
            _ => null
        };
    }

    private static DateTime? GetDateTime(JsonObject? obj, string key)
    {
        var s = GetString(obj, key);
        // FIX #8: Eksplicitno parsiramo u UTC kako bi datetime vrednosti bile konzistentne
        return DateTime.TryParse(s, null, System.Globalization.DateTimeStyles.RoundtripKind, out var dt)
            ? dt
            : null;
    }

    private static IReadOnlyList<string>? GetStringList(JsonObject? obj, string key)
    {
        if (obj?.TryGetPropertyValue(key, out var node) != true || node is null) return null;
        if (node is not JsonArray arr) return null;
        var result = arr
            .Select(n => n?.GetValueKind() == JsonValueKind.String ? n.GetValue<string>() : null)
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s!)
            .ToList();
        return result.Count > 0 ? result : null;
    }

    // ── Gradnja istorije konverzacije ─────────────────────────────────────────

    /// <summary>
    /// Gradi listu Gemini content objekata iz zahteva.
    /// <para>
    /// Context truncation: čuva samo poslednjih <paramref name="maxHistoryMessages"/> poruka iz istorije.
    /// MCP alati ubacuju obimne odgovore iz baze, pa duza istorija brzo troši tokene.
    /// Sistemska poruka (SystemInstruction) se šalje odvojeno i nije deo ovog niza.
    /// </para>
    /// </summary>
    private static List<GeminiContent> BuildContents(ChatRequest request, int maxHistoryMessages)
    {
        var contents = new List<GeminiContent>();

        if (request.History is { Count: > 0 })
        {
            // Context truncation: zadržavamo samo poslednjih maxHistoryMessages poruka.
            // Poruke se čitaju od novijeg ka starijem, pa uzmemo kraj liste.
            var history = request.History;
            int startIndex = history.Count > maxHistoryMessages
                ? history.Count - maxHistoryMessages
                : 0;

            for (int idx = startIndex; idx < history.Count; idx++)
            {
                var msg = history[idx];

                // Eksplicitno mapiranje rola — samo "user" i "model" su validni za Gemini.
                var role = msg.Role.Equals("model", StringComparison.OrdinalIgnoreCase)
                    ? "model"
                    : "user";

                // Preskačemo prazne poruke
                if (string.IsNullOrWhiteSpace(msg.Text)) continue;

                contents.Add(new GeminiContent
                {
                    Role  = role,
                    Parts = [new GeminiPart { Text = msg.Text }]
                });
            }

            // Gemini zahteva da historija počinje sa "user" turn-om.
            // Ako je truncation odsjekao početne user poruke i ostali smo sa "model" turn-om, dodajemo placeholder.
            if (contents.Count > 0 && contents[0].Role == "model")
            {
                contents.Insert(0, new GeminiContent
                {
                    Role  = "user",
                    Parts = [new GeminiPart { Text = "..." }]
                });
            }
        }

        // Trenutna korisnička poruka uvek ide na kraj
        contents.Add(new GeminiContent
        {
            Role  = "user",
            Parts = [new GeminiPart { Text = request.Message }]
        });

        return contents;
    }

    // ── Definicije Gemini alata (keširano) ───────────────────────────────────

    private static List<GeminiTool> BuildTourismTools() =>
    [
        new GeminiTool
        {
            FunctionDeclarations =
            [
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_search_regions",
                    Description = "Search tourist regions and destinations such as cities, mountains, lakes, and national parks. Returns paged results with total count.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "query":          { "type": "string",  "description": "Optional free-text query, e.g. Zabljak, Budva, Durmitor." },
                            "type":           { "type": "string",  "description": "Optional type filter: city, mountain, lake, national_park, coast, village, other." },
                            "country":        { "type": "string",  "description": "Optional country filter, e.g. Montenegro." },
                            "hasCoordinates": { "type": "boolean", "description": "If true, returns only regions with GPS coordinates." },
                            "limit":          { "type": "integer", "description": "Maximum number of results (default 10)." },
                            "offset":         { "type": "integer", "description": "Number of results to skip for pagination (default 0)." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_get_region_summary",
                    Description = "Get a full overview of a specific region: total post count, route count, average rating, and breakdown of posts by type. Provide regionId OR regionName — not both.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "regionId":   { "type": "integer", "description": "Numeric region ID (use if already known)." },
                            "regionName": { "type": "string",  "description": "Region name or partial name (e.g. 'Zabljak', 'Durmitor'). Used when regionId is not provided." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_search_posts",
                    Description = "Search published locations and points of interest. Post types: accommodation, restaurant, club, cultural_site, monument, sports_facility, event, attraction, shop, other. Sort options: rating (default), distance (requires coordinates), title, newest. Use regionName instead of regionId when you only know the destination name.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "regionId":       { "type": "integer", "description": "Optional region ID (use regionName if ID is unknown)." },
                            "regionName":     { "type": "string",  "description": "Region name or partial name (e.g. 'Zabljak'). Resolved when regionId not provided." },
                            "query":          { "type": "string",  "description": "Optional free-text query matching title, description, or address." },
                            "postTypes":      { "type": "array", "items": { "type": "string" }, "description": "Optional post type list: accommodation, restaurant, club, cultural_site, monument, sports_facility, event, attraction, shop, other." },
                            "minRating":      { "type": "number",  "description": "Optional minimum average rating (0-5)." },
                            "maxRating":      { "type": "number",  "description": "Optional maximum average rating (0-5)." },
                            "tags":           { "type": "array", "items": { "type": "string" }, "description": "Optional tag names to filter by." },
                            "hasExternalUrl": { "type": "boolean", "description": "If true, only returns locations with an external booking/info URL." },
                            "hasOpeningHours":{ "type": "boolean", "description": "If true, only returns locations with opening hours defined." },
                            "userLatitude":   { "type": "number",  "description": "User latitude for proximity sorting and radius filtering." },
                            "userLongitude":  { "type": "number",  "description": "User longitude for proximity sorting and radius filtering." },
                            "radiusKm":       { "type": "number",  "description": "Only return results within this many km from the user location." },
                            "sortBy":         { "type": "string",  "description": "Sort order: rating (default), distance, title, newest." },
                            "limit":          { "type": "integer", "description": "Maximum number of results (default 10)." },
                            "offset":         { "type": "integer", "description": "Number of results to skip for pagination (default 0)." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_get_post_detail",
                    Description = "Get full details for a specific location: description, opening hours, rating, views, likes, review count, tags, external booking URL, and images. Provide postId OR postName — not both.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "postId":   { "type": "integer", "description": "Numeric ID of the location (use if already known)." },
                            "postName": { "type": "string",  "description": "Location name or partial name (e.g. 'Hotel Durmitor'). Used when postId is not provided." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_search_routes",
                    Description = "Search published tourist routes (hiking, cycling, walking). Difficulty: easy, moderate, hard, expert. Sort: distance_asc, distance_desc, duration_asc, duration_desc, elevation_asc, elevation_desc, popular.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "regionId":           { "type": "integer", "description": "Optional region ID (use regionName if unknown)." },
                            "regionName":         { "type": "string",  "description": "Region name or partial name. Resolved when regionId not provided." },
                            "query":              { "type": "string",  "description": "Optional free-text query matching route name or description." },
                            "difficulties":       { "type": "array", "items": { "type": "string" }, "description": "Optional difficulty list: easy, moderate, hard, expert." },
                            "maxDistanceKm":      { "type": "number",  "description": "Optional maximum route distance in kilometers." },
                            "minDistanceKm":      { "type": "number",  "description": "Optional minimum route distance in kilometers." },
                            "maxDurationMinutes": { "type": "integer", "description": "Optional maximum duration in minutes." },
                            "minDurationMinutes": { "type": "integer", "description": "Optional minimum duration in minutes." },
                            "maxElevationGain":   { "type": "integer", "description": "Optional maximum elevation gain in meters." },
                            "sortBy":             { "type": "string",  "description": "Sort order: distance_asc, distance_desc, duration_asc, duration_desc, elevation_asc, elevation_desc, popular." },
                            "limit":              { "type": "integer", "description": "Maximum number of results (default 10)." },
                            "offset":             { "type": "integer", "description": "Number of results to skip for pagination (default 0)." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_get_route_detail",
                    Description = "Get full details for a specific route: waypoints, GPX path, distance, duration, elevation gain, view count, save count, and images. Provide routeId OR routeName — not both.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "routeId":   { "type": "integer", "description": "Numeric ID of the route (use if already known)." },
                            "routeName": { "type": "string",  "description": "Route name or partial name (e.g. 'Crno jezero'). Used when routeId is not provided." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_get_reviews",
                    Description = "Get visitor reviews for a specific location. Provide postId OR postName — not both.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "postId":       { "type": "integer", "description": "Numeric ID of the location (use if already known)." },
                            "postName":     { "type": "string",  "description": "Location name or partial name. Used when postId is not provided." },
                            "onlyApproved": { "type": "boolean", "description": "If true, returns only approved reviews (default true)." },
                            "minRating":    { "type": "integer", "description": "Optional minimum rating filter (1-5)." },
                            "maxRating":    { "type": "integer", "description": "Optional maximum rating filter (1-5)." },
                            "sortBy":       { "type": "string",  "description": "Sort order: rating_asc, rating_desc, or newest (default)." },
                            "limit":        { "type": "integer", "description": "Maximum number of results (default 20)." },
                            "offset":       { "type": "integer", "description": "Number of results to skip for pagination (default 0)." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_get_route_reviews",
                    Description = "Get visitor reviews for a specific route. Provide routeId OR routeName — not both.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "routeId":      { "type": "integer", "description": "Numeric ID of the route (use if already known)." },
                            "routeName":    { "type": "string",  "description": "Route name or partial name. Used when routeId is not provided." },
                            "onlyApproved": { "type": "boolean", "description": "If true, returns only approved reviews (default true)." },
                            "minRating":    { "type": "integer", "description": "Optional minimum rating filter (1-5)." },
                            "maxRating":    { "type": "integer", "description": "Optional maximum rating filter (1-5)." },
                            "sortBy":       { "type": "string",  "description": "Sort order: rating_asc, rating_desc, or newest (default)." },
                            "limit":        { "type": "integer", "description": "Maximum number of results (default 20)." },
                            "offset":       { "type": "integer", "description": "Number of results to skip for pagination (default 0)." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_search_tags",
                    Description = "Search available tags by category. Categories: aktivnost (activities), amenity, stil (style/vibe), cijena (price), tip (type), oznaka (label).",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "query":       { "type": "string",  "description": "Optional free-text search on tag name or description." },
                            "category":    { "type": "string",  "description": "Optional category filter: aktivnost, amenity, stil, cijena, tip, oznaka." },
                            "difficulty":  { "type": "string",  "description": "Optional difficulty filter for activity tags: EASY, MEDIUM, HARD." },
                            "hasCapacity": { "type": "boolean", "description": "If true, only returns activity tags with a defined max capacity." },
                            "limit":       { "type": "integer", "description": "Maximum number of results (default 50)." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_get_nearby",
                    Description = "Find locations near a specific GPS coordinate within a given radius. Results are sorted by distance.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "latitude":  { "type": "number",  "description": "Latitude of the center point." },
                            "longitude": { "type": "number",  "description": "Longitude of the center point." },
                            "radiusKm":  { "type": "number",  "description": "Search radius in kilometers (default 5)." },
                            "postTypes": { "type": "array", "items": { "type": "string" }, "description": "Optional post type filter." },
                            "minRating": { "type": "number",  "description": "Optional minimum rating filter." },
                            "limit":     { "type": "integer", "description": "Maximum number of results (default 10)." },
                            "offset":    { "type": "integer", "description": "Number of results to skip for pagination (default 0)." }
                        },
                        "required": ["latitude", "longitude"]
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_get_similar_posts",
                    Description = "Get locations similar to a given location, matched by shared tags, same type, and same region. Provide postId OR postName — not both.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "postId":   { "type": "integer", "description": "Numeric ID of the reference location (use if already known)." },
                            "postName": { "type": "string",  "description": "Location name or partial name. Used when postId is not provided." },
                            "limit":    { "type": "integer", "description": "Maximum number of similar results (default 5)." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_get_top_content",
                    Description = "Get the most popular locations AND routes ranked by a specific metric. By default includes both. SortBy values: views, likes, shares, rating, review_count.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "sortBy":        { "type": "string",  "description": "Sort metric: views (default), likes, shares, rating, review_count." },
                            "postType":      { "type": "string",  "description": "Optional post type filter. When set, routes are excluded." },
                            "includeRoutes": { "type": "boolean", "description": "If true (default), includes routes alongside locations." },
                            "regionId":      { "type": "integer", "description": "Optional region ID (use regionName if unknown)." },
                            "regionName":    { "type": "string",  "description": "Region name or partial name. Resolved when regionId not provided." },
                            "limit":         { "type": "integer", "description": "Maximum number of results (default 10)." },
                            "offset":        { "type": "integer", "description": "Number of results to skip for pagination (default 0)." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_search_events",
                    Description = "Search published events (concerts, festivals, sports, theatre, tours). Categories: CONCERT, SPORT, THEATER, FESTIVAL, OTHER. Use regionName instead of regionId when you only know the destination name.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "regionId":     { "type": "integer", "description": "Optional region ID (use regionName if unknown)." },
                            "regionName":   { "type": "string",  "description": "Region name or partial name. Resolved when regionId not provided." },
                            "query":        { "type": "string",  "description": "Optional free-text query matching event title or description." },
                            "startFrom":    { "type": "string",  "description": "Optional start of date range (ISO 8601, e.g. 2025-07-01T00:00:00Z)." },
                            "startTo":      { "type": "string",  "description": "Optional end of date range (ISO 8601, e.g. 2025-07-31T23:59:59Z)." },
                            "category":     { "type": "string",  "description": "Optional category filter: CONCERT, SPORT, THEATER, FESTIVAL, OTHER." },
                            "hasTicketUrl": { "type": "boolean", "description": "If true, returns only events with an online ticket purchase URL." },
                            "sortBy":       { "type": "string",  "description": "Sort order: start_date_asc (default), start_date_desc, rating, title." },
                            "limit":        { "type": "integer", "description": "Maximum number of results (default 10)." },
                            "offset":       { "type": "integer", "description": "Number of results to skip for pagination (default 0)." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_get_recommendations",
                    Description = "Get personalized content recommendations for a specific region. Provide regionId OR regionName. contextMode: onsite (default) or planning.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "regionId":    { "type": "integer", "description": "Numeric region ID (use if already known)." },
                            "regionName":  { "type": "string",  "description": "Region name or partial name (e.g. 'Zabljak'). Used when regionId is not provided." },
                            "contextMode": { "type": "string",  "description": "Context mode: onsite (default) or planning." },
                            "limit":       { "type": "integer", "description": "Maximum number of results (default 10, max 20)." },
                            "offset":      { "type": "integer", "description": "Number of results to skip for pagination (default 0)." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_get_new_content",
                    Description = "Get recently published locations and routes, ordered by publish date. Use to answer 'what is new' or 'recently added' questions.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "regionId":   { "type": "integer", "description": "Optional region ID (use regionName if unknown)." },
                            "regionName": { "type": "string",  "description": "Region name or partial name. Resolved when regionId not provided." },
                            "daysBack":   { "type": "integer", "description": "How many days back to look for new content (default 30)." },
                            "limit":      { "type": "integer", "description": "Maximum number of results (default 20)." },
                            "offset":     { "type": "integer", "description": "Number of results to skip for pagination (default 0)." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_search_activities",
                    Description = "Search activities and things to do in a specific region or globally. When user asks for activities in a place (e.g. 'activities in Zabljak'), use regionName to scope results. Categories: SPORT, ADVENTURE, WELLNESS, SHOPPING, DINING, NIGHTLIFE, SIGHTSEEING, CULTURE, OTHER.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "regionName":  { "type": "string",  "description": "Region name or partial name (e.g. 'Zabljak'). Scopes activities to this region." },
                            "query":       { "type": "string",  "description": "Optional free-text search on activity name or description." },
                            "category":    { "type": "string",  "description": "Optional category: SPORT, ADVENTURE, WELLNESS, SHOPPING, DINING, NIGHTLIFE, SIGHTSEEING, CULTURE, OTHER." },
                            "difficulty":  { "type": "string",  "description": "Optional difficulty: EASY, MEDIUM, HARD." },
                            "minCapacity": { "type": "integer", "description": "Minimum group capacity." },
                            "maxCapacity": { "type": "integer", "description": "Maximum group capacity." },
                            "limit":       { "type": "integer", "description": "Maximum number of results (default 50)." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_get_visit_trends",
                    Description = "Get daily visit counts over a time period to identify peak tourist seasons and busy periods for a destination.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "regionId":   { "type": "integer", "description": "Optional region ID (use regionName if unknown)." },
                            "regionName": { "type": "string",  "description": "Region name or partial name. Resolved when regionId not provided." },
                            "fromDate":   { "type": "string",  "description": "Start of date range (ISO 8601). Defaults to 30 days ago." },
                            "toDate":     { "type": "string",  "description": "End of date range (ISO 8601). Defaults to now." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_get_external_click_stats",
                    Description = "Get statistics on how many times tourists clicked external booking/info links. Useful for understanding which locations drive the most booking interest. Results ordered by click count.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "regionId":   { "type": "integer", "description": "Optional region ID (use regionName if unknown)." },
                            "regionName": { "type": "string",  "description": "Region name or partial name. Resolved when regionId not provided." },
                            "postId":     { "type": "integer", "description": "Optional: filter by a specific location's ID." },
                            "postName":   { "type": "string",  "description": "Optional: filter by a specific location's name." },
                            "limit":      { "type": "integer", "description": "Maximum number of results (default 20)." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_get_direction_stats",
                    Description = "Get statistics on how many times tourists requested directions to specific locations. Useful for identifying which locations tourists most want to navigate to. Results ordered by request count.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "regionId":   { "type": "integer", "description": "Optional region ID (use regionName if unknown)." },
                            "regionName": { "type": "string",  "description": "Region name or partial name. Resolved when regionId not provided." },
                            "limit":      { "type": "integer", "description": "Maximum number of results (default 20)." }
                        }
                    }
                    """)
                },
                // ── Write alati (zahtijevaju prijavljenog turista) ──
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_save_location",
                    Description = "Save a location to the logged-in tourist's saved list. Requires authentication. Use when the user says 'save', 'bookmark', 'add to saved', 'sacuvaj' etc.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "postName": { "type": "string", "description": "Location name or partial name (e.g. 'Hotel Durmitor')." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_unsave_location",
                    Description = "Remove a location from the logged-in tourist's saved list. Requires authentication. Use when the user says 'unsave', 'remove from saved', 'ukloni iz sacuvanih'.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "postName": { "type": "string", "description": "Location name or partial name." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_like_location",
                    Description = "Like a location on behalf of the logged-in tourist. Requires authentication. Use when user says 'like', 'lajkuj', 'oznaci kao omiljeno'.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "postName": { "type": "string", "description": "Location name or partial name." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_unlike_location",
                    Description = "Remove a like from a location. Requires authentication.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "postName": { "type": "string", "description": "Location name or partial name." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_add_to_planner",
                    Description = "Add a location to the logged-in tourist's travel planner/calendar. Requires authentication. Use when user says 'add to planner', 'dodaj u planer', 'planiram posjetiti'.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "postName": { "type": "string", "description": "Location name or partial name (e.g. 'Crno jezero')." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_remove_from_planner",
                    Description = "Remove a location from the logged-in tourist's travel planner. Requires authentication.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "postName": { "type": "string", "description": "Location name or partial name." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_submit_review",
                    Description = "Submit a review (rating + optional comment) for a location. Requires authentication. Rating must be 1-5. Use when user says 'leave review', 'rate', 'ocijeni', 'ostavi recenziju'.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "postName": { "type": "string",  "description": "Location name or partial name." },
                            "rating":   { "type": "integer", "description": "Rating from 1 (worst) to 5 (best)." },
                            "comment":  { "type": "string",  "description": "Optional written comment." }
                        },
                        "required": ["rating"]
                    }
                    """)
                }
            ]
        }
    ];

    private static JsonObject ParseSchema(string json) =>
        JsonNode.Parse(json)?.AsObject()
        ?? throw new InvalidOperationException("Neispravna JSON schema za Gemini alat.");

    // ── System prompt ─────────────────────────────────────────────────────────

    private static GeminiSystemInstruction BuildSystemInstruction(string? preferredLanguage)
    {
        var languageInstruction = string.IsNullOrWhiteSpace(preferredLanguage)
            ? ""
            : $"\n\nUSER INTERFACE LANGUAGE: {preferredLanguage.Trim().ToLowerInvariant()}. Prefer this language for the reply unless the user explicitly asks for another language. If the logged-in profile tool returns a different Language field, the profile language wins.";

        return new GeminiSystemInstruction
        {
            Parts = [new GeminiPart { Text = BuildSystemPrompt() + languageInstruction }]
        };
    }

    private static string BuildSystemPrompt() => """
        You are a friendly and knowledgeable tourism assistant for the Globecode regional tourist guide application.
        You have access to a comprehensive database of tourist regions, locations (accommodation, restaurants,
        attractions, monuments, cultural sites, clubs, sports facilities, events, shops), hiking/tourist routes,
        visitor reviews, activity tags, engagement analytics, and more.

        CRITICAL RULES:
        - ALWAYS use the provided tools to fetch real data — NEVER invent facts, names, ratings, or descriptions.
        - Call tools first, then formulate your answer based on what the tools return.
        - If a tool returns no results, honestly say so and suggest broadening the search.
        - Prefer the logged-in tourist profile language when available.
        - If no profile language is available, use the USER INTERFACE LANGUAGE appended to this instruction.
        - If neither is available, respond in the same language the user writes in.
        - Support pagination: if HasMore is true in the response, offer to show more results by calling the same tool with offset incremented by limit. Always mention to the user when more results are available.
        - Be concise but informative — highlight the most important details.
        - When listing multiple results, use a structured format (numbered list or table).

        NAME-BASED LOOKUP — ALWAYS prefer this:
        All tools that accept regionId, postId, or routeId ALSO accept regionName, postName, or routeName.
        NEVER ask the user for a numeric ID. Pass names directly — the system resolves IDs automatically.
        Examples:
          - tourism_get_post_detail(postName='Hotel Durmitor')
          - tourism_get_region_summary(regionName='Zabljak')
          - tourism_search_routes(regionName='Durmitor', difficulties=['easy'])
          - tourism_get_reviews(postName='Restoran Jezero')
          - tourism_get_recommendations(regionName='Zabljak')

        RECOMMENDED WORKFLOWS:
        - "What is in region X?" → tourism_get_region_summary(regionName='X')
        - "What can I visit in X?" / "Sta mogu da posetim u X?" →
          tourism_search_posts(regionName='X', postTypes=['attraction','monument','cultural_site'], sortBy='rating', limit=8)
          and, when relevant, tourism_search_routes(regionName='X', sortBy='popular', limit=5)
        - "Find hotels/restaurants in X" → tourism_search_posts(regionName='X', postTypes=['accommodation'])
        - "Tell me about location Y" → tourism_get_post_detail(postName='Y')
        - "Reviews for Y" → tourism_get_reviews(postName='Y') or tourism_get_route_reviews(routeName='Y'). If returns empty (0 reviews), try tourism_search_posts to find the exact name first, then retry reviews with the exact title found.
        - "Best/most popular" → tourism_get_top_content(sortBy='views') — includes both locations AND routes
        - "Popular routes" → tourism_search_routes(sortBy='popular', regionName='X')
        - "Easy hikes" → tourism_search_routes(difficulties=['easy'], maxElevationGain=300)
        - "What's nearby?" → tourism_get_nearby(latitude, longitude, radiusKm)
        - "Similar to Y" → tourism_get_similar_posts(postName='Y')
        - "New content in X" → tourism_get_new_content(regionName='X', daysBack=30)
        - "Events in X" → tourism_search_events(regionName='X', category='CONCERT')
        - "Activities in X" / "Sta ima u X" → tourism_search_activities(regionName='X') then tourism_search_posts(regionName='X', tags=[activity_names_from_result], limit=6) to find concrete locations offering those activities. Show locations as cards, list activity descriptions in text.
        - "Activities for groups" → tourism_search_activities(minCapacity=10) then tourism_search_posts(tags=[result_names])
        - "Peak season?" → tourism_get_visit_trends(regionName='X')
        - "Most-booked locations?" → tourism_get_external_click_stats(regionName='X')
        - "Where do tourists navigate to?" → tourism_get_direction_stats(regionName='X')
        - "Hotel with pool" → tourism_search_tags(category='amenity', query='pool') then tourism_search_posts(tags=[result])
        """;
}
