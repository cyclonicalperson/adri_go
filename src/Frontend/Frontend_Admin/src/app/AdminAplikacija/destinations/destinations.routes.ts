import { Routes } from '@angular/router';
import { DestinationsListComponent } from './components/destinations-list/destinations-list.component';
import { DestinationFormComponent } from './components/destination-form/destination-form.component';
import { DestinationDetailComponent } from './components/destination-detail/destination-detail.component';
import { RoleGuard } from '../../core/auth/role.guard';

const SUPERADMIN_ONLY = {
  roles: ['superadmin'],
};

export const DESTINATIONS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [RoleGuard],
    data: SUPERADMIN_ONLY,
    component: DestinationsListComponent,
  },
  {
    path: 'new',
    canActivate: [RoleGuard],
    data: SUPERADMIN_ONLY,
    component: DestinationFormComponent,
  },
  {
    path: ':id/edit',
    canActivate: [RoleGuard],
    data: SUPERADMIN_ONLY,
    component: DestinationFormComponent,
  },
  {
    path: ':id',
    canActivate: [RoleGuard],
    data: SUPERADMIN_ONLY,
    component: DestinationDetailComponent,
  },
];
