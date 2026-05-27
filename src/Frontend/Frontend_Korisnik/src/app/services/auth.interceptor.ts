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

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Ako backend vrati 401, token je nevažeći (istekao, Google šifra promijenjena, itd.)
      // Brišemo lokalnu sesiju i šaljemo korisnika na login.
      if (error.status === 401 && authService.isLoggedIn) {
        authService.logout();
        router.navigate(['/login'], {
          queryParams: { reason: 'session_expired' }
        });
      }
      return throwError(() => error);
    })
  );
};
