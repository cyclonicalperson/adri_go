import { Routes } from '@angular/router';

import { AdminLayoutComponent } from './components/admin-layout/admin-layout.component';
import { PublicLayoutComponent } from './components/public-layout/public-layout.component';
import { adminAuthGuard } from './guards/admin-auth.guard';
import { AdminDashboardPageComponent } from './pages/admin-dashboard-page/admin-dashboard-page.component';
import { AdminEventFormPageComponent } from './pages/admin-event-form-page/admin-event-form-page.component';
import { AdminEventsPageComponent } from './pages/admin-events-page/admin-events-page.component';
import { AdminLoginPageComponent } from './pages/admin-login-page/admin-login-page.component';
import { AdminRegistrationsPageComponent } from './pages/admin-registrations-page/admin-registrations-page.component';
import { EventDetailsPageComponent } from './pages/event-details-page/event-details-page.component';
import { EventsPageComponent } from './pages/events-page/events-page.component';
import { HomePageComponent } from './pages/home-page/home-page.component';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: HomePageComponent, title: 'EventHub | Home' },
      { path: 'events', component: EventsPageComponent, title: 'EventHub | Events' },
      { path: 'events/:id', component: EventDetailsPageComponent, title: 'EventHub | Event Details' }
    ]
  },
  {
    path: 'admin',
    children: [
      { path: '', component: AdminLoginPageComponent, title: 'EventHub Admin | Login' },
      {
        path: '',
        component: AdminLayoutComponent,
        canActivate: [adminAuthGuard],
        children: [
          { path: 'dashboard', component: AdminDashboardPageComponent, title: 'EventHub Admin | Dashboard' },
          { path: 'events', component: AdminEventsPageComponent, title: 'EventHub Admin | Events' },
          { path: 'events/new', component: AdminEventFormPageComponent, title: 'EventHub Admin | New Event' },
          { path: 'events/edit/:id', component: AdminEventFormPageComponent, title: 'EventHub Admin | Edit Event' },
          { path: 'events/:id/registrations', component: AdminRegistrationsPageComponent, title: 'EventHub Admin | Registrations' }
        ]
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
