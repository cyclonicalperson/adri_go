# AdriGo

A digital tourist map of Montenegro, built as separate applications for tourists and administrators, with a .NET backend, a PostgreSQL database, and an MCP/Gemini chat layer.

<p align="center">
  <img width="1920" height="873" alt="image" src="https://github.com/user-attachments/assets/fce1ee04-1a22-476f-8de2-212a89a4c1b5">
  <img width="1920" height="873" alt="image" src="https://github.com/user-attachments/assets/2f20411e-8223-4798-ac56-a2a97a2008d0" />
</p>

## Hosted Versions

| Component | URL |
| --- | --- |
| Tourist Frontend | https://softeng.pmf.kg.ac.rs:10187 |
| Admin Frontend | https://softeng.pmf.kg.ac.rs:10188 |
| Backend API | https://softeng.pmf.kg.ac.rs:10185/api |
| MCP / Chat Service | https://softeng.pmf.kg.ac.rs:10186 |

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Backend | ASP.NET Core 8, Entity Framework Core 8, PostgreSQL, SignalR |
| Admin Frontend | Angular 21, TypeScript, SCSS, Leaflet, Chart.js, SignalR |
| Tourist Frontend | Angular 21, TypeScript, Leaflet, Swiper, SignalR |
| AI / MCP | .NET MCP service, Gemini chat proxy |
| Uploads & Mail | Cloudinary, SMTP email service |

## Requirements

- **.NET 8 SDK**
- **Node.js 20+** and npm
- **Angular CLI 21+**
- **PostgreSQL 15+**
- **EF Core CLI**: `dotnet tool install --global dotnet-ef`

## Features

Tourist Frontend:
- **Account Management**: registration, login, email verification, and Google sign-in.
- **Interactive Map**: locations, activities, routes, and events.
- **Content Details**: reviews, likes, saving, and sharing.
- **Trip Planner**: personalized recommendations and notifications.
- **AI Chat**: Gemini-powered chat through the MCP/backend proxy.

Admin Frontend:
- **Dashboard**: statistics and analytics overview.
- **Content Management**: locations, activities, routes, events, and posts.
- **Moderation**: review moderation and tourist overview.
- **Admin Onboarding**: registration workflow for new admin accounts.
- **Access Control**: management of admins, permissions, regions, and organizations.
- **Real-Time Updates**: live notifications via SignalR.

Backend:
- **Authentication**: JWT-based auth with `superadmin`, `admin`, and `tourist` roles.
- **Database**: EF Core migrations, data seeding, and a PostgreSQL advisory lock during migrations.
- **Data Integrity**: indexes and safeguards for concurrent writes, especially for reviews/interactions.
- **Performance**: response compression, EF Core `DbContext` pooling, and a global rate limiter.
- **Integrations**: Cloudinary uploads, email links, and SignalR hubs.

## Usage

Each part of the system runs as a separate process and they are designed to work together: the backend exposes the REST API and database, the admin and tourist frontends consume that API, and the MCP service brokers the Gemini-powered chat instead of calling the Gemini API directly from the browser.

### - Local URLs -

| Component | Local URL |
| --- | --- |
| Backend API | http://localhost:5125/api |
| Swagger | http://localhost:5125/swagger |
| MCP / Chat Service | http://localhost:5200 |
| Admin Frontend | http://localhost:4200 |
| Tourist Frontend | http://localhost:4201 |

### - Configuration -

The most important settings live in:
- `src/Backend/TouristGuide.Api/appsettings.json`
- `src/Frontend/Frontend_Admin/src/environments/environment*.ts`
- `src/Frontend/Frontend_Korisnik/src/environments/environment*.ts`
- `src/MCP/appsettings*.json`

For local development, the backend runs on `http://localhost:5125`, the admin frontend on `http://localhost:4200`, the tourist frontend on `http://localhost:4201`, and the MCP/chat service on `http://localhost:5200`.

For production builds, the frontend environment files already point to the hosted URLs on the `softeng.pmf.kg.ac.rs` domain.

### - Resetting the Database -

```bash
cd src/Backend/TouristGuide.Api
dotnet ef database drop --force
dotnet ef database update
dotnet run
```

On startup, the backend automatically applies migrations and seeds data through `DatabaseSeeder`.

## FAQ

**- Why does the chat go through an MCP service instead of calling Gemini directly?**  
The browser never talks to the Gemini API directly. All chat requests are routed through the local/hosted MCP service, which keeps API keys server-side and lets the chat layer call backend tools on the user's behalf.

**- Which environment files do I need to edit for a local setup?**  
Only the `appsettings.json` / `environment*.ts` files listed under [Configuration](#--configuration--); the production files already target the hosted domain and don't need to be touched for local development.

## Installation

1. **Clone the repository**

```bash
git clone https://github.com/cyclonicalperson/adri_go.git
cd adri_go
```

2. **Set up PostgreSQL**

Make sure a PostgreSQL 15+ instance is running and reachable with the connection string configured in `src/Backend/TouristGuide.Api/appsettings.json`.

3. **Run the backend**

```bash
cd src/Backend/TouristGuide.Api
dotnet ef database update
dotnet run
```

4. **Run the admin frontend**

```bash
cd src/Frontend/Frontend_Admin
npm install
npm start
```

5. **Run the tourist frontend**

```bash
cd src/Frontend/Frontend_Korisnik
npm install
npm start
```

6. **Run the MCP/chat service** (required for the in-app AI chat)

```bash
cd src/MCP
dotnet run
```

**Quick Start (After Initial Setup):**

```bash
cd path\to\adri_go\src\Backend\TouristGuide.Api && dotnet run
cd path\to\adri_go\src\Frontend\Frontend_Admin && npm start
cd path\to\adri_go\src\Frontend\Frontend_Korisnik && npm start
cd path\to\adri_go\src\MCP && dotnet run
```

## Useful Commands

```bash
dotnet build src/Backend/TouristGuide.Api/TouristGuide.Api.csproj
npm run build --prefix src/Frontend/Frontend_Admin
npm run build --prefix src/Frontend/Frontend_Korisnik
```

## Directory Structure

```
adri_go/
├── docs/                              # Additional project documentation
├── src/
│   ├── Backend/TouristGuide.Api/      # .NET 8 REST API, EF Core, SignalR
│   ├── Frontend/Frontend_Admin/       # Angular admin panel
│   ├── Frontend/Frontend_Korisnik/    # Angular tourist portal
│   ├── MCP/                           # MCP and Gemini chat service
│   ├── Recommended/                   # Recommendations linked into the backend build
│   ├── Shared/                        # Shared DTO/contract files
│   └── Database/                      # Notes and SQL materials
├── logo.png                           # Project logo
└── logo-full-size.png                 # Full-size project logo
```

## Notes

- The backend is the source of truth for the API and database migrations.
- Production frontend URLs are already written into the production environment files.
- Chat requests never go straight from the browser to the Gemini API; they always pass through the local/hosted MCP service.
- Cloudinary and email configuration must be valid for upload and email flows to work.

## Contributing

Feel free to open issues or submit pull requests for improvements or bug fixes.
