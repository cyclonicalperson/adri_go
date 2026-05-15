import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Tourist {
  id: number;
  name: string;
  email: string;
  language?: string;
  isEmailVerified?: boolean;
  profileImage?: string | null;
  authProvider?: 'google' | 'apple' | 'password' | string;
}

export type AuthProvider = 'password' | 'google' | 'apple';

export interface StoredSession {
  tourist: Tourist;
  token: string;
  expiresAtUtc?: string | null;
  authProvider?: AuthProvider;
}

export interface TouristAuthResponse {
  token: string;
  expiresAtUtc: string;
  user: Tourist;
}

export interface TouristRegistrationResponse {
  requiresEmailVerification: boolean;
  message: string;
  email: string;
  session: TouristAuthResponse | null;
}

export interface VerifyEmailResponse {
  message: string;
  alreadyVerified?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authApiUrl = `${environment.apiUrl}/tourist-auth`;

  private readonly sessionSubject = new BehaviorSubject<StoredSession | null>(this.loadFromStorage());
  public readonly tourist$ = this.sessionSubject.asObservable();

  constructor(private http: HttpClient) {}

  register(
    name: string,
    email: string,
    password: string,
    options?: { language?: string; interests?: string[]; profileImage?: string | null },
  ): Observable<TouristRegistrationResponse> {
    return this.http.post<any>(`${this.authApiUrl}/register`, {
      name,
      email,
      password,
      language: options?.language ?? 'en',
      interests: options?.interests ?? [],
      profileImage: options?.profileImage ?? null,
    }).pipe(
      map(res => this.mapRegistrationResponse(res)),
      tap(res => {
        if (res.session) {
          this.saveAuthSession(res.session, 'password');
        }
      }),
    );
  }

  login(email: string, password: string): Observable<TouristAuthResponse> {
    return this.http.post<any>(`${this.authApiUrl}/login`, { email, password }).pipe(
      map(res => this.mapAuthResponse(res)),
      tap(res => this.saveAuthSession(res, 'password')),
    );
  }

  socialLogin(
    provider: 'google' | 'apple',
    credential: string,
    displayName?: string,
  ): Observable<TouristAuthResponse> {
    return this.http
      .post<any>(`${this.authApiUrl}/social-login`, { provider, credential, displayName })
      .pipe(
        map(res => {
          const mapped = this.mapAuthResponse(res);
          return {
            ...mapped,
            user: {
              ...mapped.user,
              authProvider: provider,
            },
          };
        }),
        tap(res => this.saveAuthSession(res)),
      );
  }

  registerWithToken(
    name: string,
    email: string,
    password: string,
    language = 'en',
    interests: string[] = [],
  ): Observable<TouristRegistrationResponse> {
    return this.register(name, email, password, { language, interests });
  }

  uploadProfileImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${environment.apiUrl}/images/upload/profile`, formData).pipe(
      map(res => res.url),
    );
  }

  loginWithToken(email: string, password: string): Observable<TouristAuthResponse> {
    return this.login(email, password);
  }

  verifyEmail(token: string): Observable<VerifyEmailResponse> {
    const params = new HttpParams().set('token', token);
    return this.http.get<VerifyEmailResponse>(`${this.authApiUrl}/verify-email`, { params });
  }

  resendVerification(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.authApiUrl}/resend-verification`, { email });
  }

  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.authApiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string; expired?: boolean }> {
    return this.http.post<{ message: string; expired?: boolean }>(`${this.authApiUrl}/reset-password`, {
      token,
      newPassword,
    });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.authApiUrl}/change-password`, {
      currentPassword,
      newPassword,
    });
  }

  deleteAccount(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.authApiUrl}/account`);
  }

  logout(): void {
    localStorage.removeItem('tourist_session');
    localStorage.removeItem('tourist');
    this.sessionSubject.next(null);
  }

  updateCurrentTourist(patch: Partial<Tourist>): void {
    const session = this.sessionSubject.value;
    if (!session) {
      return;
    }

    const nextSession: StoredSession = {
      ...session,
      tourist: {
        ...session.tourist,
        ...patch,
      },
    };

    localStorage.setItem('tourist_session', JSON.stringify(nextSession));
    this.sessionSubject.next(nextSession);
  }

  get currentTourist(): Tourist | null {
    return this.sessionSubject.value?.tourist ?? null;
  }

  get touristId(): number | null {
    return this.sessionSubject.value?.tourist?.id ?? null;
  }

  get token(): string {
    return this.sessionSubject.value?.token ?? '';
  }

  get isLoggedIn(): boolean {
    return !!this.sessionSubject.value?.token;
  }

  get authProvider(): AuthProvider {
    return this.sessionSubject.value?.authProvider ?? 'password';
  }

  get isGoogleAccount(): boolean {
    return this.authProvider === 'google';
  }

  private mapRegistrationResponse(res: any): TouristRegistrationResponse {
    const session = res?.session
      ? this.mapAuthResponse(res.session)
      : this.extractSession(res);

    return {
      requiresEmailVerification: res?.requiresEmailVerification ?? !session,
      message: res?.message ?? (session ? 'Registration successful.' : 'Check your email to continue.'),
      email: res?.email ?? session?.user.email ?? '',
      session,
    };
  }

  private extractSession(res: any): TouristAuthResponse | null {
    if (!res || (!res.token && !res.accessToken)) {
      return null;
    }

    return this.mapAuthResponse(res);
  }

  private mapAuthResponse(res: any): TouristAuthResponse {
    const rawUser = res?.user ?? res?.tourist ?? {};

    return {
      token: res?.token ?? res?.accessToken ?? '',
      expiresAtUtc: res?.expiresAtUtc ?? res?.expiresAt ?? '',
      user: {
        id: rawUser?.id ?? rawUser?.Id ?? 0,
        name: rawUser?.name ?? rawUser?.Name ?? '',
        email: rawUser?.email ?? rawUser?.Email ?? '',
        language: rawUser?.language ?? rawUser?.Language ?? undefined,
        isEmailVerified: rawUser?.isEmailVerified ?? rawUser?.IsEmailVerified ?? undefined,
        profileImage: rawUser?.profileImage ?? rawUser?.ProfileImage ?? null,
        authProvider: rawUser?.authProvider ?? rawUser?.AuthProvider ?? res?.authProvider ?? res?.provider ?? 'password',
      },
    };
  }

  private saveAuthSession(response: TouristAuthResponse, authProvider: AuthProvider = 'password'): void {
    const session: StoredSession = {
      tourist: response.user,
      token: response.token,
      expiresAtUtc: response.expiresAtUtc || null,
      authProvider,
    };

    localStorage.setItem('tourist_session', JSON.stringify(session));
    this.sessionSubject.next(session);
  }

  private loadFromStorage(): StoredSession | null {
    try {
      const stored = localStorage.getItem('tourist_session');
      if (stored) {
        const parsed = JSON.parse(stored) as StoredSession;
        if (parsed?.tourist?.id && parsed?.token) {
          return parsed;
        }
      }
      localStorage.removeItem('tourist');
      return null;
    } catch {
      return null;
    }
  }
}
