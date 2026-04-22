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
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
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
  permissions?: string[];  // Nova polja iz backenda (permission codes)
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

  currentUser$ = this._currentUser$.asObservable();

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<any>(`${this.apiUrl}/login`, payload).pipe(
      map(res => {
        // Backend (pravi): { token, expiresAtUtc, user: { id, fullName, email, role, ... } }
        // Mock:            { accessToken, user: { userId, ... } }
        const raw = res.user ?? {};
        const user: AuthUser = {
          userId: raw.userId ?? raw.id ?? raw.Id ?? 0,
          fullName: raw.fullName ?? raw.FullName ?? '',
          email: raw.email ?? raw.Email ?? '',
          role: (raw.role ?? raw.Role ?? 'admin') as AdminRole,
          organizationId: raw.organizationId ?? raw.OrganizationId ?? null,
          isIndividual: raw.isIndividual ?? raw.IsIndividual ?? true,
          accountStatus: (raw.accountStatus ?? raw.AccountStatus ?? 'active') as any,
          permissions: raw.permissions ?? raw.Permissions ?? [],
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

  hasPermission(code: string): boolean {
    return this.isSuperAdmin || (this.currentUser?.permissions?.includes(code) ?? false);
  }
}
