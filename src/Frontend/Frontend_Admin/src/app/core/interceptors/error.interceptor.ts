import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenStorageService } from '../auth/token-storage.service';

/** Auth endpointi koji obrađuju greške sami — interceptor ih ne sme preusmeriti. */
const PUBLIC_AUTH_REQUEST_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-registration-email',
];

/** Prefiksi ruta na kojima korisnik nije autentifikovan — ne preusmeravaj ga na /login. */
const PUBLIC_PAGE_PREFIXES = ['/login', '/register'];

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const storage = inject(TokenStorageService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const isPublicAuthRequest = PUBLIC_AUTH_REQUEST_PATHS.some(p => req.url.includes(p));
      const isOnPublicPage = PUBLIC_PAGE_PREFIXES.some(p => router.url.startsWith(p));

      if (err.status === 401) {
        // KRITIČNO: javni auth endpointi (login, register, verify-email) i stranice bez
        // prijave ne smeju biti preusmerjeni — komponente obrađuju te greške same.
        // Suspended admin dobija 401 sa { status: 'suspended' } — login.component
        // mora videti tu grešku, ne biti preusmjeren na /login gde već jeste.
        if (!isPublicAuthRequest && !isOnPublicPage) {
          storage.clear();
          router.navigate(['/login']);
        }
      }

      // Propusti originalni HttpErrorResponse da komponente mogu čitati err.error?.status
      return throwError(() => err);
    })
  );
};
