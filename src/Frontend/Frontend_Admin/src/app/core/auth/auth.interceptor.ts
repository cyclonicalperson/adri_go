import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorageService } from './token-storage.service';

/** Putanje koje ne trebaju Authorization header */
const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/tourist-auth/'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(TokenStorageService).getToken();

  // Ne dodaj token za javne endpointe
  const isPublic = PUBLIC_PATHS.some(p => req.url.includes(p));
  if (!token || isPublic) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authReq);
};
