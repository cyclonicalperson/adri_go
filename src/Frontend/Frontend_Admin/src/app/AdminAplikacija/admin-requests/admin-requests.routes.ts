import { Routes } from '@angular/router';

export const ADMIN_REQUESTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-requests.component').then(m => m.AdminRequestsComponent),
  },
];
