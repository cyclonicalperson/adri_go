using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Mcp.Services;

// ── DTO-vi koji mapiraju Backend odgovore ─────────────────────────────────────

internal sealed record TouristProfileResult(
    uint Id,
    string Name,
    string Language,
    string? Bio,
    string? Location,
    IReadOnlyList<string> Interests,
    int SavedPostsCount,
    int ReviewsCount,
    IReadOnlyList<PostTypePreference> TopPostTypes,
    IReadOnlyList<TagPreference> TopTags,
    IReadOnlyList<RegionPreference> TopRegions);

internal sealed record PostTypePreference(
    string PostType,
    int LikeCount,
    int SaveCount,
    int ViewCount,
    int Score);

internal sealed record TagPreference(
    uint TagId,
    string TagName,
    string TagCategory,
    int Score);

internal sealed record RegionPreference(
    uint RegionId,
    string RegionName,
    int Score);

// ── Interne klase za deserijalizaciju Backend JSON-a ─────────────────────────

internal sealed class BackendMeResponse
{
    [JsonPropertyName("id")] public uint Id { get; set; }
    [JsonPropertyName("name")] public string Name { get; set; } = string.Empty;
    [JsonPropertyName("language")] public string Language { get; set; } = "en";
    [JsonPropertyName("bio")] public string? Bio { get; set; }
    [JsonPropertyName("location")] public string? Location { get; set; }
    [JsonPropertyName("interests")] public List<string>? Interests { get; set; }
    [JsonPropertyName("savedPostsCount")] public int SavedPostsCount { get; set; }
    [JsonPropertyName("reviewsCount")] public int ReviewsCount { get; set; }
}

internal sealed class BackendPreferencesResponse
{
    [JsonPropertyName("success")] public bool Success { get; set; }
    [JsonPropertyName("data")] public PreferencesData? Data { get; set; }
}

internal sealed class PreferencesData
{
    [JsonPropertyName("postTypePreferences")] public List<RawPostTypePreference>? PostTypePreferences { get; set; }
    [JsonPropertyName("tagPreferences")] public List<RawTagPreference>? TagPreferences { get; set; }
    [JsonPropertyName("regionPreferences")] public List<RawRegionPreference>? RegionPreferences { get; set; }
}

internal sealed class RawPostTypePreference
{
    [JsonPropertyName("postType")] public string PostType { get; set; } = string.Empty;
    [JsonPropertyName("likeCount")] public int LikeCount { get; set; }
    [JsonPropertyName("saveCount")] public int SaveCount { get; set; }
    [JsonPropertyName("viewCount")] public int ViewCount { get; set; }
    [JsonPropertyName("score")] public int Score { get; set; }
}

internal sealed class RawTagPreference
{
    [JsonPropertyName("tagId")] public uint TagId { get; set; }
    [JsonPropertyName("tagName")] public string TagName { get; set; } = string.Empty;
    [JsonPropertyName("tagCategory")] public string TagCategory { get; set; } = string.Empty;
    [JsonPropertyName("score")] public int Score { get; set; }
}

internal sealed class RawRegionPreference
{
    [JsonPropertyName("regionId")] public uint RegionId { get; set; }
    [JsonPropertyName("regionName")] public string RegionName { get; set; } = string.Empty;
    [JsonPropertyName("score")] public int Score { get; set; }
}

// ── Interface ─────────────────────────────────────────────────────────────────

internal interface ITouristProfileService
{
    Task<TouristProfileResult?> GetMyProfileAsync(CancellationToken ct);
}

// ── Implementacija ────────────────────────────────────────────────────────────

internal sealed class TouristProfileService : ITouristProfileService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ICurrentTouristContext _currentTourist;
    private readonly ILogger<TouristProfileService> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public TouristProfileService(
        IHttpClientFactory httpClientFactory,
        ICurrentTouristContext currentTourist,
        ILogger<TouristProfileService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _currentTourist = currentTourist;
        _logger = logger;
    }

    public async Task<TouristProfileResult?> GetMyProfileAsync(CancellationToken ct)
    {
        if (!_currentTourist.IsAuthenticated || _currentTourist.BearerToken is null)
            return null;

        var client = _httpClientFactory.CreateClient("BackendApi");
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _currentTourist.BearerToken);

        // Paralelno dohvatamo profil i preferencije
        var meTask = FetchMeAsync(client, ct);
        var prefsTask = FetchPreferencesAsync(client, ct);

        await Task.WhenAll(meTask, prefsTask);

        var me = await meTask;
        if (me is null) return null;

        var prefs = await prefsTask;

        _logger.LogInformation(
            "tourism_get_my_profile: touristId={TouristId} language={Language} interests={Interests}",
            me.Id, me.Language, me.Interests?.Count ?? 0);

        return new TouristProfileResult(
            Id: me.Id,
            Name: me.Name,
            Language: me.Language,
            Bio: me.Bio,
            Location: me.Location,
            Interests: me.Interests?.AsReadOnly() ?? (IReadOnlyList<string>)Array.Empty<string>(),
            SavedPostsCount: me.SavedPostsCount,
            ReviewsCount: me.ReviewsCount,
            TopPostTypes: prefs?.Data?.PostTypePreferences?
                                .Where(p => p.Score > 0)
                                .OrderByDescending(p => p.Score)
                                .Take(5)
                                .Select(p => new PostTypePreference(
                                    p.PostType, p.LikeCount, p.SaveCount, p.ViewCount, p.Score))
                                .ToList() ?? [],
            TopTags: prefs?.Data?.TagPreferences?
                                .Where(t => t.Score > 0)
                                .Take(8)
                                .Select(t => new TagPreference(
                                    t.TagId, t.TagName, t.TagCategory, t.Score))
                                .ToList() ?? [],
            TopRegions: prefs?.Data?.RegionPreferences?
                                .Where(r => r.Score > 0)
                                .Take(5)
                                .Select(r => new RegionPreference(
                                    r.RegionId, r.RegionName, r.Score))
                                .ToList() ?? []);
    }

    private async Task<BackendMeResponse?> FetchMeAsync(HttpClient client, CancellationToken ct)
    {
        try
        {
            var response = await client.GetAsync("api/tourist-auth/me", ct);
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync(ct);
            return JsonSerializer.Deserialize<BackendMeResponse>(json, JsonOpts);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "FetchMeAsync failed");
            return null;
        }
    }

    private async Task<BackendPreferencesResponse?> FetchPreferencesAsync(HttpClient client, CancellationToken ct)
    {
        try
        {
            var response = await client.GetAsync("api/tourist-preferences/my", ct);
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync(ct);
            return JsonSerializer.Deserialize<BackendPreferencesResponse>(json, JsonOpts);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "FetchPreferencesAsync failed");
            return null;
        }
    }
}
