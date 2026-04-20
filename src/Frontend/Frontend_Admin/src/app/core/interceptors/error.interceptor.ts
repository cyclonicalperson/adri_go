import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenStorageService } from '../auth/token-storage.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const storage = inject(TokenStorageService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        // KRITIČNO: login zahtev ne sme biti preusmeren — obrađuje grešku sam.
        // Suspended admin dobija 401 sa { status: 'suspended' } — login.component
        // mora videti tu grešku, ne biti preusmjeren na /login gde već jeste.
        const isLoginRequest = req.url.includes('/auth/login');
        if (!isLoginRequest) {
          storage.clear();
          router.navigate(['/login']);
        }
      }

      if (err.status === 403) {
        router.navigate(['/login']);
      }

      // Propusti originalni HttpErrorResponse da komponente mogu čitati err.error?.status
      return throwError(() => err);
    })
  );
};
