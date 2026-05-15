import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Bilježi jedinstvenu dnevnu posjetu platformi.
 *
 * Identifikator se čuva u **localStorage** (ne sessionStorage) — tako isti
 * korisnik koji otvori više tabova ili ponovo otvori browser istog dana
 * dobija isti ID i backend ga računa kao 1 posjetioca.
 * Različiti uređaji ili različiti profili browsera → različiti ID → novi posjetilac.
 *
 * Backend prima POST /api/analytics/app-visit i deduplicira po (visitor_id + datum).
 */
@Injectable({ providedIn: 'root' })
export class AppVisitService {
  private readonly url = `${environment.apiUrl}/analytics/app-visit`;
  /** localStorage ključ — preživljava zatvaranje taba/browsera */
  private readonly visitorKey = 'adrigo_visitor_id';

  constructor(private http: HttpClient) {}

  /** Poziva se jednom pri ngOnInit root komponente. */
  recordVisit(): void {
    let visitorId = localStorage.getItem(this.visitorKey);
    if (!visitorId) {
      visitorId = this.generateId();
      localStorage.setItem(this.visitorKey, visitorId);
    }

    this.http.post(this.url, { sessionId: visitorId }).pipe(
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
