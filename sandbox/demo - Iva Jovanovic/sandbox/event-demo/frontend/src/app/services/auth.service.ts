import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { AdminLoginRequest, AdminLoginResponse, AdminSession } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'event-demo-admin-session';
  private readonly legacyStorage = localStorage;
  private readonly sessionStorageRef = sessionStorage;
  private readonly sessionSignal = signal<AdminSession | null>(this.readSession());

  constructor(private readonly http: HttpClient) {}

  get session() {
    return this.sessionSignal.asReadonly();
  }

  login(request: AdminLoginRequest): Observable<AdminLoginResponse> {
    return this.http
      .post<AdminLoginResponse>(`${environment.apiBaseUrl}/auth/login`, request)
      .pipe(tap((response) => this.storeSession(response)));
  }

  logout(): void {
    this.legacyStorage.removeItem(this.storageKey);
    this.sessionStorageRef.removeItem(this.storageKey);
    this.sessionSignal.set(null);
  }

  isAuthenticated(): boolean {
    const session = this.sessionSignal();

    if (!session) {
      return false;
    }

    if (new Date(session.expiresAtUtc).getTime() <= Date.now()) {
      this.logout();
      return false;
    }

    return true;
  }

  getToken(): string | null {
    return this.isAuthenticated() ? this.sessionSignal()?.token ?? null : null;
  }

  private storeSession(response: AdminLoginResponse): void {
    const session: AdminSession = {
      username: response.username,
      token: response.token,
      expiresAtUtc: response.expiresAtUtc
    };

    this.legacyStorage.removeItem(this.storageKey);
    this.sessionStorageRef.setItem(this.storageKey, JSON.stringify(session));
    this.sessionSignal.set(session);
  }

  private readSession(): AdminSession | null {
    // Clear any legacy persistent login so admin auth no longer survives browser restarts.
    this.legacyStorage.removeItem(this.storageKey);

    const raw = this.sessionStorageRef.getItem(this.storageKey);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AdminSession;
    } catch {
      this.sessionStorageRef.removeItem(this.storageKey);
      return null;
    }
  }
}
