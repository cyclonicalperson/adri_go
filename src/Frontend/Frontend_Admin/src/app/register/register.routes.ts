import { Routes } from '@angular/router';
import { RegisterComponent } from './register.component';
import { RegisterVerifyEmailComponent } from './register-verify-email.component';

export const REGISTER_ROUTES: Routes = [
  { path: 'verify-email', component: RegisterVerifyEmailComponent },
  { path: '', component: RegisterComponent },
];
