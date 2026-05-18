import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const PermissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const singlePermission = route.data['permission'] as string | undefined;
  const multiplePermissions = (route.data['permissions'] ?? []) as string[];
  const allPermissions = (route.data['allPermissions'] ?? []) as string[];
  const anyPermissions = (route.data['anyPermissions'] ?? []) as string[];
  const requiredPermissions = [
    ...(singlePermission ? [singlePermission] : []),
    ...multiplePermissions,
  ].filter(Boolean);

  if (!auth.isLoggedIn) {
    router.navigate(['/login']);
    return false;
  }

  if (requiredPermissions.length === 0) {
    if (allPermissions.length > 0 && !allPermissions.every(code => auth.hasPermission(code))) {
      router.navigate(['/admin/dashboard']);
      return false;
    }

    if (anyPermissions.length > 0 && !auth.hasAnyPermission(...anyPermissions)) {
      router.navigate(['/admin/dashboard']);
      return false;
    }

    return true;
  }

  const requireAll = route.data['requireAll'] === true;
  const allowed = requireAll
    ? requiredPermissions.every(code => auth.hasPermission(code))
    : auth.hasAnyPermission(...requiredPermissions);

  const allAllowed = allPermissions.length === 0 || allPermissions.every(code => auth.hasPermission(code));
  const anyAllowed = anyPermissions.length === 0 || auth.hasAnyPermission(...anyPermissions);

  if (allowed && allAllowed && anyAllowed) {
    return true;
  }

  router.navigate(['/admin/dashboard']);
  return false;
};
