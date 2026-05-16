using Mcp.Services;

namespace Mcp.Endpoints;

/// <summary>
/// REST endpoint za Gemini-powered turistički chat asistent.
/// Prima chat poruke od klijenta i vraća Gemini odgovore koji koriste
/// naše turističke alate (Function Calling) za dohvatanje podataka iz baze.
///
/// POST /api/chat
///   Body: { "message": "...", "history": [{"role":"user","text":"..."},{"role":"model","text":"..."}] }
///   Response: { "reply": "...", "toolsUsed": ["tourism_search_regions", ...] }
///
/// Endpoint je allowanonymous — JWT se automatski čita iz Authorization headera
/// ako je prisutan, ali nije obavezan (anonimni korisnici mogu da koriste chat).
/// </summary>
internal static class GeminiChatEndpoints
{
    public static IEndpointRouteBuilder MapGeminiChatEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints
            .MapPost("/api/chat", HandleChatAsync)
            .WithName("GeminiChat")
            .WithSummary("Send a message to the Gemini-powered tourism assistant")
            .AllowAnonymous();

        return endpoints;
    }

    private static async Task<IResult> HandleChatAsync(
        ChatRequest                      request,
        IGeminiChatService               chatService,
        ILoggerFactory                   loggerFactory,
        CancellationToken                cancellationToken)
    {
        var logger = loggerFactory.CreateLogger(nameof(GeminiChatEndpoints));

        if (string.IsNullOrWhiteSpace(request.Message))
            return Results.BadRequest(new { error = "Poruka ne može biti prazna." });

        if (request.Message.Length > 4000)
            return Results.BadRequest(new { error = "Poruka je predugačka (maksimum 4000 znakova)." });

        // FIX: Validacija historije — sprečavamo prevelike payload-e
        if (request.History is { Count: > 50 })
            return Results.BadRequest(new { error = "Istorija konverzacije je predugačka (maksimum 50 poruka)." });

        try
        {
            var response = await chatService.ChatAsync(request, cancellationToken);
            return Results.Ok(response);
        }
        catch (OperationCanceledException)
        {
            // Klijent je prekinuo vezu — ne logujemo kao grešku
            return Results.StatusCode(499); // Client Closed Request
        }
        catch (GeminiApiException ex)
        {
            logger.LogWarning(ex, "Gemini API zahtev nije uspeo");
            return Results.Problem(
                detail:     ex.Message,
                title:      "Gemini API zahtev nije uspeo",
                statusCode: ex.StatusCode);
        }
        catch (InvalidOperationException ex)
        {
            logger.LogError(ex, "Chat zahtev nije uspeo — konfiguracijska ili API greška");
            return Results.Problem(
                detail:     ex.Message,
                title:      "Chat servis nije dostupan",
                statusCode: 503);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Neočekivana greška u chat endpointu");
            return Results.Problem(
                detail:     "Interna greška servera.",
                title:      "Greška",
                statusCode: 500);
        }
    }
}
