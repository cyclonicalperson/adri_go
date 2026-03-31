import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const RoleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowed: string[] = route.data['roles'] ?? [];

  if (auth.isLoggedIn && auth.isRole(...allowed)) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
