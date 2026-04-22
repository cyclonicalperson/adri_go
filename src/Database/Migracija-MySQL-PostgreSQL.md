# Migracija sa MySQL na PostgreSQL

## Šta je urađeno

Projekat je migriran sa **MySQL** (Pomelo driver) na **PostgreSQL** (Npgsql driver). Uz migraciju baze, dodat je sistem za upravljanje strukturom baze kroz **EF Core migracije**, punjenje početnim podacima (seed), upload slika na Cloudinary cloud storage, kao i baze podataka viewovi.

### Promene u projektu

| Fajl | Šta je promenjeno |
|---|---|
| `TouristGuide.Api.csproj` | Zamenjen `Pomelo.EntityFrameworkCore.MySql` sa `Npgsql.EntityFrameworkCore.PostgreSQL`, dodat `BCrypt.Net-Next`, `CloudinaryDotNet`, `Microsoft.EntityFrameworkCore.Design` |
| `appsettings.json` | MySQL connection string zamenjen PostgreSQL formatom, dodata Cloudinary konfiguracija |
| `Program.cs` | `UseMySql()` zamenjeno sa `UseNpgsql()`, `EnsureCreatedAsync` zamenjen sa `MigrateAsync`, registrovani novi servisi |
| `Services/DatabaseSeeder.cs` | Automatski puni bazu početnim podacima pri pokretanju ako su tabele prazne |
| `Services/CloudinaryService.cs` | Novi fajl — servis za upload slika na Cloudinary |
| `Controllers/ImageUploadController.cs` | Refaktorisan — slike se sada čuvaju na Cloudinary umesto lokalno |
| `Migrations/` | Novi folder — sadrži EF Core migracije koje kreiraju tabelu i viewove |

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

```bash
# Skini nove pakete
dotnet restore TouristGuide.Api.csproj

# Pokreni aplikaciju
dotnet run
```

Pri pokretanju aplikacija automatski:
1. Primjenjuje sve migracije i kreira tabele u bazi
2. Kreira viewove u bazi
3. Puni tabele početnim podacima ako su prazne

---

## EF Core migracije — kako funkcionišu

### Princip rada

Umesto da aplikacija direktno kreira tabele iz C# modela, koristimo sistem **migracija** koji prati svaku promenu strukture baze. Svaka migracija je zaseban fajl koji sadrži `Up()` (primeni promenu) i `Down()` (poništi promenu) metode.

Kada se aplikacija pokrene, `MigrateAsync()` u `Program.cs` automatski primenjuje sve migracije koje još nisu primenjene na bazi — bez gubljenja podataka.


### Kada menjаš model (dodaješ polje, tabelu itd.)

Svaki put kada promijeniš C# model (npr. dodaš novo polje u `Tag.cs`), treba kreirati novu migraciju:

```bash
# 1. Kreiraj migraciju (izvršiti u TouristGuide.Api folderu)
dotnet ef migrations add NazivPromene

# 2. Pokreni aplikaciju — migracija se automatski primjenjuje
dotnet run
```

Primjeri naziva migracija:
```bash
dotnet ef migrations add AddDescriptionToTag
dotnet ef migrations add AddHomeCoordsToTourist
dotnet ef migrations add CreateMcpServerTable
dotnet ef migrations add AddGpxPathToRoute
```

### Ako napraviš grešku u migraciji

Ako još nisi pokrenuo aplikaciju (migracija nije primenjena):
```bash
# Obriši zadnju migraciju
dotnet ef migrations remove
```

Ako jesi pokrenuo aplikaciju (migracija je primenjena na bazu):
```bash
# Vrati bazu na prethodnu migraciju pa obriši fajl
dotnet ef database update ImePrethedneMigracije
dotnet ef migrations remove
```

### Resetovanje baze (samo tokom razvoja)

Ako trebaš čist početak:
```sql
-- Pokreni u pgAdmin
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```
Zatim pokreni aplikaciju — sve migracije i seed podaci se primenjuju automatski.

---

## Cloudinary — upload slika

Slike se više ne čuvaju lokalno na serveru već na **Cloudinary** cloud storage-u. URL slike se čuva u bazi umesto lokalne putanje.

Svaki član tima koristi isti Cloudinary nalog — kredencijali su već u `appsettings.json`.

---

## Viewovi u bazi

Baza sadrži sljedeće viewove koji se kreiraju automatski kroz migraciju:

| View | Opis |
|---|---|
| `v_posts_full` | Objave sa podacima admina i regije |
| `v_routes_full` | Rute sa podacima admina i regije |
| `v_reviews_full` | Recenzije sa imenom turiste, objave i rute |
| `v_admin_users_full` | Admini sa podacima organizacije i brojem permisija |
| `v_superadmin_overview` | Agregirani statistički pregled platforme |
| `v_region_popularity` | Popularnost regija po pregledima, lajkovima i ocenama |

Viewove možeš koristiti direktno u pgAdmin za brzu analitiku:
```sql
SELECT * FROM v_superadmin_overview;
SELECT * FROM v_region_popularity ORDER BY "totalViews" DESC;
SELECT * FROM v_posts_full WHERE "regionName" = 'Budva';
```

---

## Seed podaci — šta se upisuje u bazu

| Tabela | Broj zapisa |
|---|---|
| `organization` | 6 |
| `admin_user` | 9 (1 superadmin, 7 aktivnih, 1 suspendovan) |
| `admin_permission` | 16 |
| `admin_user_permission` | ~40 veza permisija po adminima |
| `admin_registration_request` | 3 (pending zahtjevi za testiranje) |
| `region` | 12 (Žabljak, Budva, Kotor, Durmitor...) |
| `tag` | 30 (aktivnosti sa description/duration/difficulty, stilovi, amenities) |
| `tourist` | 10 |
| `post` | 24 (smještaj, restorani, klubovi, eventi, kulturni...) |
| `post_tag` | ~40 veza |
| `post_view` | ~90 pregleda raspoređenih po zadnjih 30 dana |
| `route` | 5 |
| `tourist_favorite` | 10 omiljenih ruta |
| `visit_planner` | 3 planera sa stavkama |
| `review` | 23 (APPROVED / PENDING / REJECTED) |
| `admin_notification` | 13 |
| `admin_audit_log` | 8 |
| `mailing_list` | 10 |

---

## Česte greške i rešenja

### `password authentication failed for user "postgres"`
Lozinka u `appsettings.json` ne odgovara onoj unesenoj pri instalaciji PostgreSQL-a.
→ Proveri i uskladi lozinku u connection stringu.

### `connection refused`
PostgreSQL servis nije pokrenut.
→ `Win + R` → `services.msc` → pronađi `postgresql-x64-16` → desni klik → Start.

### `Could not load type 'Pomelo...'`
Stari MySQL paket još nije zamenjen.
→ Pokreni `dotnet restore TouristGuide.Api.csproj`.

### `MSBUILD : error MSB1011`
U folderu ima više project fajlova.
→ Eksplicitno navedi fajl: `dotnet run --project TouristGuide.Api.csproj`.

### `dotnet ef: command not found`
EF Core alati nisu instalirani.
→ Pokreni: `dotnet tool install --global dotnet-ef`

### `Your target project doesn't match your migrations assembly`
Komanda se izvršava iz pogrešnog foldera.
→ Uvek pokreći `dotnet ef` komande iz `TouristGuide.Api` foldera.
