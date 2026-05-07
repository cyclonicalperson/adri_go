import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';
import { PublicGuard } from './core/auth/public.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canActivate: [PublicGuard],
    loadChildren: () =>
      import('./login/login.routes').then(m => m.LOGIN_ROUTES),
  },
  {
    path: 'register',
    canActivate: [PublicGuard],
    loadChildren: () =>
      import('./register/register.routes').then(m => m.REGISTER_ROUTES),
  },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./AdminAplikacija/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
