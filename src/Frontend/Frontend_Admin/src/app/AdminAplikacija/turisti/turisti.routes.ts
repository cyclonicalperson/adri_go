import { Routes } from '@angular/router';
import { TuristiComponent } from './turisti.component';
import { TuristiDetaljiComponent } from './turisti-detalji/turisti-detalji.component';

export const TURISTI_ROUTES: Routes = [
  {
    path: '',
    component: TuristiComponent,
  },
  {
    path: ':id',
    component: TuristiDetaljiComponent,
  },
];
