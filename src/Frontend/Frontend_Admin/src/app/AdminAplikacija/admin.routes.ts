import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { RoleGuard } from '../core/auth/role.guard';
import { PermissionGuard } from '../core/auth/permission.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadChildren: () => import('./dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES) },
      // ── Sadržaj ──────────────────────────────────────────────────────
      { path: 'lokacije', canActivate: [PermissionGuard], data: { permissions: ['manage_own_posts'] }, loadChildren: () => import('./objects/objects.routes').then(m => m.OBJECTS_ROUTES) },
      { path: 'aktivnosti', canActivate: [PermissionGuard], data: { permissions: ['manage_tags'] }, loadChildren: () => import('./aktivnosti/aktivnosti.routes').then(m => m.AKTIVNOSTI_ROUTES) },
      { path: 'events', canActivate: [PermissionGuard], data: { permissions: ['manage_own_posts'] }, loadChildren: () => import('./events/events.routes').then(m => m.EVENTS_ROUTES) },
      { path: 'reviews', canActivate: [PermissionGuard], data: { permissions: ['manage_reviews'] }, loadChildren: () => import('./reviews/reviews.routes').then(m => m.REVIEWS_ROUTES) },
      { path: 'routes-management', canActivate: [PermissionGuard], data: { permissions: ['manage_own_posts'] }, loadChildren: () => import('./routes-management/routes-management.routes').then(m => m.ROUTES_MGMT_ROUTES) },
      { path: 'turisti', canActivate: [PermissionGuard], data: { permissions: ['view_tourists'] }, loadChildren: () => import('./turisti/turisti.routes').then(m => m.TURISTI_ROUTES) },
      { path: 'destinations', loadChildren: () => import('./destinations/destinations.routes').then(m => m.DESTINATIONS_ROUTES) },
      // ── Administracija (samo superadmin) ──────────────────────────────
      { path: 'users', canActivate: [RoleGuard], data: { roles: ['superadmin'] }, loadChildren: () => import('./users/users.routes').then(m => m.USERS_ROUTES) },
      { path: 'zahtevi', canActivate: [RoleGuard], data: { roles: ['superadmin'] }, loadChildren: () => import('./zahtevi/zahtevi.routes').then(m => m.ZAHTEVI_ROUTES) },
      { path: 'permissions', canActivate: [RoleGuard], data: { roles: ['superadmin'] }, loadChildren: () => import('./permissions/permissions.routes').then(m => m.PERMISSIONS_ROUTES) },
      // ── Ostalo ───────────────────────────────────────────────────────
      { path: 'map-admin', loadChildren: () => import('./map-admin/map-admin.routes').then(m => m.MAP_ADMIN_ROUTES) },
      { path: 'profile', loadChildren: () => import('./profile/profile.routes').then(m => m.PROFILE_ROUTES) },
      // ── Legacy redirecti ─────────────────────────────────────────────
      { path: 'analytics', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'turisti-list', redirectTo: 'turisti', pathMatch: 'full' },
      { path: 'objects', redirectTo: 'lokacije' },
    ],
  },
];
