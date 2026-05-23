/**
 * auth.service.ts
 *
 * Backend AuthController.Login vraća:
 *   { token: string, expiresAtUtc: string, user: { id, fullName, email, role, accountStatus, organizationId, isIndividual, permissions } }
 *
 * Ovaj servis normalizuje oba formata (mock i pravi backend).
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, finalize, map, of, shareReplay, take, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from './token-storage.service';

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Roles match DB ENUM: admin_user.role = ENUM('superadmin','admin')
 */
export type AdminRole = 'superadmin' | 'admin';

export interface AuthUser {
  userId: number;
  fullName: string;
  email: string;
  role: AdminRole;
  organizationId: number | null;
  isIndividual: boolean;
  accountStatus: 'active' | 'suspended' | 'pending';
  profileImage?: string | null;
  permissions?: string[];  // Nova polja iz backenda (permission codes)
  permissionGrants?: PermissionGrant[];
}

export interface PermissionGrant {
  code: string;
  regionId: number | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private tokenStorage = inject(TokenStorageService);

  private _currentUser$ = new BehaviorSubject<AuthUser | null>(
    this.tokenStorage.getUser() as AuthUser | null
  );

  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private permissionsSyncedForUserId: number | null = null;
  private permissionsLoad$?: Observable<AuthUser | null>;

  currentUser$ = this._currentUser$.asObservable();

  constructor() {
    this.ensurePermissionsLoaded().subscribe();
  }

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<any>(`${this.apiUrl}/login`, payload).pipe(
      map(res => {
        // Backend (pravi): { token, expiresAtUtc, user: { id, fullName, email, role, ... } }
        // Mock:            { accessToken, user: { userId, ... } }
        const raw = res.user ?? {};
        const rawPermissions = raw.permissions ?? raw.Permissions ?? [];
        const user: AuthUser = {
          userId: raw.userId ?? raw.id ?? raw.Id ?? 0,
          fullName: raw.fullName ?? raw.FullName ?? '',
          email: raw.email ?? raw.Email ?? '',
          role: (raw.role ?? raw.Role ?? 'admin') as AdminRole,
          organizationId: raw.organizationId ?? raw.OrganizationId ?? null,
          isIndividual: raw.isIndividual ?? raw.IsIndividual ?? true,
          accountStatus: (raw.accountStatus ?? raw.AccountStatus ?? 'active') as any,
          profileImage: raw.profileImage ?? raw.ProfileImage ?? null,
          permissions: this.extractPermissionCodes(rawPermissions),
          permissionGrants: this.extractPermissionGrants(raw.permissionGrants ?? raw.PermissionGrants ?? []),
        };
        return {
          accessToken: res.accessToken ?? res.token ?? res.Token ?? '',
          user,
        } as AuthResponse;
      }),
      tap(res => {
        // Suspended admin ne smije dobiti token
        if (res.user.accountStatus !== 'suspended') {
          this.tokenStorage.saveToken(res.accessToken);
          this.tokenStorage.saveUser(res.user);
          this._currentUser$.next(res.user);
          this.permissionsSyncedForUserId = null;
          this.permissionsLoad$ = undefined;
          this.ensurePermissionsLoaded(true).subscribe();
        }
      })
    );
  }

  logout(): void {
    this.tokenStorage.clear();
    this._currentUser$.next(null);
    this.router.navigate(['/login']);
  }

  get currentUser(): AuthUser | null {
    return this._currentUser$.value;
  }

  get isLoggedIn(): boolean {
    return !!this.tokenStorage.getToken();
  }

  get role(): AdminRole | null {
    return this.currentUser?.role ?? null;
  }

  isRole(...roles: AdminRole[]): boolean {
    return !!this.role && roles.includes(this.role);
  }

  get isSuperAdmin(): boolean {
    return this.role === 'superadmin';
  }

  hasPermission(code: string, regionId?: number | null): boolean {
    if (this.isSuperAdmin) {
      return true;
    }

    const user = this.currentUser;
    if (!user) {
      return false;
    }

    if (user.permissionGrants?.length) {
      return user.permissionGrants.some(grant =>
        grant.code === code && this.permissionGrantMatchesRegion(grant, regionId));
    }

    return user.permissions?.includes(code) ?? false;
  }

  hasAnyPermission(...codes: string[]): boolean {
    return this.isSuperAdmin || codes.some(code => this.hasPermission(code));
  }

  hasAnyPermissionForRegion(codes: string[], regionId?: number | null): boolean {
    return this.isSuperAdmin || codes.some(code => this.hasPermission(code, regionId));
  }

  hasGlobalPermission(code: string): boolean {
    return this.hasPermission(code, null);
  }

  hasPermissionInAnyScope(code: string): boolean {
    if (this.isSuperAdmin) {
      return true;
    }

    const user = this.currentUser;
    if (!user) {
      return false;
    }

    if (user.permissionGrants?.length) {
      return user.permissionGrants.some(grant => grant.code === code);
    }

    return user.permissions?.includes(code) ?? false;
  }

  ensurePermissionsLoaded(force = false): Observable<AuthUser | null> {
    const user = this._currentUser$.value;
    if (!user || user.role !== 'admin') {
      return of(user);
    }

    if (!force && this.permissionsSyncedForUserId === user.userId) {
      return of(user);
    }

    if (this.permissionsLoad$) {
      return this.permissionsLoad$;
    }

    this.permissionsLoad$ = this.http.get<any>(`${environment.apiUrl}/admin-users/${user.userId}/permissions`).pipe(
      map(res => {
        const grants = this.extractPermissionGrants(res.data ?? res ?? []);
        const permissionCodes = this.extractPermissionCodes(grants);
        const current = this._currentUser$.value;

        if (!current || current.userId !== user.userId) {
          return current;
        }

        return {
          ...current,
          permissions: permissionCodes,
          permissionGrants: grants,
        };
      }),
      catchError(() => of<AuthUser | null>(null)),
      tap(nextUser => {
        if (!nextUser || nextUser.userId !== user.userId) {
          return;
        }

        this.tokenStorage.saveUser(nextUser);
        this._currentUser$.next(nextUser);
        this.permissionsSyncedForUserId = user.userId;
      }),
      map(nextUser => nextUser ?? this._currentUser$.value),
      take(1),
      finalize(() => {
        this.permissionsLoad$ = undefined;
      }),
      shareReplay(1),
    );

    return this.permissionsLoad$;
  }

  private extractPermissionCodes(input: unknown): string[] {
    const values = Array.isArray(input) ? input : [];
    const codes = values
      .map(item => {
        if (typeof item === 'string') {
          return item;
        }

        const grant = item as any;
        return grant.code ?? grant.permissionCode ?? grant.permission?.code ?? grant.Permission?.Code;
      })
      .filter((code): code is string => typeof code === 'string' && code.trim().length > 0)
      .map(code => code.trim());

    return Array.from(new Set(codes));
  }

  private extractPermissionGrants(input: unknown): PermissionGrant[] {
    const values = Array.isArray(input) ? input : [];

    return values
      .map(item => {
        if (typeof item === 'string') {
          return null;
        }

        const grant = item as any;
        const code = grant.code ?? grant.permissionCode ?? grant.permission?.code ?? grant.Permission?.Code;
        if (typeof code !== 'string' || !code.trim()) {
          return null;
        }

        const rawRegionId = grant.regionId ?? grant.RegionId ?? null;
        const regionId = rawRegionId === null || rawRegionId === undefined
          ? null
          : Number(rawRegionId);

        return {
          code: code.trim(),
          regionId: typeof regionId === 'number' && Number.isFinite(regionId) ? regionId : null,
        };
      })
      .filter((grant): grant is PermissionGrant => !!grant);
  }

  private permissionGrantMatchesRegion(grant: PermissionGrant, regionId?: number | null): boolean {
    if (regionId === undefined) {
      return true;
    }

    if (grant.regionId === null) {
      return true;
    }

    if (regionId === null) {
      return false;
    }

    return grant.regionId === Number(regionId);
  }
}
