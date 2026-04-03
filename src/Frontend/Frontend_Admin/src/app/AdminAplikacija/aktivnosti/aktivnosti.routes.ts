import { Routes } from '@angular/router';
import { AktivnostiListComponent } from './aktivnosti-list/aktivnosti-list.component';
import { AktivnostFormComponent } from './aktivnosti-form/aktivnost-form.component';

export const AKTIVNOSTI_ROUTES: Routes = [
  { path: '', component: AktivnostiListComponent },
  { path: 'new', component: AktivnostFormComponent },
  { path: ':id/edit', component: AktivnostFormComponent },
];
