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
        storage.clear();
        router.navigate(['/login']);
      }

      if (err.status === 403) {
        router.navigate(['/login']);
      }

      const message =
        err.error?.message ?? err.message ?? 'Nepoznata greška';

      return throwError(() => new Error(message));
    })
  );
};
