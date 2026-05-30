# AdriGo

Digitalna turisticka mapa Crne Gore sa odvojenim aplikacijama za turiste i administratore, .NET backendom, PostgreSQL bazom i MCP/Gemini chat slojem.

## Hostovane verzije

| Deo sistema | URL |
| --- | --- |
| Korisnicki frontend | https://softeng.pmf.kg.ac.rs:10187 |
| Admin frontend | https://softeng.pmf.kg.ac.rs:10188 |
| Backend API | https://softeng.pmf.kg.ac.rs:10185/api |
| MCP / chat servis | https://softeng.pmf.kg.ac.rs:10186 |

## Stack

| Sloj | Tehnologije |
| --- | --- |
| Backend | ASP.NET Core 8, Entity Framework Core 8, PostgreSQL, SignalR |
| Admin frontend | Angular 21, TypeScript, SCSS, Leaflet, Chart.js, SignalR |
| Korisnicki frontend | Angular 21, TypeScript, Leaflet, Swiper, SignalR |
| AI/MCP | .NET MCP servis, Gemini chat proxy |
| Upload i mail | Cloudinary, SMTP email servis |

## Glavne funkcionalnosti

Korisnicki frontend:
- registracija, login, email verifikacija i Google prijava
- interaktivna mapa, lokacije, aktivnosti, rute i dogadjaji
- detalji sadrzaja, recenzije, lajkovi, cuvanje i deljenje
- planer putovanja, personalizovane preporuke i obavestenja
- Gemini chat kroz MCP/backend proxy

Admin frontend:
- dashboard sa statistikama i analitikom
- upravljanje lokacijama, aktivnostima, rutama, dogadjajima i objavama
- moderacija recenzija i pregled turista
- registracioni workflow za admin naloge
- upravljanje adminima, dozvolama, regionima i organizacijama
- real-time notifikacije preko SignalR-a

Backend:
- JWT autentifikacija i role: `superadmin`, `admin`, `tourist`
- EF Core migracije, seeding podataka i PostgreSQL advisory lock pri migracijama
- indeksi i zastite za konkurentne upise, posebno za recenzije/interakcije
- response compression, EF Core DbContext pooling i globalni rate limiter
- Cloudinary upload, email linkovi i SignalR hubovi

## Lokalni URL-ovi

| Deo sistema | Lokalni URL |
| --- | --- |
| Backend API | http://localhost:5125/api |
| Swagger | http://localhost:5125/swagger |
| MCP / chat servis | http://localhost:5200 |
| Admin frontend | http://localhost:4200 |
| Korisnicki frontend | http://localhost:4201 |

## Preduslovi

- .NET 8 SDK
- Node.js 20+ i npm
- Angular CLI 21+
- PostgreSQL 15+
- EF Core CLI: `dotnet tool install --global dotnet-ef`

## Pokretanje

Backend:

```bash
cd src/Backend/TouristGuide.Api
dotnet ef database update
dotnet run
```

Admin frontend:

```bash
cd src/Frontend/Frontend_Admin
npm install
npm start
```

Korisnicki frontend:

```bash
cd src/Frontend/Frontend_Korisnik
npm install
npm start
```

MCP/chat servis, ako je potreban korisnickom chatu:

```bash
cd src/MCP
dotnet run
```

## Konfiguracija

Najvaznije vrednosti su u:
- `src/Backend/TouristGuide.Api/appsettings.json`
- `src/Frontend/Frontend_Admin/src/environments/environment*.ts`
- `src/Frontend/Frontend_Korisnik/src/environments/environment*.ts`
- `src/MCP/appsettings*.json`

Za lokalni razvoj backend koristi `http://localhost:5125`, admin `http://localhost:4200`, korisnicki frontend `http://localhost:4201`, a MCP/chat `http://localhost:5200`.

Za produkcioni build frontend environment fajlovi vec ciljaju hostovane URL-ove sa `softeng.pmf.kg.ac.rs` domena.

## Reset baze

```bash
cd src/Backend/TouristGuide.Api
dotnet ef database drop --force
dotnet ef database update
dotnet run
```

Pri pokretanju backend automatski primenjuje migracije i seeduje podatke kroz `DatabaseSeeder`.

## Dev kredencijali

Superadmin:

| Email | Lozinka |
| --- | --- |
| `superadmin@touristguide.me` | `***REMOVED***` |

Admin nalozi:

| Email | Lozinka | Napomena |
| --- | --- | --- |
| `ana.kovacevic@zabljak.travel` | `***REMOVED***` | aktivan |
| `nikola.djuric@npdurmitor.me` | `***REMOVED***` | aktivan |
| `marija.p@touristguide.me` | `***REMOVED***` | aktivan |
| `dragana.m@tozabljak.me` | `***REMOVED***` | aktivan |
| `stefan.v@skidurmitor.me` | `***REMOVED***` | aktivan |
| `ivana.j@budva.travel` | `***REMOVED***` | aktivan |
| `aleksandar.b@kotor.travel` | `***REMOVED***` | aktivan |
| `dragan.lazovic@outdoorme.me` | `***REMOVED***` | suspendovan, login treba da bude odbijen |

Turisticki nalozi se mogu kreirati kroz registracionu formu na korisnickom frontendu.

## Struktura

```text
globecode/
  src/
    Backend/TouristGuide.Api/       .NET 8 REST API, EF Core, SignalR
    Frontend/Frontend_Admin/        Angular admin panel
    Frontend/Frontend_Korisnik/     Angular turisticki portal
    MCP/                            MCP i Gemini chat servis
    Recommended/                    preporuke linkovane u backend build
    Shared/                         deljeni DTO/contract fajlovi
    Database/                       beleske i SQL materijali
  docs/                             dodatna dokumentacija
  sandbox/                          studentski/demo projekti
```

## Korisne komande

```bash
dotnet build src/Backend/TouristGuide.Api/TouristGuide.Api.csproj
npm run build --prefix src/Frontend/Frontend_Admin
npm run build --prefix src/Frontend/Frontend_Korisnik
```

## Napomene

- Backend je izvor istine za API i migracije.
- Produkcioni frontend URL-ovi su vec upisani u production environment fajlove.
- Chat ne ide direktno iz browsera ka Gemini API-ju, vec kroz lokalni/hostovani MCP servis.
- Cloudinary i email konfiguracija moraju biti validni za upload i email tokove.
