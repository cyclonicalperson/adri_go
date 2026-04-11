import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from './token-storage.service';
import { inject } from '@angular/core';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    userId: number;
    fullName: string;
    email: string;
    role: 'ADMIN' | 'ORG' | 'TOURIST';
    organizationId: number | null;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private tokenStorage = inject(TokenStorageService);

  private _currentUser$ = new BehaviorSubject<AuthResponse['user'] | null>(
    this.tokenStorage.getUser()
  );

  private readonly apiUrl = `${environment.apiUrl}/auth`;

  currentUser$ = this._currentUser$.asObservable();

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap(res => {
        this.tokenStorage.saveToken((res as any).token);
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

  get currentUser(): AuthResponse['user'] | null {
    return this._currentUser$.value;
  }

  get isLoggedIn(): boolean {
    return !!this.tokenStorage.getToken();
  }

  get role(): string | null {
    return this.currentUser?.role ?? null;
  }

  isRole(...roles: string[]): boolean {
    return !!this.role && roles.includes(this.role);
  }
}
