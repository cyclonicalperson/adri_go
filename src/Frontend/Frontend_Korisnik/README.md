# AdriGo Korisnicki Frontend

Angular 21 turisticki portal za istrazivanje Crne Gore kroz mapu, lokacije, aktivnosti, rute, dogadjaje, preporuke i chat asistenta.

## URL-ovi

| Okruzenje | URL |
| --- | --- |
| Lokalno | http://localhost:4201 |
| Hostovano | https://softeng.pmf.kg.ac.rs:10187 |
| Lokalni API | http://localhost:5125/api |
| Hostovani API | https://softeng.pmf.kg.ac.rs:10185/api |
| Lokalni MCP/chat | http://localhost:5200 |
| Hostovani MCP/chat | https://softeng.pmf.kg.ac.rs:10186 |
| Admin frontend | https://softeng.pmf.kg.ac.rs:10188 |

Production environment je u `src/environments/environment.production.ts` i vec pokazuje na hostovane URL-ove.

## Pokretanje

```bash
npm install
npm start
```

Angular dev server se pokrece na `http://localhost:4201`.

Za production build:

```bash
npm run build
```

## Sta aplikacija pokriva

- registracija, login, email verifikacija i Google prijava
- glavna mapa sa lokacijama, rutama, aktivnostima i preporukama
- detalji lokacija i sadrzaja, galerije i recenzije
- cuvanje, lajkovanje, deljenje i pracenje interakcija
- planer putovanja i korisnicki kalendar
- korisnicki profil, privatnost i obavestenja
- Gemini chat kroz MCP/backend servis

## Konfiguracija

Relevantni fajlovi:

- `src/environments/environment.ts`
- `src/environments/environment.development.ts`
- `src/environments/environment.production.ts`

Lokalni development koristi:

```ts
apiUrl: 'http://localhost:5125/api'
touristAppUrl: 'http://localhost:4201'
adminAppUrl: 'http://localhost:4200'
mcpUrl: 'http://localhost:5200/mcp'
chatApiUrl: 'http://localhost:5200/api/chat'
```

Production build koristi hostovane servise:

```ts
apiUrl: 'https://softeng.pmf.kg.ac.rs:10185/api'
touristAppUrl: 'https://softeng.pmf.kg.ac.rs:10187'
adminAppUrl: 'https://softeng.pmf.kg.ac.rs:10188'
mcpUrl: 'https://softeng.pmf.kg.ac.rs:10186/mcp'
chatApiUrl: 'https://softeng.pmf.kg.ac.rs:10186/api/chat'
```

## Backend zavisnosti

Za pun rad lokalno treba pokrenuti:

```bash
cd ../../Backend/TouristGuide.Api
dotnet run
```

Za chat:

```bash
cd ../../MCP
dotnet run
```

Turisticke naloge najjednostavnije je kreirati kroz registracionu formu.
