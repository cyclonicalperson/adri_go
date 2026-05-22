# AGENTS.md

Ovaj fajl je vodic za AI agente koji rade na ovom repozitorijumu.

## Stil odgovora

- Koristi Markdown u odgovorima korisniku.
- Kada dodajes novi frontend tekst, kontrolu, ekran ili vidljivo stanje, azuriraj i odgovarajuce kljuceve u `src/assets/i18n/*.json` za tu aplikaciju.

## Pregled projekta

AdriGo je troslojna turisticka platforma za Crnu Goru:

- `src/Backend/TouristGuide.Api` - ASP.NET Core 8 REST API sa EF Core/Npgsql, JWT autentifikacijom, SignalR notifikacijama, Cloudinary uploadom i development seederom. Lokalni HTTP port je `5125`.
- `src/Frontend/Frontend_Admin` - Angular 21 admin aplikacija. Serve port je `4200`; kod je u `src/app/AdminAplikacija`, `src/app/core` i `src/app/shared`.
- `src/Frontend/Frontend_Korisnik` - Angular 21 turisticka aplikacija. Serve port je `4201`; koristi mapu, filtere, korisnicke naloge, sacuvane lokacije i chat.
- `src/MCP` - ASP.NET Core MCP/chat servis. Frontend environment trenutno pokazuje na `http://localhost:5200`, dok `launchSettings.json` za HTTP profil izlaze `http://localhost:5001`; proveri uskladjenost porta kada testiras chat/MCP.
- `src/Recommended` - kanonski kod za recommendation funkcionalnosti. Backend fajlovi odavde su linkovani u `TouristGuide.Api.csproj`; menjaj kanonske fajlove ovde kada radis recommendation logiku.
- `src/Shared` - deljeni ugovori, ukljucujuci AI/tourism DTO-e koje koriste API i MCP.
- `docs` - dokumentacija projekta na srpskom.
- `sandbox` - demo i studentski eksperimenti. Ne diraj ga osim ako korisnik to izricito trazi.

## Pre rada

- Prvo proveri `git status --short`. Ovaj checkout cesto ima tudje lokalne izmene; nemoj ih revertovati i nemoj refaktorisati nepovezane fajlove.
- Drzi izmene usko vezane za trazeni backend, admin frontend, korisnicki frontend ili MCP deo.
- Ne dodaj generisane foldere i artefakte: `bin/`, `obj/`, `dist/`, `.angular/`, `node_modules/`, log fajlove.
- Ne dodaj nove realne tajne, API kljuceve ili kredencijale u repo. Koristi environment varijable, user-secrets ili lokalnu ignorisanu konfiguraciju kada je moguce.

## Komande

Backend API:

```powershell
Set-Location src\Backend\TouristGuide.Api
dotnet restore
dotnet build .\TouristGuide.Api.csproj -p:UseAppHost=false
dotnet run --launch-profile http
dotnet ef database update
```

Admin frontend:

```powershell
Set-Location src\Frontend\Frontend_Admin
npm install
npm run build
npm start
```

Korisnicki frontend:

```powershell
Set-Location src\Frontend\Frontend_Korisnik
npm install
npm run build
npm start
```

MCP servis:

```powershell
Set-Location src\MCP
dotnet restore
dotnet build .\Mcp.csproj -p:UseAppHost=false
dotnet run --launch-profile http
```

Za proveru promena koristi najuzi smisleni skup:

- Backend promena: `dotnet build .\TouristGuide.Api.csproj -p:UseAppHost=false`.
- Admin frontend promena: `npm run build` u `src/Frontend/Frontend_Admin`.
- Korisnicki frontend promena: `npm run build` u `src/Frontend/Frontend_Korisnik`.
- MCP promena: `dotnet build .\Mcp.csproj -p:UseAppHost=false`.

Angular `npm test` postoji u oba frontenda, ali zavisi od lokalnog test/browser okruzenja; pokreni ga kada dodajes ili menjas testabilnu logiku i okruzenje to podrzava.

## Backend smernice

- Projekat koristi nullable reference types i implicit usings. Prati postojece ASP.NET Core 8 obrasce.
- Kontroleri su u `Controllers/`, DTO-i u `DTOs/`, EF modeli u `Models/`, `AppDbContext` i seeding u `Data/`/`Services/DatabaseSeeder.cs`, a poslovna logika u `Services/`.
- Za promene seme baze azuriraj model, `AppDbContext` relacije ako treba, napravi EF migraciju iz API projekta i proveri `AppDbContextModelSnapshot`.
- Ako seed podaci zavise od nove seme ili novog toka, azuriraj `DatabaseSeeder.cs`.
- Postuj postojece auth tokove: admin/superadmin JWT, turisticka autentifikacija, email verifikacija i SignalR grupe (`superadmins`, `admin_{id}`).
- Ne zaobilazi postojece servise za Cloudinary, email, notifikacije, lozinke i JWT osim ako refaktor direktno trazi to.
- Recommendation backend fajlovi su linkovani iz `src/Recommended/Backend`; tamo je izvor istine.

## Frontend smernice

- Oba frontenda su Angular 21 sa strict TypeScript podesavanjima. Koristi 2 razmaka i single quotes, u skladu sa lokalnim `.editorconfig`.
- Preferiraj standalone komponente, direktive i pipe-ove, sto je vecinski obrazac u projektu.
- Admin app koristi path aliase `@env/*`, `@core/*`, `@shared/*` i `@admin/*`; koristi ih umesto dubokih relativnih importova kada odgovara.
- Korisnicki app ima alias `@recommended/*` za deljeni recommendation frontend kod.
- API URL-ove citaj iz `src/environments/environment*.ts`; nemoj hard-kodovati `localhost` u komponentama ili servisima.
- HTTP pozive drzi u servisima i pusti postojece interceptore da dodaju auth zaglavlja.
- Za novi korisnicki tekst proveri i azuriraj `src/assets/i18n/*.json` u relevantnoj aplikaciji. Projekat koristi DOM-based prevode i jezicke assete.
- Kod za mape treba da prati postojece Leaflet obrasce i da cisti markere/layer-e/subscription-e kada se komponenta unisti.
- U admin aplikaciji stavljaj domenske stranice u `AdminAplikacija`, shared UI u `shared`, a cross-cutting servise/modele/auth u `core`.

## Konfiguracija i baza

- Backend ocekuje PostgreSQL 15+ i konekciju u `src/Backend/TouristGuide.Api/appsettings.json` ili environment override-u.
- Lokalni API URL koji koriste frontendi je `http://localhost:5125/api`.
- Admin aplikacija podrzava mock mode kroz `Frontend_Admin/src/environments/environment.ts` (`useMocks: true`) za rad bez baze.
- Cloudinary i email konfiguracija mogu biti nepotpuni u lokalnom developmentu; nemoj lomiti ostatak aplikacije kada eksterni servis nije konfigurisan.

## Kada zavrsavas promenu

- Pokreni relevantan build/test za deo koji si menjao ili jasno navedi zasto nije pokrenut.
- Proveri da nisi slucajno izmenio lock fajlove, snapshot, migracije ili environment fajlove bez potrebe.
- U finalnom izvestaju navedi najvaznije fajlove i komande koje su prosle ili nisu mogle da se pokrenu.
