namespace ReceptiAplikacija.Modeli;

public class Recept
{
    public int Id { get; set; }
    public string Naziv { get; set; } = string.Empty;
    public string Opis { get; set; } = string.Empty;
    public string Sastojci { get; set; } = string.Empty;
    public string Koraci { get; set; } = string.Empty;
    public DateTime Kreirano { get; set; } = DateTime.UtcNow;
}