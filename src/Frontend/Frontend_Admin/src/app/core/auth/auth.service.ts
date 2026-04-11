import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from './token-storage.service';

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Roles match DB ENUM: admin_user.role = ENUM('superadmin','admin')
 *
 *  'superadmin' — Super Administrator — pun pristup svemu
 *  'admin'      — Administrator      — pristup ograničen dozvolama i regionom
 */
export type AdminRole = 'superadmin' | 'admin';

export interface AuthUser {
  userId: number;
  fullName: string;
  email: string;
  role: AdminRole;
  organizationId: number | null;
  isIndividual: boolean;   // true = fizičko lice, false = organizacija
  accountStatus: 'active' | 'suspended' | 'pending';
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
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap(res => {
        this.tokenStorage.saveToken(res.accessToken);
        this.tokenStorage.saveUser(res.user);
        this._currentUser$.next(res.user);
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

  /** True if current user has at least one of the given roles */
  isRole(...roles: AdminRole[]): boolean {
    return !!this.role && roles.includes(this.role);
  }

  /** Convenience: true only for superadmin */
  get isSuperAdmin(): boolean {
    return this.role === 'superadmin';
  }
}
