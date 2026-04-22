import { HttpInterceptorFn, HttpContext, HttpContextToken } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

/** Postavi ovaj token na true da se zahtev ne prikaže u globalnom spinneru */
export const SILENT_REQUEST = new HttpContextToken<boolean>(() => false);

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  // Badge polling i pozadinski zahtevi ne zahtevaju global spinner
  if (req.context.get(SILENT_REQUEST)) {
    return next(req);
  }

  const loading = inject(LoadingService);
  loading.show();
  return next(req).pipe(finalize(() => loading.hide()));
};
