import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { mockAuthInterceptor } from './core/interceptors/mock-auth.interceptor';
import { mockApiInterceptor } from './core/interceptors/mock-api.interceptor';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        // Mock interceptors run FIRST in development — they short-circuit
        // real HTTP calls and return fake data. Remove for production.
        ...(environment.production ? [] : [mockAuthInterceptor, mockApiInterceptor]),
        authInterceptor,
        errorInterceptor,
        loadingInterceptor,
      ])
    ),
  ],
};
