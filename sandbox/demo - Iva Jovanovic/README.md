# EventHub Demo Project

This repository contains a simple full-stack demo application built for learning how MySQL, ASP.NET Core Web API, and Angular work together.

The application concept is an Event Management system with:

- a public area for browsing events and registering without login
- an admin area for logging in, managing events, and viewing registrations

The project is intentionally small and clean so it is easy to study, run locally, and push to git.

## Technologies

- MySQL Community Server
- ASP.NET Core Web API
- Entity Framework Core with MySQL provider
- Angular with routing, services, and route guard

## Project Structure

- `sandbox/event-demo/backend`
  ASP.NET Core Web API
- `sandbox/event-demo/frontend`
  Angular application
- `sandbox/event-demo/database`
  SQL scripts for schema and seed data

## Database Setup

1. Make sure MySQL is installed and running on `localhost:3306`.
2. Update the backend connection string if needed in:
   - `sandbox/event-demo/backend/appsettings.json`
   - `sandbox/event-demo/backend/appsettings.Development.json`
3. Import the SQL scripts in this order:
   - `sandbox/event-demo/database/init.sql`
   - `sandbox/event-demo/database/seed.sql`

Example using MySQL CLI:

```powershell
Get-Content '.\sandbox\event-demo\database\init.sql' | mysql -u root -p
Get-Content '.\sandbox\event-demo\database\seed.sql' | mysql -u root -p
```

Database used by the project:

- `event_demo_db`

## Backend Configuration

The backend is configured to connect to:

- server: `localhost`
- port: `3306`
- database: `event_demo_db`

Current local setup in `appsettings.json` uses:

- user: `root`
- password: `admin`

If your MySQL password is different, update the connection string before running the backend.

## Running The Backend

Open a terminal in the repository root and run:

```powershell
Set-Location '.\sandbox\event-demo\backend'
dotnet restore
dotnet run
```

Backend URL:

- `http://localhost:5000`

## Running The Frontend

Open a second terminal in the repository root and run:

```powershell
Set-Location '.\sandbox\event-demo\frontend'
npm install
npm start
```

Frontend URL:

- `http://localhost:4200`

## Run Everything

From the repository root you can use:

- `.\start-all.ps1`
- `start-all.bat`

These scripts start:

- backend from `sandbox/event-demo/backend`
- frontend from `sandbox/event-demo/frontend`

## Admin Credentials

- username: `admin`
- password: `admin`

## How To Use The App

Public area:

1. Open `http://localhost:4200`
2. Browse events on the homepage or `/events`
3. Open an event details page
4. Register using full name and email

Admin area:

1. Open `http://localhost:4200/admin`
2. Log in with `admin / admin`
3. Use the dashboard to view summary statistics
4. Manage events from `/admin/events`
5. View registrations for each event

## Notes

- Public users do not create accounts.
- Admin authentication is intentionally simple for educational purposes.
- The project is structured like a small production-style app, but kept simple enough for learning.
