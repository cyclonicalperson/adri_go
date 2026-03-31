import { Routes } from '@angular/router';
import { RoutesListComponent } from './components/route-list/routes-list.component';
import { RouteFormComponent } from './components/route-form/route-form.component';

export const ROUTES_MGMT_ROUTES: Routes = [
  {
    path: '',
    component: RoutesListComponent,
  },
  {
    path: 'new',
    component: RouteFormComponent,
  },
  {
    path: ':id/edit',
    component: RouteFormComponent,
  },
];
