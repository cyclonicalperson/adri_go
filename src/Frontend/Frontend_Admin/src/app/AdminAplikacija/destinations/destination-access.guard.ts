import { inject } from '@angular/core';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

export const DestinationAccessGuard: CanActivateFn = (_route, state: RouterStateSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn) {
    return router.createUrlTree(['/login']);
  }

  return auth.ensurePermissionsLoaded().pipe(map(() => {
    if (auth.isSuperAdmin) {
      return true;
    }

    if (auth.hasPermissionInAnyScope('manage_own_posts')) {
      return state.url.includes('/new')
        ? router.createUrlTree(['/admin/lokacije/new'])
        : router.createUrlTree(['/admin/lokacije']);
    }

    return router.createUrlTree(['/admin/dashboard']);
  }));
};
