using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Mcp.Services;

/// <summary>
/// Izvršava write akcije turiste pozivanjem Backend API-ja.
/// JWT token se prosljeđuje kao Bearer header — MCP ne čuva ni ne generiše tokene.
/// </summary>
internal sealed class TourismWriteService : ITourismWriteService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ICurrentTouristContext _currentTourist;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TourismWriteService> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public TourismWriteService(
        IHttpClientFactory httpClientFactory,
        ICurrentTouristContext currentTourist,
        IConfiguration configuration,
        ILogger<TourismWriteService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _currentTourist = currentTourist;
        _configuration = configuration;
        _logger = logger;
    }

    // ── Recenzije ─────────────────────────────────────────────────────────────

    public async Task<WriteResult> SubmitReviewAsync(uint postId, int rating, string? comment, CancellationToken ct)
    {
        if (!_currentTourist.IsAuthenticated)
            return Fail("Morate biti prijavljeni da biste ostavili recenziju.");

        if (rating < 1 || rating > 5)
            return Fail("Ocjena mora biti između 1 i 5.");

        var body = JsonSerializer.Serialize(new { rating, comment });
        var response = await SendAsync(HttpMethod.Post, $"api/posts/{postId}/reviews", body, ct);

        if (response.IsSuccessStatusCode)
        {
            _logger.LogInformation("tourism_submit_review: postId={PostId} rating={Rating}", postId, rating);
            return Ok("Recenzija je uspješno poslata i čeka na odobrenje.");
        }

        return await MapErrorAsync(response, "Recenzija ne može biti poslata");
    }

    // ── Sačuvane lokacije ─────────────────────────────────────────────────────

    public async Task<WriteResult> SavePostAsync(uint postId, CancellationToken ct)
    {
        if (!_currentTourist.IsAuthenticated)
            return Fail("Morate biti prijavljeni da biste sačuvali lokaciju.");

        var response = await SendAsync(HttpMethod.Post, $"api/posts/{postId}/save", null, ct);

        if (response.IsSuccessStatusCode)
        {
            _logger.LogInformation("tourism_save_post: postId={PostId}", postId);
            return Ok("Lokacija je dodata u sačuvane.");
        }

        return await MapErrorAsync(response, "Lokacija ne može biti sačuvana");
    }

    public async Task<WriteResult> UnsavePostAsync(uint postId, CancellationToken ct)
    {
        if (!_currentTourist.IsAuthenticated)
            return Fail("Morate biti prijavljeni.");

        var response = await SendAsync(HttpMethod.Delete, $"api/posts/{postId}/save", null, ct);

        if (response.IsSuccessStatusCode)
        {
            _logger.LogInformation("tourism_unsave_post: postId={PostId}", postId);
            return Ok("Lokacija je uklonjena iz sačuvanih.");
        }

        return await MapErrorAsync(response, "Lokacija ne može biti uklonjena");
    }

    // ── Lajkovi ───────────────────────────────────────────────────────────────

    public async Task<WriteResult> LikePostAsync(uint postId, CancellationToken ct)
    {
        if (!_currentTourist.IsAuthenticated)
            return Fail("Morate biti prijavljeni da biste lajkovali lokaciju.");

        var response = await SendAsync(HttpMethod.Post, $"api/posts/{postId}/like", null, ct);

        if (response.IsSuccessStatusCode)
        {
            _logger.LogInformation("tourism_like_post: postId={PostId}", postId);
            return Ok("Lokacija je lajkovana.");
        }

        return await MapErrorAsync(response, "Lajk ne može biti dodat");
    }

    public async Task<WriteResult> UnlikePostAsync(uint postId, CancellationToken ct)
    {
        if (!_currentTourist.IsAuthenticated)
            return Fail("Morate biti prijavljeni.");

        var response = await SendAsync(HttpMethod.Delete, $"api/posts/{postId}/like", null, ct);

        if (response.IsSuccessStatusCode)
        {
            _logger.LogInformation("tourism_unlike_post: postId={PostId}", postId);
            return Ok("Lajk je uklonjen.");
        }

        return await MapErrorAsync(response, "Lajk ne može biti uklonjen");
    }

    // ── Planer putovanja ──────────────────────────────────────────────────────

    public async Task<WriteResult> AddToCalendarAsync(uint postId, CancellationToken ct)
    {
        if (!_currentTourist.IsAuthenticated)
            return Fail("Morate biti prijavljeni da biste koristili planer putovanja.");

        var response = await SendAsync(HttpMethod.Post, $"api/tourist-auth/calendar/{postId}", null, ct);

        if (response.IsSuccessStatusCode)
        {
            var json = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            var alreadyAdded = doc.RootElement.TryGetProperty("alreadyAdded", out var prop) && prop.GetBoolean();

            _logger.LogInformation("tourism_add_to_calendar: postId={PostId} alreadyAdded={AlreadyAdded}", postId, alreadyAdded);
            return Ok(alreadyAdded ? "Lokacija je već u vašem planeru." : "Lokacija je dodana u vaš planer putovanja.");
        }

        return await MapErrorAsync(response, "Lokacija ne može biti dodana u planer");
    }

    public async Task<WriteResult> RemoveFromCalendarAsync(uint postId, CancellationToken ct)
    {
        if (!_currentTourist.IsAuthenticated)
            return Fail("Morate biti prijavljeni.");

        var response = await SendAsync(HttpMethod.Delete, $"api/tourist-auth/calendar/{postId}", null, ct);

        if (response.IsSuccessStatusCode)
        {
            _logger.LogInformation("tourism_remove_from_calendar: postId={PostId}", postId);
            return Ok("Lokacija je uklonjena iz planera putovanja.");
        }

        return await MapErrorAsync(response, "Lokacija ne može biti uklonjena iz planera");
    }

    // ── HTTP helper ───────────────────────────────────────────────────────────

    private async Task<HttpResponseMessage> SendAsync(
        HttpMethod method, string relativeUrl, string? jsonBody, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("BackendApi");

        // Prosljeđujemo JWT token turiste koji je već verificiran od strane JwtMiddleware-a
        if (_currentTourist.BearerToken is not null)
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _currentTourist.BearerToken);

        var request = new HttpRequestMessage(method, relativeUrl);

        if (jsonBody is not null)
            request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

        try
        {
            return await client.SendAsync(request, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "HTTP request failed: {Method} {Url}", method, relativeUrl);
            throw new InvalidOperationException(
                $"Veza sa Backend API-jem nije uspjela. Pokušajte ponovo.", ex);
        }
    }

    private static async Task<WriteResult> MapErrorAsync(HttpResponseMessage response, string context)
    {
        var body = await response.Content.ReadAsStringAsync();

        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("message", out var msg))
                return Fail($"{context}: {msg.GetString()}");
        }
        catch { /* ignore parse errors */ }

        return Fail($"{context}. Status: {(int)response.StatusCode}.");
    }

    private static WriteResult Ok(string message, object? data = null) =>
        new(true, message, data);

    private static WriteResult Fail(string message) =>
        new(false, message);
}