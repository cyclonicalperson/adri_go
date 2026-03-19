import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app'; // <-- Promeni 'App' u 'AppComponent'

bootstrapApplication(AppComponent, appConfig) // <-- I ovde stavi 'AppComponent'
  .catch((err) => console.error(err));