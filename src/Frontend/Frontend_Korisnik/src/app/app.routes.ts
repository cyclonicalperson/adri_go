import { Routes } from '@angular/router';

// 1. Importi za Autentifikaciju
import { LoginComponent } from './Login/login.component';
import { ChooseRoleComponent } from './ChooseRole/choose-role.component';
import { RegisterProfileComponent } from './Register/register-profile.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';

// 2. Importi za Glavne ekrane
import { MapHomeComponent } from './MapHome/map-home.component';
import { LocationListComponent } from './Lokacije/location-list.component';
import { FiltersComponent } from './Filteri/filters.component';
import { LocationDetailsComponent } from './location-details/location-details';

// 3. Importi za stavke iz Bočnog menija (Side Menu)
import { AccountComponent } from './account/account';
import { SavedLocationsComponent } from './saved-locations/saved-locations';
import { CalendarComponent } from './calendar/calendar';
import { NotificationsComponent } from './notifications/notifications';
import { SettingsComponent } from './settings/settings';

// 4. Importi za Account podstranice
import { PersonalInfoComponent } from './PersonalInfo/personal-info.component';
import { HelpComponent } from './Help/help.component';
import { PrivacyComponent } from './Privacy/privacy.component';
import { VerifyEmailComponent } from './verify-email/verify-email.component';

// 5. Read-only legal pages
import { TermsComponent } from './terms/terms.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';

// 6. OAuth callback (Google sign-in popup redirect target)
import { AuthCallbackComponent } from './auth-callback/auth-callback.component';

export const routes: Routes = [
  // POČETNA RUTA
  { path: '', redirectTo: '/map-home', pathMatch: 'full' },

  // LOGIN & REGISTRACIJA
  { path: 'login', component: LoginComponent },
  { path: 'choose-role', component: ChooseRoleComponent },
  { path: 'register', component: RegisterProfileComponent },
  { path: 'verify-email', component: VerifyEmailComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  // MAPA I LISTA
  { path: 'map-home', component: MapHomeComponent },
  { path: 'location-list', component: LocationListComponent },
  { path: 'filters', component: FiltersComponent },

  // DETALJI LOKACIJE
  { path: 'location-details/:id', component: LocationDetailsComponent },

  // KORISNIČKI SERVISI
  { path: 'account', component: AccountComponent },
  { path: 'saved', component: SavedLocationsComponent },
  { path: 'calendar', component: CalendarComponent },
  { path: 'notifications', component: NotificationsComponent },
  { path: 'settings', component: SettingsComponent },

  // ACCOUNT PODSTRANICE
  { path: 'account/personal-info', component: PersonalInfoComponent },
  { path: 'account/help', component: HelpComponent },
  { path: 'account/privacy', component: PrivacyComponent },

  // LEGALNI DOKUMENTI (read-only, bez user controls)
  { path: 'terms', component: TermsComponent },
  { path: 'privacy-policy', component: PrivacyPolicyComponent },

  // OAUTH CALLBACK — Google popup redirect target (must be before wildcard)
  { path: 'auth/callback', component: AuthCallbackComponent },

  // WILDCARD — mora biti poslednja
  { path: '**', redirectTo: '/map-home' }
];