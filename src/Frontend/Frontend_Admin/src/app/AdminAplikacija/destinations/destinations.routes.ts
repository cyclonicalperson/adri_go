import { Routes } from '@angular/router';
import { DestinationsListComponent } from './components/destinations-list/destinations-list.component';
import { DestinationFormComponent } from './components/destination-form/destination-form.component';
import { DestinationDetailComponent } from './components/destination-detail/destination-detail.component';

export const DESTINATIONS_ROUTES: Routes = [
  {
    path: '',
    component: DestinationsListComponent,
  },
  {
    path: 'new',
    component: DestinationFormComponent,
  },
  {
    path: ':id/edit',
    component: DestinationFormComponent,
  },
  {
    path: ':id',
    component: DestinationDetailComponent,
  },
];
