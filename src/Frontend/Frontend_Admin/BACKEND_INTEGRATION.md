# Integracija sa pravim backendom

## Šta je promenjeno

### 1. `src/app/app.config.ts`
Mock interceptori (`mockAuthInterceptor` i `mockApiInterceptor`) su **uklonjeni** iz liste
interceptora. Sav HTTP saobraćaj sada ide direktno ka pravom backendu.

### 2. `src/app/core/auth/auth.interceptor.ts` (nije menjano)
JWT token se automatski dodaje na **svaki** request kroz `Authorization: Bearer <token>` header.
Token se čuva u `localStorage` pod ključem `tg_access_token`.

### 3. `src/app/core/services/admin-registration.service.ts` ✨ NOVO
Service za upravljanje admin registration zahtevima:
- `getPending()` → `GET /api/admin-registration/pending`
- `approve(id)` → `POST /api/admin-registration/{id}/approve`
- `reject(id, reason)` → `POST /api/admin-registration/{id}/reject`

### 4. `src/app/AdminAplikacija/admin-requests/` ✨ NOVO
Komponenta sa listom pending zahteva + **Odobri** i **Odbij** dugmadima.
Dostupna na ruti `/admin/admin-requests` (samo za ADMIN rolu).

### 5. Sidebar
Dodat link "Admin zahtevi" u sidebar navigaciju.

## Servisi koji su već bili ispravno konfigurisani
- `AuthService` – login/logout ka `/api/auth/login`
- `UserService` – CRUD ka `/api/users`
- `AnalyticsService` – dashboard stats ka `/api/analytics`
- `ReviewService` – moderacija ka `/api/reviews`
- `ObjectService`, `EventService`, `DestinationService`, `RouteService`

## Backend URL
`environment.development.ts` → `http://localhost:5000/api`

Promeniti u `environment.ts` za produkciju.
