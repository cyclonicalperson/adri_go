using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TouristGuide.Api.Controllers
{
    [ApiController]
    [Route("api/chat")]
    public class ChatController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<ChatController> _logger;

        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };

        public ChatController(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<ChatController> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        [HttpPost]
        public async Task Chat([FromBody] ChatProxyRequest request, CancellationToken cancellationToken)
        {
            if (request.Messages is not { Count: > 0 })
            {
                Response.StatusCode = 400;
                await Response.WriteAsJsonAsync(new { message = "Messages su obavezni." }, cancellationToken);
                return;
            }

            var apiKey = _configuration["Anthropic:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                Response.StatusCode = 503;
                await Response.WriteAsJsonAsync(new { message = "AI chat nije konfigurisan na serveru." }, cancellationToken);
                return;
            }

            var mcpUrl = _configuration["Anthropic:McpUrl"];
            if (string.IsNullOrWhiteSpace(mcpUrl))
            {
                Response.StatusCode = 503;
                await Response.WriteAsJsonAsync(new { message = "MCP server URL nije konfigurisan." }, cancellationToken);
                return;
            }

            var mcpToken = request.McpToken;
            if (string.IsNullOrWhiteSpace(mcpToken))
            {
                var authHeader = Request.Headers.Authorization.FirstOrDefault();
                if (authHeader?.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) == true)
                    mcpToken = authHeader["Bearer ".Length..].Trim();
            }

            var anthropicRequest = new
            {
                model = "claude-sonnet-4-20250514",
                max_tokens = 1024,
                stream = true,
                system = _configuration["Anthropic:SystemPrompt"] ?? BuildDefaultSystemPrompt(),
                messages = request.Messages.Select(m => new { role = m.Role, content = m.Content }),
                mcp_servers = new[]
                {
                    new
                    {
                        type = "url",
                        url = mcpUrl,
                        name = "tourism-mcp",
                        authorization_token = string.IsNullOrWhiteSpace(mcpToken) ? null : mcpToken
                    }
                }
            };

            var client = _httpClientFactory.CreateClient("AnthropicApi");
            client.DefaultRequestHeaders.Clear();
            client.DefaultRequestHeaders.Add("x-api-key", apiKey);
            client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
            client.DefaultRequestHeaders.Add("anthropic-beta", "mcp-client-2025-04-04");

            var json = JsonSerializer.Serialize(anthropicRequest, JsonOpts);
            var httpContent = new StringContent(json, Encoding.UTF8, "application/json");

            _logger.LogInformation("chat/stream: messages={Count} mcpAuthenticated={Auth}",
                request.Messages.Count, !string.IsNullOrWhiteSpace(mcpToken));

            HttpResponseMessage anthropicResponse;
            try
            {
                anthropicResponse = await client.SendAsync(
                    new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages") { Content = httpContent },
                    HttpCompletionOption.ResponseHeadersRead,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "chat/stream: Anthropic API call failed");
                Response.StatusCode = 502;
                await Response.WriteAsJsonAsync(new { message = "AI servis nije dostupan. Pokusajte ponovo." }, cancellationToken);
                return;
            }

            if (!anthropicResponse.IsSuccessStatusCode)
            {
                var errBody = await anthropicResponse.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("chat/stream: Anthropic error {Status}: {Body}", (int)anthropicResponse.StatusCode, errBody);

                Response.StatusCode = anthropicResponse.StatusCode switch
                {
                    System.Net.HttpStatusCode.TooManyRequests => 429,
                    System.Net.HttpStatusCode.Unauthorized => 503,
                    _ => 502
                };
                var errMsg = anthropicResponse.StatusCode switch
                {
                    System.Net.HttpStatusCode.TooManyRequests => "Previse zahtjeva. Sacekajte trenutak.",
                    System.Net.HttpStatusCode.Unauthorized => "AI konfiguracija nije ispravna.",
                    _ => "Greska AI servisa."
                };
                await Response.WriteAsJsonAsync(new { message = errMsg }, cancellationToken);
                return;
            }

            Response.ContentType = "text/event-stream";
            Response.Headers.CacheControl = "no-cache";
            Response.Headers.Connection = "keep-alive";

            await using var anthropicStream = await anthropicResponse.Content.ReadAsStreamAsync(cancellationToken);
            using var reader = new System.IO.StreamReader(anthropicStream);

            while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
            {
                var line = await reader.ReadLineAsync(cancellationToken);
                if (string.IsNullOrEmpty(line)) continue;
                if (!line.StartsWith("data: ", StringComparison.Ordinal)) continue;

                var data = line["data: ".Length..];
                if (data == "[DONE]") break;

                JsonElement root;
                try { using var doc = JsonDocument.Parse(data); root = doc.RootElement.Clone(); }
                catch { continue; }

                if (!root.TryGetProperty("type", out var typeProp)) continue;
                var eventType = typeProp.GetString();

                if (eventType == "content_block_delta")
                {
                    if (root.TryGetProperty("delta", out var delta)
                        && delta.TryGetProperty("type", out var deltaType)
                        && deltaType.GetString() == "text_delta"
                        && delta.TryGetProperty("text", out var textProp))
                    {
                        var text = textProp.GetString() ?? "";
                        if (text.Length > 0)
                        {
                            var sseData = JsonSerializer.Serialize(new { type = "delta", text });
                            await Response.WriteAsync($"data: {sseData}\n\n", cancellationToken);
                            await Response.Body.FlushAsync(cancellationToken);
                        }
                    }
                }
                else if (eventType == "message_stop")
                {
                    await Response.WriteAsync("data: {\"type\":\"done\"}\n\n", cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);
                    break;
                }
                else if (eventType == "error")
                {
                    _logger.LogWarning("chat/stream: Anthropic stream error: {Data}", data);
                    var errText = root.TryGetProperty("error", out var errProp)
                        && errProp.TryGetProperty("message", out var errMsg2)
                        ? errMsg2.GetString() : "Stream greska";
                    var errSse = JsonSerializer.Serialize(new { type = "error", message = errText });
                    await Response.WriteAsync($"data: {errSse}\n\n", cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);
                    break;
                }
            }
        }

        private static string BuildDefaultSystemPrompt() => @"Ti si turisticki asistent za regionalnu aplikaciju TouristGuide.
Pomazes turistima da pronadju destinacije, lokacije, rute, aktivnosti i dogadjaje.
Sve podatke dobavljas iskljucivo kroz dostupne alate — nikad ne izmisljas lokacije, ocjene ili detalje.

Na pocetku razgovora pozovi tourism_get_my_profile da saznас jezik i interese turiste.
Ako profil vrati null, turist nije prijavljen — tretiraj ga anonimno i odgovaraj na engleskom.
Kad profil postoji, odgovaraj na jeziku turiste (Language field).

Kad turist trazi preporuku:
1. Koristi tourism_search_regions da pronadjes ID regije
2. Koristi tourism_search_posts, tourism_get_top_content ili tourism_get_recommendations za sadrzaj
3. Ponudi da dodas lokaciju u planer ili sacuvas je, ali tek ako turist to zeli

Budi koncizan, prijatan i oslanjaj se na podatke iz alata.";
    }

    public sealed class ChatProxyRequest
    {
        public IReadOnlyList<ChatProxyMessage>? Messages { get; set; }
        public string? McpToken { get; set; }
    }

    public sealed class ChatProxyMessage
    {
        public string Role { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }
}