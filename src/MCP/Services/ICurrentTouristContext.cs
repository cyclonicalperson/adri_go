namespace Mcp.Services;

/// <summary>
/// Pruža identitet turiste koji je trenutno autentikovan u ovom MCP pozivu.
/// Čita tourist_id iz JWT tokena koji frontend šalje uz svaki zahtjev.
/// </summary>
internal interface ICurrentTouristContext
{
    /// <summary>
    /// ID turiste iz JWT tokena, ili null ako zahtjev nije autentikovan
    /// (anonimni korisnik / javni pristup).
    /// </summary>
    uint? TouristId { get; }

    /// <summary>
    /// True ako je zahtjev autentikovan sa validnim JWT tokenom.
    /// </summary>
    bool IsAuthenticated { get; }
}
