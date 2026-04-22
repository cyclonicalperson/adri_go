import { Routes } from '@angular/router';
import { EventsListComponent } from './components/event-list/events-list.component';
import { EventFormComponent } from './components/event-form/event-form.component';
import { PermissionGuard } from '../../core/auth/permission.guard';

export const EVENTS_ROUTES: Routes = [
  {
    path: '',
    component: EventsListComponent,
  },
  {
    path: 'new',
    canActivate: [PermissionGuard],
    data: { permissions: ['create_event'] },
    component: EventFormComponent,
  },
  {
    path: ':id/edit',
    component: EventFormComponent,
  },
];
