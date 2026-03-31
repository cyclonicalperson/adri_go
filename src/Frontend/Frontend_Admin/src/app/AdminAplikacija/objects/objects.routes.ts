import { Routes } from '@angular/router';
import { ObjectsListComponent } from './components/object-list/objects-list.component';
import { ObjectFormComponent } from './components/object-form/object-form.component';
import { ObjectDetailComponent } from './components/object-detail/object-detail.component';

export const OBJECTS_ROUTES: Routes = [
  {
    path: '',
    component: ObjectsListComponent,
  },
  {
    path: 'new',
    component: ObjectFormComponent,
  },
  {
    path: ':id/edit',
    component: ObjectFormComponent,
  },
  {
    path: ':id',
    component: ObjectDetailComponent,
  },
];
