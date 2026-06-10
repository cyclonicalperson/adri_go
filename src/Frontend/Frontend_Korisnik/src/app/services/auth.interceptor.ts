import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router      = inject(Router);
  const token       = authService.token;

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  // Javni endpointi koji mogu da vrate 401 bez aktivne sesije —
  // interceptor ih ne smije tretirati kao "sesija istekla".
  const PUBLIC_AUTH_ENDPOINTS = [
    '/forgot-password',
    '/reset-password',
    '/resend-verification',
    '/verify-email',
    '/login',
    '/register',
    '/social-login',
  ];

  const isPublicEndpoint = PUBLIC_AUTH_ENDPOINTS.some(path =>
    req.url.includes(path)
  );

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 429) {
        return throwError(() => new HttpErrorResponse({
          error: {
            message: error.error?.message || 'Too many requests. Please wait a moment and try again.',
          },
          headers: error.headers,
          status: error.status,
          statusText: error.statusText || 'Too Many Requests',
          url: error.url ?? undefined,
        }));
      }

      // Ako backend vrati 401, token je nevažeći (istekao, Google šifra promijenjena, itd.)
      // Brišemo lokalnu sesiju i šaljemo korisnika na login.
      // Javne rute (forgot-password, reset-password itd.) preskačemo — tamo korisnik
      // legitimno nema token i greška treba da stigne do komponente.
      if (error.status === 401 && authService.isLoggedIn && !isPublicEndpoint) {
        authService.logout();
        router.navigate(['/login'], {
          queryParams: { reason: 'session_expired' }
        });
      }
      return throwError(() => error);
    })
  );
};
