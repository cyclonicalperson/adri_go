import { Routes } from '@angular/router';

// 1. Importi za Autentifikaciju
import { LoginComponent } from './Login/login.component';
import { ChooseRoleComponent } from './ChooseRole/choose-role.component';
import { RegisterProfileComponent } from './Register/register-profile.component';

// 2. Importi za Glavne ekrane
import { MapHomeComponent } from './MapHome/map-home.component';
import { LocationListComponent } from './Lokacije/location-list.component';
import { FiltersComponent } from './Filteri/filters.component';
import { LocationDetailsComponent } from './location-details/location-details';

// 3. Importi za stavke iz Bočnog menija (Side Menu)
import { AccountComponent } from './account/account';
import { SavedLocationsComponent } from './saved-locations/saved-locations';
import { CalendarComponent } from './calendar/calendar';
import { TicketsComponent } from './tickets/tickets';
import { NotificationsComponent } from './notifications/notifications';
import { SettingsComponent } from './settings/settings';

export const routes: Routes = [
  // POČETNA RUTA: Automatski te šalje na login ako je URL prazan
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // LOGIN & REGISTRACIJA
  { path: 'login', component: LoginComponent },
  { path: 'choose-role', component: ChooseRoleComponent },
  { path: 'register', component: RegisterProfileComponent },

  // MAPA I LISTA
  { path: 'map-home', component: MapHomeComponent },
  { path: 'location-list', component: LocationListComponent },
  { path: 'filters', component: FiltersComponent },
  
  // DETALJI LOKACIJE (sa parametrom :id)
  { path: 'location-details/:id', component: LocationDetailsComponent },

  // KORISNIČKI SERVISI (Stavke iz menija)
  { path: 'account', component: AccountComponent },
  { path: 'saved', component: SavedLocationsComponent },
  { path: 'calendar', component: CalendarComponent },
  { path: 'tickets', component: TicketsComponent },
  { path: 'notifications', component: NotificationsComponent },
  { path: 'settings', component: SettingsComponent },

  // WILDCARD RUTA: Mora biti poslednja u nizu! 
  // Ako korisnik ukuca bilo šta što ne postoji, šalje ga na login.
  { path: '**', redirectTo: '/login' }
];