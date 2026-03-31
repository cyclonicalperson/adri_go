import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./login/login.routes').then(m => m.LOGIN_ROUTES),
  },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./AdminAplikacija/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  /*{
    path: 'app',
    loadChildren: () =>
      import('./TuristiAplikacija/tourist.routes').then(m => m.TOURIST_ROUTES),
  },*/
  {
    path: '**',
    redirectTo: 'login',
  },
];
