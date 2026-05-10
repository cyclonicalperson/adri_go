import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Redirects already-logged-in users away from login/register to dashboard. */
export const PublicGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn) {
    router.navigate(['/admin/dashboard']);
    return false;
  }

  return true;
};
