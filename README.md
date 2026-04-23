# AdriGo — Digitalna turistička mapa Crne Gore

Platforma za upravljanje i prikaz turističkih sadržaja u Crnoj Gori, izgrađena kao troslojna arhitektura: .NET 8 Web API backend, Angular 21 admin panel i Angular 21 korisnički frontend.<br>

## Tehnologije

- **Backend**: ASP.NET Core 8, Entity Framework Core, PostgreSQL, SignalR, JWT autentifikacija, Cloudinary
- **Admin frontend**: Angular 21, Angular Material, Chart.js, Google Maps API
- **Korisnički frontend**: Angular 21, Google Maps API

## Funkcionalnosti

- **Interaktivna mapa**: Prikaz turističkih lokacija, ruta i događaja na Google Maps karti u realnom vremenu.
- **Registracija i prijava**: Turistički korisnici se registruju email-om sa verifikacijom; admin nalozi prolaze kroz manuelni pregled superadmina.
- **Admin panel**: Upravljanje lokacijama, rutama, događajima, aktivnostima, recenzijama i korisnicima.
- **Uloge i dozvole**: Superadmin ima pun pristup; admin nalozi imaju granularne dozvole po tipu sadržaja.
- **Recenzije**: Turisti ostavljaju recenzije koje admin moderira; sistem automatski notifikuje o novim recenzijama.
- **Analitika**: Dashboard sa statistikama poseta, popularnih lokacija i kretanja turista.
- **Real-time notifikacije**: SignalR WebSocket konekcija za instant obaveštenja u admin panelu.
- **Upload dokumenata**: Verifikacioni dokumenti za admin registracije čuvaju se lokalno i putem Cloudinary servisa.

## Preduslovi

Pre pokretanja, potrebno je imati instalirano:

1. [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8)
2. [Node.js 20+](https://nodejs.org/) i npm
3. [Angular CLI 21](https://angular.dev/tools/cli)
   ```bash
   npm install -g @angular/cli
   ```
4. [PostgreSQL 15+](https://www.postgresql.org/download/) — baza podataka
5. [Entity Framework Core CLI](https://learn.microsoft.com/en-us/ef/core/cli/dotnet)
   ```bash
   dotnet tool install --global dotnet-ef
   ```

## Instalacija i pokretanje

### 1. Backend (TouristGuide_Api)

Klonirati repozitorijum i pozicionirati se u backend folder:

```bash
git clone <repo-url>
cd TouristGuide_Api
```

Konfigurisati konekciju ka bazi u `appsettings.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=turisticka_baza;Username=postgres;Password=admin;"
}
```

Pokrenuti migracije i seed podatke, a zatim startovati server:

```bash
dotnet ef database update
dotnet run
```

API je dostupan na `http://localhost:5125`.

### 2. Admin frontend (Frontend_Admin)

```bash
cd Frontend_Admin
npm install
ng serve
```

Admin panel je dostupan na `http://localhost:4200`.

### 3. Korisnički frontend (Frontend_Korisnik)

```bash
cd Frontend_Korisnik
npm install
ng serve --port 4201
```

Korisnički frontend je dostupan na `http://localhost:4201`.

## Reset baze na inicijalne podatke

```bash
dotnet ef database drop --force
dotnet ef database update
dotnet run
```

## Struktura projekta

```
TouristGuide_Api/
├── Controllers/          # API endpointi (Auth, Tourist, Admin, Analytics...)
├── Data/                 # AppDbContext i EF konfiguracija
├── DTOs/                 # Data Transfer Objects
├── Hubs/                 # SignalR hub za real-time notifikacije
├── Models/               # Domenski modeli (Tourist, Post, Route, Review...)
├── Services/             # Poslovna logika (JWT, Email, Cloudinary, Notifikacije...)
├── Migrations/           # EF Core migracije
└── appsettings.json      # Konfiguracija (DB, JWT, Cloudinary)

Frontend_Admin/
├── src/app/
│   ├── AdminAplikacija/  # Sve admin stranice (dashboard, lokacije, eventi...)
│   ├── core/             # Auth servis, guard-ovi, interceptori
│   ├── login/            # Login stranica
│   └── register/         # Registracija admin naloga

Frontend_Korisnik/
├── src/app/
│   ├── MapHome/          # Glavna mapa
│   ├── Login/            # Prijava
│   ├── Register/         # Registracija turiste
│   ├── Lokacije/         # Lista lokacija
│   ├── location-details/ # Detalji lokacije
│   └── services/         # Auth i korisnički servisi
```

## Login kredencijali (dev)

### Superadmin

| Email | Lozinka |
|---|---|
| `superadmin@touristguide.me` | `***REMOVED***` |

### Admin

| Email | Lozinka | Napomena |
|---|---|---|
| `ana.kovacevic@zabljak.travel` | `***REMOVED***` | — |
| `nikola.djuric@npdurmitor.me` | `***REMOVED***` | — |
| `marija.p@touristguide.me` | `***REMOVED***` | — |
| `dragana.m@tozabljak.me` | `***REMOVED***` | — |
| `stefan.v@skidurmitor.me` | `***REMOVED***` | — |
| `ivana.j@budva.travel` | `***REMOVED***` | — |
| `aleksandar.b@kotor.travel` | `***REMOVED***` | — |
| `dragan.lazovic@outdoorme.me` | `***REMOVED***` | Suspendovan nalog — login se odbija |

## Mock mod (bez backend-a)

Admin frontend podržava rad bez pokrenute baze. Aktivira se u `src/environments/environment.ts`:

```typescript
export const environment = {
  useMocks: true,
  apiUrl: 'http://localhost:5125/api',
};
```

U mock modu su dostupni:
- **Superadmin**: `superadmin@adrigo.rs` / `admin123`
- **Admin**: `admin@kopaonik.rs` / `admin123`

## FAQ

**Zašto se admin registracija ne završava odmah?**<br>
Admin nalog prolazi kroz manuelni pregled. Nakon slanja zahteva sa verifikacionim dokumentom, superadmin odobrava ili odbija nalog. Korisnik dobija obaveštenje emailom.

**Koji formati dokumenata su podržani za verifikaciju?**<br>
JPG, PNG i PDF do maksimalno 5 MB.

**Kako dodati novog admina bez registracije?**<br>
Direktno kroz superadmin panel u sekciji "Zahtevi za registraciju" ili ručnim seed-ovanjem baze.

## Licenca

Privatni projekat — sva prava zadržana.