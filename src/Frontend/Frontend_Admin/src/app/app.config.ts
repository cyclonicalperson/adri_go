import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { mockAuthInterceptor } from './core/interceptors/mock-auth.interceptor';
import { mockApiInterceptor } from './core/interceptors/mock-api.interceptor';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideHttpClient(
            withInterceptors([
                // 🔹 Mock interceptori (prvi u nizu — hvataju request-e pre production interceptora)
                mockAuthInterceptor,  // Hvata /auth/login za mock autentifikaciju
                mockApiInterceptor,   // Hvata ostale API pozive za mock podatke
                // 🔹 Production interceptori
                authInterceptor,      // Dodaje Bearer token za prave API pozive
                errorInterceptor,     // Hvata 401/403 greške i redirect-uje na login
                loadingInterceptor,   // Pokazuje/skriva loading spinner
            ])
        ),
    ],
};