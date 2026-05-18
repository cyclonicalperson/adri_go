import { Routes } from '@angular/router';
import { ObjectsListComponent } from './components/object-list/objects-list.component';
import { ObjectFormComponent } from './components/object-form/object-form.component';
import { ObjectDetailComponent } from './components/object-detail/object-detail.component';
import { PermissionGuard } from '../../core/auth/permission.guard';

const OBJECT_CREATE_PERMISSIONS = [
  'create_accommodation',
  'create_restaurant',
  'create_club',
  'create_cultural_site',
  'create_monument',
  'create_sports',
  'create_shop',
];

export const OBJECTS_ROUTES: Routes = [
  {
    path: '',
    component: ObjectsListComponent,
  },
  {
    path: 'new',
    canActivate: [PermissionGuard],
    data: {
      allPermissions: ['manage_own_posts'],
      anyPermissions: OBJECT_CREATE_PERMISSIONS,
    },
    component: ObjectFormComponent,
  },
  {
    path: ':id/edit',
    canActivate: [PermissionGuard],
    data: { permissions: ['manage_own_posts'] },
    component: ObjectFormComponent,
  },
  {
    path: ':id',
    component: ObjectDetailComponent,
  },
];
