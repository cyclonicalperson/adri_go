import { Routes } from '@angular/router';
import { LoginComponent } from './Login/login.component';
import { NavigationComponent } from './Navigation/navigation.component';
import { FindStayScreenComponent } from './FindStay/find-stay-screen.component';
import { RezultatScreenComponent } from './ResultScreen/rezultat-screen.component'; 
// 1. Uvezi SelectedStay komponentu
import { SelectedStayComponent } from './SelectedStay/selected-stay.component'; 

export const routes: Routes = [
  {
    path: '', 
    redirectTo: 'login', 
    pathMatch: 'full' 
  },
  {
    path: 'login',
    component: LoginComponent
  },
  
  {
    path: 'admin',
    component: NavigationComponent, 
    children: [
      {
        path: '', 
        redirectTo: 'find-stay', 
        pathMatch: 'full'
      },
      {
        // Putanja: /admin/find-stay
        path: 'find-stay', 
        component: FindStayScreenComponent
      },
      {
        // Putanja: /admin/rezultati
        path: 'rezultati', 
        component: RezultatScreenComponent
      },
      {
        // 2. DODATA RUTA ZA DETALJE: Putanja: /admin/selected-stay
        path: 'selected-stay', 
        component: SelectedStayComponent
      }
      // Ovde možeš dodati ostale rute (omiljeno, profil...)
    ]
  },
  
  {
    path: '**',
    redirectTo: 'login',
  }
];