Na backendu delimo strukturu aplikacije na nekoliko osnovnih celina koje imaju jasno definisane odgovornosti.  
U našem projektu to su **Controllers**, **Models** i **Services**.

- **Services** – sloj zadužen za komunikaciju sa bazom podataka. U servisima se nalaze metode koje čitaju ili upisuju podatke u bazu.
    
- **Controllers** – sloj koji komunicira sa frontend aplikacijom. Kontroleri definišu **API endpointe** preko kojih frontend šalje zahteve backendu.
    
- **Models** – klase koje predstavljaju strukturu podataka sa kojima radimo. One definišu kako podaci izgledaju kada ih primamo ili šaljemo, a u slučaju rada sa bazom predstavljaju i strukturu tabela.
    

Struktura backend projekta izgleda ovako:

```
backend/
│
├── Controllers/
│   └── Primer1Controller.cs
│   └── Primer2Controller.cs
│
├── Models/
│   └── Primer1.cs
│   └── Primer2.cs
│
├── Services/
│   └── Primer1Service.cs
│   └── Primer2Service.cs
│
├── AppDbContext.cs
├── Program.cs
├── appsettings.json
└── backend.csproj
```

Za svaki tip podataka sa kojim radimo (u ovom primeru **Primer1** i **Primer2**) pravimo tri stvari:

1. **Model** – opis strukture podataka
    
2. **Service** – logiku rada sa bazom
    
3. **Controller** – API endpointe preko kojih frontend pristupa tim podacima
    

U našem projektu takvi tipovi podataka mogu biti npr. **Location**, **Category**, **Route**, itd. (što odgovara turističkim informacijama koje sistem prikazuje) .

---

# Model – definicija strukture podataka

Prvo što pravimo za svaki tip podataka je **model**.  
Model definiše **koje podatke taj objekat ima**.

Na primer, ako je **Primer1 = Covek**, model može izgledati ovako:

```
public class Covek
{
    public int Id { get; set; }

    public string Ime { get; set; }

    public string Prezime { get; set; }

    public DateTime DatumRodjenja { get; set; }
}
```

Ova klasa predstavlja **strukturu jednog čoveka**.

Kada backend primi ili pošalje podatke, koristi upravo ovu strukturu da zna:

- koja polja očekuje
    
- kako se ta polja zovu
    
- kog su tipa
    

Ako se model koristi za rad sa bazom podataka, onda on **odgovara jednoj tabeli u bazi**.

Važno je da se **nazivi polja u modelu poklapaju sa kolonama u tabeli**.

---

# Konekcija sa bazom

Kada definišemo modele za sve tabele koje nas interesuju, sledeći korak je **povezivanje aplikacije sa bazom podataka**.

Prvi korak je definisanje **connection stringa** u fajlu **appsettings.json**.

```
"ConnectionStrings": {

  "DefaultConnection": "server=localhost;database=Primer_baza;user=root;password="

}
```

Connection string sadrži informacije potrebne da aplikacija pronađe bazu:

- server na kome se baza nalazi
    
- ime baze
    
- korisničko ime
    
- lozinku
    

---

# AppDbContext – veza između aplikacije i baze

Nakon toga pravimo **AppDbContext.cs**.

Ova klasa nasleđuje klasu **DbContext** iz biblioteke **EntityFrameworkCore**.  
DbContext predstavlja objekat koji upravlja konekcijom sa bazom i omogućava da radimo sa tabelama kroz C# kod.

```
using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {

    }

    // povezivanje sa tabelama

    public DbSet<Primer1> Primeri1 { get; set; }

    public DbSet<Primer2> Primeri2 { get; set; }

}
```

**DbSet** predstavlja jednu tabelu u bazi.

Na primer:

```
DbSet<Covek> Ljudi
```

znači da u bazi postoji tabela **Ljudi** koja sadrži objekte tipa **Covek**.

Entity Framework zatim omogućava da radimo sa bazom koristeći **LINQ upite**, bez direktnog pisanja SQL koda.

---

# Service – logika rada sa bazom

Sledeći sloj je **Service**.

Servis sadrži metode koje:

- čitaju podatke iz baze
    
- dodaju nove podatke
    
- menjaju postojeće podatke
    
- brišu podatke
    

Primer servisa:

```
public class CovekService
{

    private readonly AppDbContext _context;

    public CovekService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Covek>> dajSvakogCoveka()
    {
        return await _context.Covek.ToListAsync();
    }

    public async Task<List<Covek>> dajNajStarijegCoveka()
    {

        return await _context.Covek
            .OrderBy(l => l.DatumRodjenja)
            .Take(1)
            .ToListAsync();

    }

}
```

Ovde je važna promenljiva **_context**.

Ona predstavlja **vezu sa bazom** i omogućava servisu da izvršava upite.

Upiti se pišu pomoću **LINQ-a**, a Entity Framework ih u pozadini prevodi u SQL upite koje baza razume.

---

# Controller – API sloj

Kontroleri omogućavaju da frontend komunicira sa backendom preko **HTTP zahteva**.

```
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class CovekController : ControllerBase
{

    private readonly CovekService _service;

    public CovekController(CovekService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> DajSve()
    {
        return Ok(await _service.dajSvakogCoveka());
    }


    [HttpGet("najStariji")]
    public async Task<IActionResult> DajNajStarijeg()
    {

        return Ok(await _service.dajNajStarijegCoveka());

    }

}
```

Ruta kontrolera je:

```
api/covek
```

Primeri poziva:

```
GET /api/covek
```

vraća sve ljude.

```
GET /api/covek/najStariji
```

vraća najstarijeg čoveka.

Kontroler **ne komunicira direktno sa bazom**, već koristi servis koji to radi.

---

# Program.cs – pokretanje aplikacije

**Program.cs** je početna tačka backend aplikacije.  
U njemu se definišu:

- konfiguracija aplikacije
    
- registracija servisa
    
- podešavanje middleware-a
    
- pokretanje web servera
    

Kod:

```
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
```

Ovde se kreira **builder objekat** koji služi za konfiguraciju aplikacije pre pokretanja.

---

## Povezivanje baze sa aplikacijom

```
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))
    ));
```

Ovde registrujemo **AppDbContext** i povezujemo ga sa MySQL bazom.

Framework sada zna:

- gde je baza
    
- kako da napravi konekciju
    
- kako da koristi modele kao tabele
    

---

## Registracija kontrolera

```
builder.Services.AddControllers();
```

Ovim govorimo aplikaciji da koristi **ASP.NET kontrolere** kao API endpointe.

Bez ove linije backend ne bi znao gde su definisani API endpointi.

---

## CORS konfiguracija

Frontend i backend često rade na različitim portovima.

Na primer:

```
Angular → localhost:4200
Backend → localhost:5285
```

Zbog bezbednosnih pravila browser blokira takve zahteve, pa moramo omogućiti **CORS**.

```
var allowedOrigins = "AllowFrontends";

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: allowedOrigins,
        policy =>
        {
            policy.WithOrigins("http://localhost:4200")
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
});
```

Ovo znači da backend prihvata zahteve samo sa eksplicitno navedenih frontend origin-a.

---

## Registracija servisa

```
builder.Services.AddScoped<Primer1Service>();
builder.Services.AddScoped<Primer2Service>();
```

Ovde registrujemo **servise u dependency injection sistemu**.

To znači da kada kontroler traži servis:

```
public CovekController(CovekService service)
```

framework automatski pravi instancu tog servisa.

Bez ove registracije kontroler ne bi mogao da dobije servis.

---

## OpenAPI (Swagger)

```
builder.Services.AddOpenApi();
```

Ovo omogućava generisanje **API dokumentacije** i testiranje endpointa.

U development modu API se može testirati direktno iz browsera.

---

# Pokretanje aplikacije

```
var app = builder.Build();
```

Ovim se završava konfiguracija i pravi se objekat aplikacije.

---

## Development konfiguracija

```
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
```

Ako je aplikacija pokrenuta u development režimu, uključuje se OpenAPI dokumentacija.

---

## Middleware konfiguracija

```
app.UseCors("AllowAll");
```

Aktivira CORS pravilo koje smo definisali.

---

```
app.MapControllers();
```

Registruje sve kontrolere kao API rute.

---

```
app.UseHttpsRedirection();
```

Preusmerava HTTP zahteve na HTTPS.

---

## Pokretanje servera

```
app.Run();
```

