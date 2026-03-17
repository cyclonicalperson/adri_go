using Microsoft.EntityFrameworkCore;
using ReceptiAplikacija.Modeli;

namespace ReceptiAplikacija.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // Mapira na tabelu "recepti" u bazi
    public DbSet<Recept> Recepti { get; set; }
}