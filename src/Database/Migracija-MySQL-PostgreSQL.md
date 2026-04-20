# Migracija sa MySQL na PostgreSQL

## Šta je urađeno

Projekat je migriran sa **MySQL** (Pomelo driver) na **PostgreSQL** (Npgsql driver). Uz migraciju baze, dodat je i sistem za automatsko kreiranje tabela i punjenje početnim podacima (seed), kao i podrška za upload i čuvanje slika uz objave.

### Promene u projektu

| Fajl | Šta je promenjeno |
|---|---|
| `TouristGuide.Api.csproj` | Zamenjen `Pomelo.EntityFrameworkCore.MySql` sa `Npgsql.EntityFrameworkCore.PostgreSQL`, dodat `BCrypt.Net-Next` |
| `appsettings.json` | MySQL connection string zamenjen PostgreSQL formatom, ispravljeni git conflict markeri |
| `Program.cs` | `UseMySql()` zamenjeno sa `UseNpgsql()`, registrovan i pozvan `DatabaseSeeder` pri pokretanju |
| `Services/DatabaseSeeder.cs` | Novi fajl — automatski kreira tabele i puni bazu podacima pri prvom pokretanju |
| `Controllers/ImageUploadController.cs` | Novi fajl — API za upload slika za objave, regije i profile |

---

## Korak po korak — potpuna migracija

### KORAK 1 — Instaliraj PostgreSQL 16

1. Idi na **https://www.postgresql.org/download/windows/**
2. Klikni **"Download the installer"**
3. Skini **PostgreSQL 16** → Windows x86-64

Tokom instalacije:

| Postavka | Vrednost |
|---|---|
| Components | Ostavi sve čekirano |
| Password | `admin` ← mora biti isto kao u `appsettings.json` |
| Port | `5432` ← ne menjaj |
| Stack Builder (na kraju) | Zatvori ga, nije potreban |

Restartuj računar nakon instalacije.

---

### KORAK 2 — Proveri da PostgreSQL radi

1. Pritisni `Win + R` → ukucaj `services.msc` → Enter
2. Pronađi **postgresql-x64-16**
3. Status: **Running**, Startup Type: **Automatic**

PostgreSQL se automatski pokreće sa Windowsom — ne moraš ga ručno pokretati.


---


### KORAK 3 — Pokreni projekat

# Skini nove pakete
dotnet restore TouristGuide.Api.csproj

# Pokreni aplikaciju
dotnet run


---


## Seed podaci — šta se upisuje u bazu

| Tabela | Broj zapisa |
|---|---|
| `organization` | 6 |
| `admin_user` | 9 (1 superadmin, 7 aktivnih, 1 suspendovan) |
| `region` | 12 (Žabljak, Budva, Kotor, Durmitor...) |
| `tag` | 30 (aktivnosti, stilovi, amenities) |
| `tourist` | 10 |
| `post` | 24 (smještaj, restorani, klubovi, eventi, kulturni...) |
| `post_tag` | ~40 veza |
| `route` | 5 |
| `review` | 22 (APPROVED / PENDING / REJECTED) |
| `admin_notification` | 8 |

---

## Česte greške i rešenja

### `password authentication failed for user "postgres"`
Lozinka u `appsettings.json` ne odgovara onoj unesenoj pri instalaciji PostgreSQL-a.
→ Provjeri i uskladi lozinku u connection stringu.

### `connection refused`
PostgreSQL servis nije pokrenut.
→ `Win + R` → `services.msc` → pronađi `postgresql-x64-16` → desni klik → Start.

### `Could not load type 'Pomelo...'`
Stari MySQL paket još nije zamenjen.
→ Pokreni `dotnet restore TouristGuide.Api.csproj`.

### `MSBUILD : error MSB1011`
U folderu ima više project fajlova.
→ Eksplicitno navedi fajl: `dotnet run --project TouristGuide.Api.csproj`.
