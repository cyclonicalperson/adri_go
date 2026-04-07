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
      // ── Main menu ───────────────────────────────────────────────────
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
      // ── Administracija ──────────────────────────────────────────────
      {
        path: 'users',
        canActivate: [RoleGuard],
        data: { roles: ['ADMIN'] },
        loadChildren: () =>
          import('./users/users.routes').then(m => m.USERS_ROUTES),
      },
      {
        path: 'permissions',
        canActivate: [RoleGuard],
        data: { roles: ['ADMIN'] },
        loadChildren: () =>
          import('./permissions/permissions.routes').then(m => m.PERMISSIONS_ROUTES),
      },
      // ── Analitika ───────────────────────────────────────────────────
      {
        path: 'analytics',
        loadChildren: () =>
          import('./analytics/analytics.routes').then(m => m.ANALYTICS_ROUTES),
      },
      {
        path: 'turisti',
        loadChildren: () =>
          import('./turisti/turisti.routes').then(m => m.TURISTI_ROUTES),
      },
      // ── Map ─────────────────────────────────────────────────────────
      {
        path: 'map-admin',
        loadChildren: () =>
          import('./map-admin/map-admin.routes').then(m => m.MAP_ADMIN_ROUTES),
      },
      // ── Superadmin: zahtevi za admin nalog ──────────────────────────
      {
        path: 'admin-requests',
        canActivate: [RoleGuard],
        data: { roles: ['ADMIN'] },
        loadChildren: () =>
          import('./admin-requests/admin-requests.routes').then(m => m.ADMIN_REQUESTS_ROUTES),
      },
      // ── Legacy redirects ────────────────────────────────────────────
      {
        path: 'destinations',
        redirectTo: 'lokacije',
        pathMatch: 'full',
      },
      {
        path: 'objects',
        redirectTo: 'lokacije',
      },
    ],
  },
];
