import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

type PermissionCheck = {
  code: string;
  scope?: 'any' | 'global';
};

export const PermissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const permissionChecks = (route.data['permissionChecks'] ?? []) as PermissionCheck[];
  const permissionMode = route.data['permissionMode'] === 'all' ? 'all' : 'any';
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

  return auth.ensurePermissionsLoaded().pipe(map(() => {
    if (permissionChecks.length > 0) {
      const allowed = permissionMode === 'all'
        ? permissionChecks.every(check => hasPermission(auth, check))
        : permissionChecks.some(check => hasPermission(auth, check));

      if (allowed) {
        return true;
      }

      router.navigate(['/admin/dashboard']);
      return false;
    }

    if (requiredPermissions.length === 0) {
      if (allPermissions.length > 0 && !allPermissions.every(code => auth.hasPermissionInAnyScope(code))) {
        router.navigate(['/admin/dashboard']);
        return false;
      }

      if (anyPermissions.length > 0 && !anyPermissions.some(code => auth.hasPermissionInAnyScope(code))) {
        router.navigate(['/admin/dashboard']);
        return false;
      }

      return true;
    }

    const requireAll = route.data['requireAll'] === true;
    const allowed = requireAll
      ? requiredPermissions.every(code => auth.hasPermissionInAnyScope(code))
      : requiredPermissions.some(code => auth.hasPermissionInAnyScope(code));

    const allAllowed = allPermissions.length === 0 || allPermissions.every(code => auth.hasPermissionInAnyScope(code));
    const anyAllowed = anyPermissions.length === 0 || anyPermissions.some(code => auth.hasPermissionInAnyScope(code));

    if (allowed && allAllowed && anyAllowed) {
      return true;
    }

    router.navigate(['/admin/dashboard']);
    return false;
  }));
};

function hasPermission(auth: AuthService, check: PermissionCheck): boolean {
  return check.scope === 'global'
    ? auth.hasGlobalPermission(check.code)
    : auth.hasPermissionInAnyScope(check.code);
}
