import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { RoleGuard } from '../core/auth/role.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES),
      },
      // ── Sadržaj ─────────────────────────────────────────────────────
      {
        path: 'lokacije',
        loadChildren: () =>
          import('./objects/objects.routes').then(m => m.OBJECTS_ROUTES),
      },
      {
        path: 'aktivnosti',
        loadChildren: () =>
          import('./aktivnosti/aktivnosti.routes').then(m => m.AKTIVNOSTI_ROUTES),
      },
      {
        path: 'events',
        loadChildren: () =>
          import('./events/events.routes').then(m => m.EVENTS_ROUTES),
      },
      {
        path: 'reviews',
        loadChildren: () =>
          import('./reviews/reviews.routes').then(m => m.REVIEWS_ROUTES),
      },
      // ── Rute ────────────────────────────────────────────────────────
      {
        path: 'routes-management',
        loadChildren: () =>
          import('./routes-management/routes-management.routes').then(m => m.ROUTES_MGMT_ROUTES),
      },
      // ── Turisti ──────────────────────────────────────────────────────
      {
        path: 'turisti',
        loadChildren: () =>
          import('./turisti/turisti.routes').then(m => m.TURISTI_ROUTES),
      },
      // ── Destinacije (standalone modul) ───────────────────────────────
      {
        path: 'destinations',
        loadChildren: () =>
          import('./destinations/destinations.routes').then(m => m.DESTINATIONS_ROUTES),
      },
      // ── Administracija (samo superadmin) ─────────────────────────────
      {
        path: 'users',
        canActivate: [RoleGuard],
        data: { roles: ['superadmin'] },
        loadChildren: () =>
          import('./users/users.routes').then(m => m.USERS_ROUTES),
      },
      {
        path: 'permissions',
        canActivate: [RoleGuard],
        data: { roles: ['superadmin'] },
        loadChildren: () =>
          import('./permissions/permissions.routes').then(m => m.PERMISSIONS_ROUTES),
      },
      // ── Mapa ────────────────────────────────────────────────────────
      {
        path: 'map-admin',
        loadChildren: () =>
          import('./map-admin/map-admin.routes').then(m => m.MAP_ADMIN_ROUTES),
      },
      // ── Profil ──────────────────────────────────────────────────────
      {
        path: 'profile',
        loadChildren: () =>
          import('./profile/profile.routes').then(m => m.PROFILE_ROUTES),
      },
      // ── Legacy redirecti ─────────────────────────────────────────────
      { path: 'analytics', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'turisti-list', redirectTo: 'turisti', pathMatch: 'full' },
      { path: 'objects', redirectTo: 'lokacije' },
    ],
  },
];
