import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService, AdminRole } from './auth.service';

/**
 * Usage in routes:
 *   canActivate: [RoleGuard],
 *   data: { roles: ['superadmin'] }          // Super Admin only
 *   data: { roles: ['superadmin', 'admin'] } // Both roles
 */
export const RoleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowed: AdminRole[] = route.data['roles'] ?? [];

  if (auth.isLoggedIn && auth.isRole(...allowed)) {
    return true;
  }

  router.navigate(['/admin/dashboard']);
  return false;
};
