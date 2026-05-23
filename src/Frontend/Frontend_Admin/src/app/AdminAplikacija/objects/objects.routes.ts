import { Routes } from '@angular/router';
import { ObjectsListComponent } from './components/object-list/objects-list.component';
import { ObjectFormComponent } from './components/object-form/object-form.component';
import { ObjectDetailComponent } from './components/object-detail/object-detail.component';
import { PermissionGuard } from '../../core/auth/permission.guard';

export const OBJECTS_ROUTES: Routes = [
  {
    path: '',
    component: ObjectsListComponent,
  },
  {
    path: 'new',
    canActivate: [PermissionGuard],
    data: {
      permissions: ['manage_own_posts'],
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
