# AdriGo — Digitalna turistička mapa Crne Gore

> Troslojna platforma za upravljanje i prikaz turističkih sadržaja u Crnoj Gori — .NET 8 API · Angular 21 admin panel · Angular 21 korisnički frontend

---

## Sadržaj

- [Pregled projekta](#pregled-projekta)
- [Tehnologije](#tehnologije)
- [Arhitektura](#arhitektura)
- [Funkcionalnosti](#funkcionalnosti)
- [Preduslovi](#preduslovi)
- [Instalacija i pokretanje](#instalacija-i-pokretanje)
- [Konfiguracija](#konfiguracija)
- [Struktura projekta](#struktura-projekta)
- [Dev kredencijali](#dev-kredencijali)
- [Mock mod](#mock-mod)
- [FAQ](#faq)
- [Licenca](#licenca)

---

## Pregled projekta

AdriGo je web platforma koja turistima omogućuje interaktivno istraživanje Crne Gore putem mape, a organizacijama i turističkim vodičima pruža alat za upravljanje sadržajem. Platforma je izgrađena kao moderna troslojna arhitektura s odvojenim frontend aplikacijama za turiste i administratore.

Ključni tok: turista pretražuje lokacije i rute → ostavlja recenziju → admin moderira sadržaj → superadmin odobrava nove admin naloge → sve promjene vidljive su u realnom vremenu putem SignalR notifikacija.

---

## Tehnologije

| Sloj | Tehnologija |
|------|------------|
| **Backend** | ASP.NET Core 8, Entity Framework Core 8, PostgreSQL 15+, SignalR 1.x |
| **Autentifikacija** | JWT Bearer, BCrypt.Net |
| **Upload** | Cloudinary SDK |
| **Admin frontend** | Angular 21, TypeScript, Leaflet 1.9, @microsoft/signalr 10 |
| **Korisnički frontend** | Angular 21, TypeScript |
| **Baza** | PostgreSQL 15+ (Npgsql EF Core provider) |

---

## Arhitektura

```
┌──────────────────────────────────────────────────────┐
│                   Frontend_Admin                     │
│   Angular 21 · port 4200 · admin panel               │
└─────────────────────┬────────────────────────────────┘
                      │ REST + SignalR WebSocket
┌──────────────────────────────────────────────────────┐
│              TouristGuide.Api (.NET 8)                │
│   REST API · port 5125 · JWT · EF Core · SignalR Hub  │
└───────────────┬──────────────────┬───────────────────┘
                │ EF Core          │ Cloudinary SDK
        ┌───────▼────────┐  ┌──────▼──────────┐
        │  PostgreSQL 15  │  │   Cloudinary    │
        └────────────────┘  └─────────────────┘
                      │ REST
┌──────────────────────────────────────────────────────┐
│             Frontend_Korisnik                        │
│   Angular 21 · port 4201 · turistički portal         │
└──────────────────────────────────────────────────────┘
```

---

## Funkcionalnosti

### Turistički portal (Frontend_Korisnik)
- Registracija i prijava turista s email verifikacijom
- Interaktivna mapa sa lokacijama, rutama i događajima (Leaflet)
- Pretraga i filtriranje sadržaja po kategorijama
- Detalji lokacije, galerija slika, recenzije
- Sačuvane lokacije i planer putovanja
- Kalendar događaja
- Podešavanja profila i obaveštenja

### Admin panel (Frontend_Admin)
- **Nadzorna tabla** — statistike poseta, aktivnih turista, popularnih ruta i analitika
- **Rute i aktivnosti** — CRUD upravljanje turističkim rutama, aktivnostima i događajima
- **Lokacije** — upravljanje turističkim destinacijama s mapom i uploadom slika
- **Recenzije** — moderacija recenzija turista
- **Turisti** — pregled i upravljanje korisničkim nalozima
- **Registracioni zahtevi** — workflow odobravanja/odbijanja novih admin naloga s pregledom verifikacionih dokumenata
- **Admin korisnici** — upravljanje admin nalozima i dodjeljivanje uloga
- **Dozvole** — granularne dozvole po adminima i regionima
- **Real-time notifikacije** — SignalR WebSocket za instant obavještenja o novim zahtjevima, recenzijama i događajima
- **Višejezičnost** — podrška za srpski, engleski, njemački, talijanski i francuski (DOM-based i18n)

### Backend API
- JWT autentifikacija s ulogama (`superadmin`, `admin`)
- Admin registracioni workflow: dokument verifikacija → email potvrda → superadmin pregled
- SignalR hub za grupno emitovanje notifikacija (`superadmins`, `admin_{id}`)
- Cloudinary integracija za upload slika
- EF Core migracije i dev seeder s kompletnim testnim podacima

---

## Preduslovi

Prije pokretanja instalirati:

1. **[.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8)**
2. **[Node.js 20+](https://nodejs.org/)** i npm
3. **[Angular CLI](https://angular.dev/tools/cli)**
   ```bash
   npm install -g @angular/cli
   ```
4. **[PostgreSQL 15+](https://www.postgresql.org/download/)** — pokrenuta instanca
5. **[EF Core CLI](https://learn.microsoft.com/en-us/ef/core/cli/dotnet)**
   ```bash
   dotnet tool install --global dotnet-ef
   ```

---

## Instalacija i pokretanje

### 1. Kloniranje repozitorijuma

```bash
git clone <repo-url>
cd globecode/src
```

### 2. Backend — TouristGuide.Api

```bash
cd Backend/TouristGuide.Api
```

Podesiti konekciju u `appsettings.json` (v. [Konfiguracija](#konfiguracija)), zatim:

```bash
dotnet ef database update        # Kreira bazu i primjenjuje migracije
dotnet run                       # Pokreće API server
```

API je dostupan na **`http://localhost:5125`**. Pri prvom pokretanju `DatabaseSeeder` automatski popunjava bazu testnim podacima.

### 3. Admin frontend — Frontend_Admin

```bash
cd ../../Frontend/Frontend_Admin
npm install
ng serve                         # http://localhost:4200
```

### 4. Korisnički frontend — Frontend_Korisnik

```bash
cd ../Frontend_Korisnik
npm install
ng serve --port 4201             # http://localhost:4201
```

### Reset baze na inicijalne podatke

```bash
cd Backend/TouristGuide.Api
dotnet ef database drop --force
dotnet ef database update
dotnet run
```

---

## Konfiguracija

`Backend/TouristGuide.Api/appsettings.json` sadrzi samo neosetljive podrazumevane vrednosti. Tajne i konekcije podesiti kroz environment varijable, user-secrets ili lokalni `appsettings.Development.json` koji nije u repozitorijumu:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": ""
  },
  "Jwt": {
    "Secret": "",
    "Issuer": "TouristGuideApi",
    "Audience": "TouristGuideClients",
    "ExpiresInHours": 8
  },
  "Cloudinary": {
    "CloudName": "YOUR_CLOUD_NAME",
    "ApiKey": "YOUR_API_KEY",
    "ApiSecret": "YOUR_API_SECRET"
  },
  "Email": {
    "AdminBaseUrl": "http://localhost:4200",
    "TouristBaseUrl": "http://localhost:4201"
  }
}
```

> **Napomena:** Za lokalni razvoj Cloudinary kredencijali mogu ostati nepostavljeni — upload slika će biti nedostupan ali ostatak aplikacije funkcioniše normalno.

---

## Struktura projekta

```
globecode/
└── src/
    ├── Backend/
    │   └── TouristGuide.Api/
    │       ├── Controllers/          # API endpointi (Auth, Admin, Analytics, Posts...)
    │       ├── Data/                 # AppDbContext, DatabaseSeeder
    │       ├── DTOs/                 # Data Transfer Objects
    │       ├── Hubs/                 # AdminNotificationHub (SignalR)
    │       ├── Models/               # Domenski modeli (Tourist, Post, Route, Review...)
    │       ├── Services/             # JWT, Email, Cloudinary, NotificationService...
    │       ├── Migrations/           # EF Core migracije
    │       └── appsettings.json
    │
    ├── Frontend/
    │   ├── Frontend_Admin/
    │   │   └── src/app/
    │   │       ├── AdminAplikacija/  # Sve admin stranice i komponente
    │   │       │   ├── dashboard/
    │   │       │   ├── routes-management/
    │   │       │   ├── aktivnosti/
    │   │       │   ├── events/
    │   │       │   ├── destinations/
    │   │       │   ├── reviews/
    │   │       │   ├── turisti/
    │   │       │   ├── users/
    │   │       │   ├── permissions/
    │   │       │   ├── admin-requests/
    │   │       │   ├── analytics/
    │   │       │   └── map-admin/
    │   │       ├── core/             # Auth, interceptori, servisi, modeli
    │   │       ├── login/
    │   │       └── register/
    │   │
    │   └── Frontend_Korisnik/
    │       └── src/app/
    │           ├── MapHome/          # Glavna turistička mapa
    │           ├── Lokacije/         # Lista lokacija
    │           ├── location-details/ # Detalji lokacije
    │           ├── Login/ / Register/
    │           ├── calendar/
    │           ├── saved-locations/
    │           └── services/
    │
    └── Database/                     # SQL skripte i šema
```

---

## Dev kredencijali

### Admin panel (Frontend_Admin)

#### Superadmin
| Email | Lozinka |
|-------|---------|
| `superadmin@touristguide.me` | `***REMOVED***` |

#### Admini
| Email | Lozinka | Napomena |
|-------|---------|----------|
| `ana.kovacevic@zabljak.travel` | `***REMOVED***` | — |
| `nikola.djuric@npdurmitor.me` | `***REMOVED***` | — |
| `marija.p@touristguide.me` | `***REMOVED***` | — |
| `dragana.m@tozabljak.me` | `***REMOVED***` | — |
| `stefan.v@skidurmitor.me` | `***REMOVED***` | — |
| `ivana.j@budva.travel` | `***REMOVED***` | — |
| `aleksandar.b@kotor.travel` | `***REMOVED***` | — |
| `dragan.lazovic@outdoorme.me` | `***REMOVED***` | Suspendovan — login se odbija |

### Korisnički portal (Frontend_Korisnik)

Turistički nalozi su seeded u bazi s nasumičnim lozinkama. Kreirati novog korisnika putem registracione forme na portu 4201.

---

## Mock mod

Admin frontend podržava rad **bez pokrenute baze**. Aktivirati u `Frontend_Admin/src/environments/environment.ts`:

```typescript
export const environment = {
  useMocks: true,
  apiUrl: 'http://localhost:5125/api',
};
```

Mock kredencijali:
| Email | Lozinka | Uloga |
|-------|---------|-------|
| `superadmin@adrigo.rs` | `admin123` | Superadmin |
| `admin@kopaonik.rs` | `admin123` | Admin |

---

## FAQ

**Zašto se admin registracija ne završava odmah?**  
Admin nalog prolazi kroz manuelni pregled. Nakon slanja zahteva s verifikacionim dokumentom i potvrde email adrese, superadmin odobrava ili odbija nalog. Korisnik prima obavještenje emailom.

**Koji formati dokumenata su podržani za verifikaciju?**  
JPG, PNG i PDF do maksimalno 5 MB.

**Kako dodati novog admina bez prolaska kroz registraciju?**  
Putem superadmin panela u sekciji *Zahtevi za registraciju* → dugme *Dodaj ručno*, ili direktnim seed-ovanjem u `DatabaseSeeder.SeedAdminUsersAsync()`.

**Kako funkcioniše višejezičnost u admin panelu?**  
`SiteTranslateService` hoda DOM stablo i zamjenjuje srpske tekstove prijevodima učitanim iz `assets/i18n/{kod}.json` (SR, EN, DE, IT, FR). Izbor jezika se čuva u localStorage.

**Šta su SignalR notifikacije i kako ih testirati?**  
Prijaviti se kao superadmin u jednom tabu i kao novi admin u drugom. Svaka akcija novog admina (zahtev, recenzija, itd.) trebala bi se odmah pojaviti kao notifikacija u superadmin panelu.

---

## Licenca

Privatni projekat — sva prava zadržana.
