namespace TouristGuide.Api.Controllers;

/// <summary>
/// Aktivnosti su redovi u <c>tag</c> tabeli. Tip se čuva kao <c>aktivnost:KATEGORIJA</c>
/// (npr. aktivnost:SPORT). Nasleđeni redovi imaju samo <c>aktivnost</c> (= OTHER u UI).
/// </summary>
internal static class ActivityTagHelper
{
    private const string Prefix = "aktivnost:";

    public static bool IsActivityTag(string? category)
    {
        if (string.IsNullOrWhiteSpace(category)) return false;
        var c = category.Trim();
        return c.Equals("aktivnost", StringComparison.OrdinalIgnoreCase)
            || c.StartsWith(Prefix, StringComparison.OrdinalIgnoreCase)
            || c.StartsWith("aktivnost|", StringComparison.OrdinalIgnoreCase);
    }

    public static string GetActivitySubtype(string? category)
    {
        if (string.IsNullOrWhiteSpace(category)) return "OTHER";
        var c = category.Trim();
        if (c.Equals("aktivnost", StringComparison.OrdinalIgnoreCase)) return "OTHER";
        if (c.StartsWith(Prefix, StringComparison.OrdinalIgnoreCase))
            return c[Prefix.Length..].Trim().ToUpperInvariant();
        if (c.StartsWith("aktivnost|", StringComparison.OrdinalIgnoreCase))
            return c["aktivnost|".Length..].Trim().ToUpperInvariant();
        return "OTHER";
    }

    public static string FormatActivityCategory(string? subtype)
    {
        var s = string.IsNullOrWhiteSpace(subtype) ? "OTHER" : subtype.Trim().ToUpperInvariant();
        return Prefix + s;
    }
}
