import { Routes } from '@angular/router';
import { RoutesListComponent } from './components/route-list/routes-list.component';
import { RouteFormComponent } from './components/route-form/route-form.component';
import { RouteDetailComponent } from './components/route-detail/route-detail.component';
import { PermissionGuard } from '../../core/auth/permission.guard';

export const ROUTES_MGMT_ROUTES: Routes = [
  {
    path: '',
    component: RoutesListComponent,
  },
  {
    path: 'new',
    canActivate: [PermissionGuard],
    data: {
      allPermissions: ['manage_own_posts'],
      permissions: ['create_route'],
    },
    component: RouteFormComponent,
  },
  {
    path: ':id/edit',
    canActivate: [PermissionGuard],
    data: { permissions: ['manage_own_posts'] },
    component: RouteFormComponent,
  },
  {
    path: ':id',
    component: RouteDetailComponent,
  },
];
