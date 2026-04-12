

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';

export interface Tourist {
  id: number;
  name: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:5125/api';

  // Drži trenutnog korisnika — čita iz localStorage pri startu
  private touristSubject = new BehaviorSubject<Tourist | null>(this.loadFromStorage());
  public tourist$ = this.touristSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ── POST /api/tourists/register ────────────────────────────────────────────
  register(name: string, email: string, password: string): Observable<{ tourist: Tourist }> {
    return this.http
      .post<{ tourist: Tourist }>(`${this.apiUrl}/tourists/register`, { name, email, password })
      .pipe(tap(res => this.saveSession(res.tourist)));
  }

  // ── POST /api/tourists/login ───────────────────────────────────────────────
  login(email: string, password: string): Observable<{ tourist: Tourist }> {
    return this.http
      .post<{ tourist: Tourist }>(`${this.apiUrl}/tourists/login`, { email, password })
      .pipe(tap(res => this.saveSession(res.tourist)));
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  logout(): void {
    localStorage.removeItem('tourist');
    this.touristSubject.next(null);
  }

  // ── Getteri ────────────────────────────────────────────────────────────────
  get currentTourist(): Tourist | null {
    return this.touristSubject.value;
  }

  get touristId(): number | null {
    return this.touristSubject.value?.id ?? null;
  }

  get isLoggedIn(): boolean {
    return this.touristSubject.value !== null;
  }

  // ── Privatne metode ────────────────────────────────────────────────────────
  private saveSession(tourist: Tourist): void {
    localStorage.setItem('tourist', JSON.stringify(tourist));
    this.touristSubject.next(tourist);
  }

  private loadFromStorage(): Tourist | null {
    try {
      const stored = localStorage.getItem('tourist');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}
