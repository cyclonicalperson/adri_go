using Mcp.Dtos;
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
    [property: JsonPropertyName("history")] IReadOnlyList<ChatMessage>? History = null);

public sealed record ChatResponse(
    [property: JsonPropertyName("reply")]     string Reply,
    [property: JsonPropertyName("toolsUsed")] IReadOnlyList<string> ToolsUsed);

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
    private readonly IConfiguration          _configuration;
    private readonly ILogger<GeminiChatService> _logger;

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

    // FIX #3: System prompt je konstanta — ne treba ga graditi svaki request.
    private static readonly GeminiSystemInstruction CachedSystemInstruction = new()
    {
        Parts = [new GeminiPart { Text = BuildSystemPrompt() }]
    };

    // Maksimalan broj agentic petlji radi zaštite od beskonačnih petlji
    private const int MaxToolRounds = 8;
    private const string UserFriendlyOverloadMessage =
        "Sistem je trenutno preopterećen velikim brojem zahteva. Molimo Vas pokušajte ponovo za minut.";

    public GeminiChatService(
        IHttpClientFactory      httpClientFactory,
        ITourismQueryService    tourismQueryService,
        IConfiguration          configuration,
        ILogger<GeminiChatService> logger)
    {
        _httpClientFactory   = httpClientFactory;
        _tourismQueryService = tourismQueryService;
        _configuration       = configuration;
        _logger              = logger;
        // FIX #4: ICurrentTouristContext uklonjen iz konstruktora — nije korišćen
        // u Gemini orkestratoru (JWT personalizacija ide kroz query service, ne ovde).
    }

    public async Task<ChatResponse> ChatAsync(ChatRequest request, CancellationToken ct)
    {
        var apiKey = _configuration["Gemini:ApiKey"]
            ?? throw new InvalidOperationException("Gemini:ApiKey nije postavljen u appsettings.json");

        // FIX #5: Validacija da ključ nije placeholder vrednost
        if (apiKey.Equals("YOUR_GEMINI_API_KEY_HERE", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException(
                "Gemini:ApiKey nije podešen. Unesite pravi API ključ u appsettings.json ili environment varijablu.");

        var model         = _configuration["Gemini:Model"] ?? "gemini-2.5-flash-lite";
        var fallbackModel = _configuration["Gemini:FallbackModel"] ?? "gemini-2.5-flash-lite";
        var maxTokens     = _configuration.GetValue<int>   ("Gemini:MaxOutputTokens", 2048);
        var temp          = _configuration.GetValue<double>("Gemini:Temperature",     0.7);
        var client        = _httpClientFactory.CreateClient("GeminiApi");

        try
        {
            return await ChatWithModelAsync(request, client, apiKey, model, maxTokens, temp, ct);
        }
        catch (GeminiApiException ex) when (
            (ex.StatusCode == StatusCodes.Status429TooManyRequests || ex.StatusCode == StatusCodes.Status503ServiceUnavailable) &&
            !NormalizeGeminiModelName(model).Equals(NormalizeGeminiModelName(fallbackModel), StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning(
                ex,
                "Gemini model {Model} je dostigao kvotu. Pokusavam fallback model {FallbackModel}",
                model,
                fallbackModel);

            try
            {
                return await ChatWithModelAsync(request, client, apiKey, fallbackModel, maxTokens, temp, ct);
            }
            catch (Exception fallbackEx) when (fallbackEx is GeminiApiException or InvalidOperationException)
            {
                _logger.LogError(
                    fallbackEx,
                    "Gemini fallback model {FallbackModel} nije uspeo",
                    fallbackModel);

                throw new GeminiApiException(
                    StatusCodes.Status429TooManyRequests,
                    UserFriendlyOverloadMessage);
            }
        }
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

        var contents  = BuildContents(request);
        var toolsUsed = new List<string>();

        // Agentic petlja: Gemini može pozvati više alata pre finalnog odgovora
        for (int round = 0; round < MaxToolRounds; round++)
        {
            var geminiRequest = new GeminiGenerateRequest
            {
                Contents          = contents,
                Tools             = CachedTools.Value,
                SystemInstruction = CachedSystemInstruction,
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

                if (apiMessage is not null)
                    throw new GeminiApiException(
                        StatusCodes.Status503ServiceUnavailable,
                        $"Gemini API je vratio gresku {(int)httpResponse.StatusCode}: {apiMessage}");

                throw new GeminiApiException(
                    StatusCodes.Status503ServiceUnavailable,
                    $"Gemini API je vratio grešku {(int)httpResponse.StatusCode}. Proverite API ključ i model.");
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

                return new ChatResponse(replyText, toolsUsed.AsReadOnly());
            }

            // FIX #6: Svi function response-ovi za jednu rundu idu zajedno
            // u JEDAN "user" turn (Gemini zahteva da model+tool exchange budu upareni).
            var functionResponseParts = new List<GeminiPart>(functionCalls.Count);

            foreach (var call in functionCalls)
            {
                toolsUsed.Add(call.Name);
                _logger.LogInformation(
                    "Runda {Round}: Gemini poziva alat [{Tool}] sa args: {Args}",
                    round + 1, call.Name, call.Args?.ToJsonString() ?? "{}");

                var result = await ExecuteToolAsync(call.Name, call.Args, ct);

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
            toolsUsed.AsReadOnly());
    }

    // ── Dispatcher: ime alata → servis ───────────────────────────────────────

    private async Task<JsonObject> ExecuteToolAsync(string toolName, JsonObject? args, CancellationToken ct)
    {
        try
        {
            object? result = toolName switch
            {
                "tourism_search_regions"    => await ExecuteSearchRegionsAsync(args, ct),
                "tourism_get_region_summary"=> await ExecuteGetRegionSummaryAsync(args, ct),
                "tourism_search_posts"      => await ExecuteSearchPostsAsync(args, ct),
                "tourism_get_post_detail"   => await ExecuteGetPostDetailAsync(args, ct),
                "tourism_search_routes"     => await ExecuteSearchRoutesAsync(args, ct),
                "tourism_get_route_detail"  => await ExecuteGetRouteDetailAsync(args, ct),
                "tourism_get_reviews"       => await ExecuteGetReviewsAsync(args, ct),
                "tourism_search_tags"       => await ExecuteSearchTagsAsync(args, ct),
                "tourism_get_nearby"        => await ExecuteGetNearbyAsync(args, ct),
                "tourism_get_similar_posts" => await ExecuteGetSimilarPostsAsync(args, ct),
                "tourism_get_top_content"   => await ExecuteGetTopContentAsync(args, ct),
                "tourism_search_events"     => await ExecuteSearchEventsAsync(args, ct),
                "tourism_get_recommendations"=> await ExecuteGetRecommendationsAsync(args, ct),
                "tourism_get_new_content"   => await ExecuteGetNewContentAsync(args, ct),
                "tourism_search_activities" => await ExecuteSearchActivitiesAsync(args, ct),
                "tourism_get_visit_trends"  => await ExecuteGetVisitTrendsAsync(args, ct),
                _ => (object)new { error = $"Nepoznat alat: {toolName}" }
            };

            var json = JsonSerializer.Serialize(result, JsonOpts);
            return JsonNode.Parse(json)?.AsObject() ?? new JsonObject();
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

    private Task<PagedResult<RegionSummary>> ExecuteSearchRegionsAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.SearchRegionsAsync(new SearchRegionsRequest(
            Query:          GetString(args, "query"),
            Type:           GetString(args, "type"),
            Country:        GetString(args, "country"),
            HasCoordinates: GetBool  (args, "hasCoordinates"),
            Limit:          GetInt   (args, "limit")  ?? 10,
            Offset:         GetInt   (args, "offset") ?? 0), ct);

    private Task<RegionFullSummary?> ExecuteGetRegionSummaryAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.GetRegionSummaryAsync(
            new GetRegionSummaryRequest(GetUint(args, "regionId") ?? 0), ct);

    private Task<PagedResult<PostSummary>> ExecuteSearchPostsAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.SearchPostsAsync(new SearchPostsRequest(
            RegionId:       GetUint      (args, "regionId"),
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

    private Task<PostDetail?> ExecuteGetPostDetailAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.GetPostDetailAsync(
            new PostDetailRequest(GetUint(args, "postId") ?? 0), ct);

    private Task<PagedResult<RouteSummary>> ExecuteSearchRoutesAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.SearchRoutesAsync(new SearchRoutesRequest(
            RegionId:           GetUint      (args, "regionId"),
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

    private Task<RouteDetail?> ExecuteGetRouteDetailAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.GetRouteDetailAsync(
            new RouteDetailRequest(GetUint(args, "routeId") ?? 0), ct);

    private Task<PagedResult<ReviewSummary>> ExecuteGetReviewsAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.GetReviewsAsync(new GetReviewsRequest(
            PostId:       GetUint  (args, "postId") ?? 0,
            OnlyApproved: GetBool  (args, "onlyApproved") ?? true,
            MinRating:    GetInt   (args, "minRating"),
            MaxRating:    GetInt   (args, "maxRating"),
            SortBy:       GetString(args, "sortBy"),
            Limit:        GetInt   (args, "limit")  ?? 20,
            Offset:       GetInt   (args, "offset") ?? 0), ct);

    private Task<IReadOnlyList<TagSummary>> ExecuteSearchTagsAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.SearchTagsAsync(new SearchTagsRequest(
            Query:       GetString(args, "query"),
            Category:    GetString(args, "category"),
            Difficulty:  GetString(args, "difficulty"),
            HasCapacity: GetBool  (args, "hasCapacity"),
            Limit:       GetInt   (args, "limit") ?? 50), ct);

    private Task<IReadOnlyList<PostSummary>> ExecuteGetNearbyAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.GetNearbyAsync(new GetNearbyRequest(
            Latitude:  GetDouble    (args, "latitude")  ?? 0,
            Longitude: GetDouble    (args, "longitude") ?? 0,
            RadiusKm:  GetDouble    (args, "radiusKm")  ?? 5.0,
            PostTypes: GetStringList(args, "postTypes"),
            MinRating: GetDouble    (args, "minRating"),
            Limit:     GetInt       (args, "limit") ?? 10), ct);

    private Task<IReadOnlyList<PostSummary>> ExecuteGetSimilarPostsAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.GetSimilarPostsAsync(new GetSimilarPostsRequest(
            PostId: GetUint(args, "postId") ?? 0,
            Limit:  GetInt (args, "limit")  ?? 5), ct);

    private Task<IReadOnlyList<PostAnalyticsSummary>> ExecuteGetTopContentAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.GetTopContentAsync(new GetTopContentRequest(
            SortBy:   GetString(args, "sortBy")   ?? "views",
            PostType: GetString(args, "postType"),
            RegionId: GetUint  (args, "regionId"),
            Limit:    GetInt   (args, "limit") ?? 10), ct);

    private Task<PagedResult<EventSummary>> ExecuteSearchEventsAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.SearchEventsAsync(new SearchEventsRequest(
            RegionId:     GetUint    (args, "regionId"),
            Query:        GetString  (args, "query"),
            StartFrom:    GetDateTime(args, "startFrom"),
            StartTo:      GetDateTime(args, "startTo"),
            Category:     GetString  (args, "category"),
            HasTicketUrl: GetBool    (args, "hasTicketUrl"),
            SortBy:       GetString  (args, "sortBy"),
            Limit:        GetInt     (args, "limit")  ?? 10,
            Offset:       GetInt     (args, "offset") ?? 0), ct);

    private Task<IReadOnlyList<RecommendationItem>> ExecuteGetRecommendationsAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.GetRecommendationsAsync(new GetRecommendationsRequest(
            RegionId:    GetUint  (args, "regionId")    ?? 0,
            TouristId:   GetUint  (args, "touristId"),
            ContextMode: GetString(args, "contextMode") ?? "onsite",
            Limit:       Math.Clamp(GetInt(args, "limit") ?? 10, 1, 20)), ct);

    private Task<IReadOnlyList<NewContentItem>> ExecuteGetNewContentAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.GetNewContentAsync(new GetNewContentRequest(
            RegionId: GetUint(args, "regionId"),
            DaysBack: GetInt (args, "daysBack") ?? 30,
            Limit:    GetInt (args, "limit")    ?? 20), ct);

    private Task<IReadOnlyList<TagSummary>> ExecuteSearchActivitiesAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.SearchActivitiesAsync(new SearchActivitiesRequest(
            Query:       GetString(args, "query"),
            Category:    GetString(args, "category"),
            Difficulty:  GetString(args, "difficulty"),
            MinCapacity: GetInt   (args, "minCapacity"),
            MaxCapacity: GetInt   (args, "maxCapacity"),
            Limit:       GetInt   (args, "limit") ?? 50), ct);

    private Task<IReadOnlyList<VisitTrendPoint>> ExecuteGetVisitTrendsAsync(JsonObject? args, CancellationToken ct) =>
        _tourismQueryService.GetVisitTrendsAsync(new GetVisitTrendsRequest(
            RegionId: GetUint    (args, "regionId"),
            FromDate: GetDateTime(args, "fromDate"),
            ToDate:   GetDateTime(args, "toDate")), ct);

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

    private static List<GeminiContent> BuildContents(ChatRequest request)
    {
        var contents = new List<GeminiContent>();

        if (request.History is { Count: > 0 })
        {
            foreach (var msg in request.History)
            {
                // FIX #9: Eksplicitno mapiranje rola — samo "user" i "model" su validni.
                // Sve ostale vrednosti (npr. "assistant", "system") se normalizuju u "user".
                var role = msg.Role.Equals("model", StringComparison.OrdinalIgnoreCase)
                    ? "model"
                    : "user";

                // Preskačemo prazne poruke iz istorije da ne bismo zbunili model
                if (string.IsNullOrWhiteSpace(msg.Text)) continue;

                contents.Add(new GeminiContent
                {
                    Role  = role,
                    Parts = [new GeminiPart { Text = msg.Text }]
                });
            }

            // FIX #10: Gemini zahteva da historija počinje sa "user" turn-om.
            // Ako historija počinje sa "model" (edge case), dodajemo prazan user turn ispred.
            if (contents.Count > 0 && contents[0].Role == "model")
            {
                contents.Insert(0, new GeminiContent
                {
                    Role  = "user",
                    Parts = [new GeminiPart { Text = "..." }]
                });
            }
        }

        // Trenutna korisnička poruka
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
                    Description = "Get a full overview of a specific region: total post count, route count, average rating, and breakdown of posts by type.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "regionId": { "type": "integer", "description": "The ID of the region to summarize." }
                        },
                        "required": ["regionId"]
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_search_posts",
                    Description = "Search published locations and points of interest. Post types: accommodation, restaurant, club, cultural_site, monument, sports_facility, event, attraction, shop, other. Sort options: rating (default), distance (requires coordinates), title, newest.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "regionId":       { "type": "integer", "description": "Optional region ID to scope the search." },
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
                    Description = "Get full details for a specific location by ID: description, opening hours, rating, view count, likes, review count, all tags, external booking URL, and image URLs.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "postId": { "type": "integer", "description": "The ID of the location to retrieve." }
                        },
                        "required": ["postId"]
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_search_routes",
                    Description = "Search published tourist routes (hiking, cycling, walking). Difficulty levels: easy, moderate, hard, expert.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "regionId":           { "type": "integer", "description": "Optional region ID." },
                            "query":              { "type": "string",  "description": "Optional free-text query matching route name or description." },
                            "difficulties":       { "type": "array", "items": { "type": "string" }, "description": "Optional difficulty list: easy, moderate, hard, expert." },
                            "maxDistanceKm":      { "type": "number",  "description": "Optional maximum route distance in kilometers." },
                            "minDistanceKm":      { "type": "number",  "description": "Optional minimum route distance in kilometers." },
                            "maxDurationMinutes": { "type": "integer", "description": "Optional maximum duration in minutes." },
                            "minDurationMinutes": { "type": "integer", "description": "Optional minimum duration in minutes." },
                            "maxElevationGain":   { "type": "integer", "description": "Optional maximum elevation gain in meters." },
                            "sortBy":             { "type": "string",  "description": "Sort order: distance_asc, distance_desc, duration_asc, duration_desc, elevation_asc, elevation_desc." },
                            "limit":              { "type": "integer", "description": "Maximum number of results (default 10)." },
                            "offset":             { "type": "integer", "description": "Number of results to skip for pagination (default 0)." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_get_route_detail",
                    Description = "Get full details for a specific route by ID: waypoints, GPX file path, view count, and save count.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "routeId": { "type": "integer", "description": "The ID of the route to retrieve." }
                        },
                        "required": ["routeId"]
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_get_reviews",
                    Description = "Get visitor reviews for a specific location by post ID.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "postId":       { "type": "integer", "description": "The ID of the location to get reviews for." },
                            "onlyApproved": { "type": "boolean", "description": "If true, returns only approved reviews (default true)." },
                            "minRating":    { "type": "integer", "description": "Optional minimum rating filter (1-5)." },
                            "maxRating":    { "type": "integer", "description": "Optional maximum rating filter (1-5)." },
                            "sortBy":       { "type": "string",  "description": "Sort order: rating_asc, rating_desc, or newest (default)." },
                            "limit":        { "type": "integer", "description": "Maximum number of results (default 20)." },
                            "offset":       { "type": "integer", "description": "Number of results to skip for pagination (default 0)." }
                        },
                        "required": ["postId"]
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
                            "limit":     { "type": "integer", "description": "Maximum number of results (default 10)." }
                        },
                        "required": ["latitude", "longitude"]
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_get_similar_posts",
                    Description = "Get locations similar to a given location, matched by shared tags, same type, and same region.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "postId": { "type": "integer", "description": "The ID of the reference location." },
                            "limit":  { "type": "integer", "description": "Maximum number of similar results (default 5)." }
                        },
                        "required": ["postId"]
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_get_top_content",
                    Description = "Get the most popular locations ranked by a specific metric. SortBy values: views, likes, shares, rating, review_count.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "sortBy":   { "type": "string",  "description": "Sort metric: views, likes, shares, rating, review_count." },
                            "postType": { "type": "string",  "description": "Optional post type filter: accommodation, restaurant, attraction, etc." },
                            "regionId": { "type": "integer", "description": "Optional region ID to narrow results." },
                            "limit":    { "type": "integer", "description": "Maximum number of results (default 10)." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_search_events",
                    Description = "Search published events (concerts, festivals, sports, theatre, tours). Categories: CONCERT, SPORT, THEATER, FESTIVAL, OTHER.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "regionId":     { "type": "integer", "description": "Optional region ID to scope the search." },
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
                    Description = "Get personalized content recommendations for a specific region. contextMode: onsite (default, for visitors already at the destination) or planning (for trip planning).",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
                            "regionId":    { "type": "integer", "description": "The ID of the region to get recommendations for." },
                            "touristId":   { "type": "integer", "description": "Optional tourist ID for personalized recommendations." },
                            "contextMode": { "type": "string",  "description": "Context mode: onsite (default) or planning." },
                            "limit":       { "type": "integer", "description": "Maximum number of results (default 10, max 20)." }
                        },
                        "required": ["regionId"]
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
                            "regionId": { "type": "integer", "description": "Optional region ID to filter by destination." },
                            "daysBack": { "type": "integer", "description": "How many days back to look for new content (default 30)." },
                            "limit":    { "type": "integer", "description": "Maximum number of results (default 20)." }
                        }
                    }
                    """)
                },
                new GeminiFunctionDeclaration
                {
                    Name        = "tourism_search_activities",
                    Description = "Search activities and things to do (tags with category=aktivnost). Categories: SPORT, ADVENTURE, WELLNESS, SHOPPING, DINING, NIGHTLIFE, SIGHTSEEING, CULTURE, OTHER.",
                    Parameters  = ParseSchema("""
                    {
                        "type": "object",
                        "properties": {
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
                            "regionId": { "type": "integer", "description": "Optional region ID to scope trends to a specific destination." },
                            "fromDate": { "type": "string",  "description": "Start of date range (ISO 8601). Defaults to 30 days ago." },
                            "toDate":   { "type": "string",  "description": "End of date range (ISO 8601). Defaults to now." }
                        }
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

    private static string BuildSystemPrompt() => """
        You are a friendly and knowledgeable tourism assistant for the Globecode regional tourist guide application.
        You have access to a comprehensive database of tourist regions, locations (accommodation, restaurants,
        attractions, monuments, cultural sites, clubs, sports facilities, events, shops), hiking/tourist routes,
        visitor reviews, activity tags, and more.

        CRITICAL RULES:
        - ALWAYS use the provided tools to fetch real data — NEVER invent facts, names, ratings, or descriptions.
        - Call tools first, then formulate your answer based on what the tools return.
        - If a tool returns no results, honestly say so and suggest broadening the search.
        - Respond in the SAME LANGUAGE the user writes in (auto-detect language).
        - For best/most popular places, use tourism_get_top_content.
        - For hiking or outdoor activities, use tourism_search_routes with appropriate filters.
        - For general exploration, start with tourism_search_regions then tourism_get_region_summary.
        - For "what's nearby", use tourism_get_nearby with the user's coordinates.
        - Support pagination: if HasMore is true, offer to show more results.
        - Be concise but informative — highlight the most important details.
        - When listing multiple results, use a structured format (numbered list or table).
        """;
}
