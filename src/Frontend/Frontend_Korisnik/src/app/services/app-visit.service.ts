import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Bilježi jednu sesiju otvaranja aplikacije pri pokretanju.
 * sessionId se čuva u sessionStorage — novo otvaranje tab-a/browsera = nova sesija.
 * Backend prima POST /api/analytics/app-visit i deduplicira po session_id + datum.
 */
@Injectable({ providedIn: 'root' })
export class AppVisitService {
  private readonly url = `${environment.apiUrl}/analytics/app-visit`;
  private readonly sessionKey = 'adrigo_session_id';

  constructor(private http: HttpClient) {}

  /** Poziva se jednom pri ngOnInit root komponente. */
  recordVisit(): void {
    let sessionId = sessionStorage.getItem(this.sessionKey);
    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem(this.sessionKey, sessionId);
    }

    this.http.post(this.url, { sessionId }).pipe(
      catchError(() => of(null)),
    ).subscribe();
  }

  private generateId(): string {
    // Kratki UUID-like niz, 32 hex znaka
    return Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
  }
}
