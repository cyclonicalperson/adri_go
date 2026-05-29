# AdriGo Admin Frontend

Angular 21 admin panel za upravljanje AdriGo turistickim sadrzajem, korisnicima, recenzijama, analitikom i admin registracionim zahtevima.

## URL-ovi

| Okruzenje | URL |
| --- | --- |
| Lokalno | http://localhost:4200 |
| Hostovano | https://softeng.pmf.kg.ac.rs:10188 |
| Lokalni API | http://localhost:5125/api |
| Hostovani API | https://softeng.pmf.kg.ac.rs:10185/api |
| Korisnicki frontend | https://softeng.pmf.kg.ac.rs:10187 |

Production environment je u `src/environments/environment.production.ts` i vec pokazuje na hostovane URL-ove.

## Pokretanje

```bash
npm install
npm start
```

Angular dev server se pokrece na `http://localhost:4200`.

Za production build:

```bash
npm run build
```

Build artefakti idu u `dist/frontend`.

## Sta aplikacija pokriva

- dashboard i analitika
- rute, aktivnosti, dogadjaji i lokacije
- moderacija recenzija
- pregled turista i njihove aktivnosti
- admin korisnici, organizacije, role i granularne dozvole
- registracioni zahtevi za nove admine
- SignalR notifikacije u realnom vremenu
- mock mod za rad bez backend-a

## Konfiguracija

Relevantni fajlovi:

- `src/environments/environment.ts`
- `src/environments/environment.development.ts`
- `src/environments/environment.production.ts`
- `proxy.conf.json`

Za mock mod promeniti `useMocks` na `true` u environment fajlu koji se koristi.

## Login kredencijali

Superadmin:

| Email | Lozinka |
| --- | --- |
| `superadmin@touristguide.me` | `Admin123!` |

Admin nalozi:

| Email | Lozinka | Napomena |
| --- | --- | --- |
| `ana.kovacevic@zabljak.travel` | `Admin123!` | aktivan |
| `nikola.djuric@npdurmitor.me` | `Admin123!` | aktivan |
| `marija.p@touristguide.me` | `Admin123!` | aktivan |
| `dragana.m@tozabljak.me` | `Admin123!` | aktivan |
| `stefan.v@skidurmitor.me` | `Admin123!` | aktivan |
| `ivana.j@budva.travel` | `Admin123!` | aktivan |
| `aleksandar.b@kotor.travel` | `Admin123!` | aktivan |
| `dragan.lazovic@outdoorme.me` | `Admin123!` | suspendovan, login treba da bude odbijen |

Mock kredencijali:

| Email | Lozinka | Uloga |
| --- | --- | --- |
| `superadmin@adrigo.rs` | `admin123` | superadmin |
| `admin@kopaonik.rs` | `admin123` | admin |

## Reset backend baze

Pokrenuti iz `src/Backend/TouristGuide.Api`:

```bash
dotnet ef database drop --force
dotnet ef database update
dotnet run
```
