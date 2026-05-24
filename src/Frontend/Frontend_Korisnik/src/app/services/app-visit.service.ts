import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { GeolocationService } from './geolocation.service';
import { TouristPreferencesService } from './tourist-preferences.service';

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
  private readonly locationUrl = `${environment.apiUrl}/analytics/tourist-location`;
  /** localStorage ključ — preživljava zatvaranje taba/browsera */
  private readonly visitorKey = 'adrigo_visitor_id';

  constructor(
    private http: HttpClient,
    private geolocation: GeolocationService,
    private preferences: TouristPreferencesService,
  ) {}

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

    if (this.preferences.snapshot.locationSharing) {
      void this.geolocation.requestCurrentPosition({ maximumAge: 60000 }).then(position => {
        if (!position) return;
        this.http.post(this.locationUrl, {
          sessionId: visitorId,
          lat: position.lat,
          lng: position.lng,
        }).pipe(catchError(() => of(null))).subscribe();
      });
    }
  }

  private generateId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
}
