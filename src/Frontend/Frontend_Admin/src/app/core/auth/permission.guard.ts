import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const PermissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const singlePermission = route.data['permission'] as string | undefined;
  const multiplePermissions = (route.data['permissions'] ?? []) as string[];
  const requiredPermissions = [
    ...(singlePermission ? [singlePermission] : []),
    ...multiplePermissions,
  ].filter(Boolean);

  if (!auth.isLoggedIn) {
    router.navigate(['/login']);
    return false;
  }

  if (requiredPermissions.length === 0) {
    return true;
  }

  const requireAll = route.data['requireAll'] === true;
  const allowed = requireAll
    ? requiredPermissions.every(code => auth.hasPermission(code))
    : auth.hasAnyPermission(...requiredPermissions);

  if (allowed) {
    return true;
  }

  router.navigate(['/admin/dashboard']);
  return false;
};
