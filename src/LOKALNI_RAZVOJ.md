# AdriGo — Lokalni razvoj

## Šta je izmenjeno (lokalni vs produkcija)

| Fajl | Lokalno | Produkcija |
|---|---|---|
| `Backend/appsettings.Development.json` | Port 5432, CORS localhost | *(ne postoji, ne šalje se)* |
| `Backend/appsettings.json` | *(nepromenjen — server)* | Port 5434, CORS pmf.kg.ac.rs |
| `MCP/appsettings.Development.json` | Backend=5125, CORS localhost | *(ne postoji, ne šalje se)* |
| `MCP/appsettings.json` | *(nepromenjen — server)* | Backend=10182, CORS pmf.kg.ac.rs |
| `MCP/Properties/launchSettings.json` | Port 5200 | port 5200 |
| `Frontend_Admin/environments/environment.ts` | useMocks=false, API=5125 | — |
| `Frontend_Admin/proxy.conf.json` | target=5125 | target=5125 |

---

## Pokretanje (redosled je bitan)

### 1. PostgreSQL
Lokalna instanca mora biti pokrenuta na **portu 5432** sa:
- Database: `globecode_baza`
- Username: `globecode`
- Password: `globecode#si2026`

Ako koristiš drugi port, izmeni `Host` u `appsettings.Development.json`.

### 2. Backend (.NET API) — port 5125
```
cd src/Backend/TouristGuide.Api
dotnet run --launch-profile http
```
Swagger: http://localhost:5125/swagger

### 3. MCP server — port 5200
```
cd src/MCP
dotnet run --launch-profile http
```

### 4. Frontend Admin — port 4200
```
cd src/Frontend/Frontend_Admin
npm install        # samo prvi put
ng serve
```
→ http://localhost:4200

### 5. Frontend Korisnik — port 4201
```
cd src/Frontend/Frontend_Korisnik
npm install        # samo prvi put
ng serve
```
→ http://localhost:4201

---

## Za vraćanje na server (produkcija)

`appsettings.Development.json` fajlovi se NE šalju na server jer ASP.NET Core ih
učitava samo kad je `ASPNETCORE_ENVIRONMENT=Development`. Na serveru je postavljeno
`Production`, pa se automatski koristi samo `appsettings.json` (originalni).

Jedino što treba ručno da se promeni pre deploja su environment fajlovi u Angularu
ako ih build koristi — ali pošto `ng build --configuration production` koristi
`environment.production.ts`, i to je automatski izolovano.

---

## Portovi (pregled)

| Servis | Lokalni port |
|---|---|
| Backend .NET API | 5125 |
| MCP server | 5200 |
| Frontend Admin | 4200 |
| Frontend Korisnik | 4201 |
| PostgreSQL | 5432 |
