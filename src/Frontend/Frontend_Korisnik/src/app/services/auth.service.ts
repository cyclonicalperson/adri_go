import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';

export interface Tourist {
  id: number;
  name: string;
  email: string;
}

interface StoredSession {
  tourist: Tourist;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = 'http://localhost:5125/api';

  private sessionSubject = new BehaviorSubject<StoredSession | null>(this.loadFromStorage());
  public tourist$ = this.sessionSubject.asObservable();

  constructor(private http: HttpClient) {}

  // POST /api/tourists/register  → { tourist: { id, name, email } }
  // NOTE: TouristController does NOT return a JWT — it's a simple session.
  // We store the tourist object and use a fake token placeholder until
  // the backend is updated to return tokens. The interceptor only sends
  // the header when a real token exists.
  register(name: string, email: string, password: string): Observable<{ tourist: Tourist }> {
    return this.http
      .post<{ tourist: Tourist }>(`${this.apiUrl}/tourists/register`, { name, email, password })
      .pipe(tap(res => this.saveSession(res.tourist, '')));
  }

  // POST /api/tourists/login → { tourist: { id, name, email } }
  login(email: string, password: string): Observable<{ tourist: Tourist }> {
    return this.http
      .post<{ tourist: Tourist }>(`${this.apiUrl}/tourists/login`, { email, password })
      .pipe(tap(res => this.saveSession(res.tourist, '')));
  }

  // POST /api/tourist-auth/login → { token, user: { id, name, email, ... } }
  // This is the JWT-enabled endpoint from TouristAuthController
  loginWithToken(email: string, password: string): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/tourist-auth/login`, { email, password })
      .pipe(tap(res => {
        const tourist: Tourist = {
          id: res.user?.id ?? res.tourist?.id,
          name: res.user?.name ?? res.tourist?.name,
          email: res.user?.email ?? res.tourist?.email,
        };
        this.saveSession(tourist, res.token ?? '');
      }));
  }

  registerWithToken(name: string, email: string, password: string): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/tourist-auth/register`, { name, email, password })
      .pipe(tap(res => {
        const tourist: Tourist = {
          id: res.user?.id ?? res.tourist?.id,
          name: res.user?.name ?? res.tourist?.name,
          email: res.user?.email ?? res.tourist?.email,
        };
        this.saveSession(tourist, res.token ?? '');
      }));
  }

  logout(): void {
    localStorage.removeItem('tourist_session');
    this.sessionSubject.next(null);
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
    return this.sessionSubject.value !== null;
  }

  private saveSession(tourist: Tourist, token: string): void {
    const session: StoredSession = { tourist, token };
    localStorage.setItem('tourist_session', JSON.stringify(session));
    this.sessionSubject.next(session);
  }

  private loadFromStorage(): StoredSession | null {
    try {
      const stored = localStorage.getItem('tourist_session');
      if (stored) return JSON.parse(stored);
      // Migrate old format
      const old = localStorage.getItem('tourist');
      if (old) {
        const tourist = JSON.parse(old);
        return { tourist, token: '' };
      }
      return null;
    } catch {
      return null;
    }
  }
}
