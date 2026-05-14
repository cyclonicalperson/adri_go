import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TouristRouteWaypoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface TouristRouteItem {
  id: number;
  name: string;
  description?: string;
  difficulty?: string;
  distanceKm: number;
  durationMin: number;
  elevationGainM?: number;
  regionName?: string | null;
  createdAt?: string;
  waypoints: TouristRouteWaypoint[];
}

@Injectable({ providedIn: 'root' })
export class TouristRoutesService {
  private readonly url = `${environment.apiUrl}/routes`;

  constructor(private http: HttpClient) {}

  getRoutes(search = '', sortBy = 'createdAt', sortDir = 'desc'): Observable<TouristRouteItem[]> {
    let params = new HttpParams()
      .set('page', 1)
      .set('pageSize', 100)
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<any>(this.url, { params }).pipe(
      map(res => (res.data ?? []).map((item: any) => this.normalize(item))),
    );
  }

  private normalize(item: any): TouristRouteItem {
    const waypoints = this.parseWaypoints(item.waypoints);
    return {
      id: item.routeId ?? item.id,
      name: item.name ?? '',
      description: item.description ?? '',
      difficulty: item.difficulty ?? '',
      distanceKm: Number(item.distanceKm ?? 0),
      durationMin: Number(item.durationMin ?? 0),
      elevationGainM: item.elevationGainM ?? item.elevationGain ?? null,
      regionName: item.region?.name ?? item.regionName ?? null,
      createdAt: item.createdAt,
      waypoints,
    };
  }

  private parseWaypoints(raw: any): TouristRouteWaypoint[] {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return (Array.isArray(parsed) ? parsed : [])
        .map(point => ({
          lat: Number(point.lat ?? point.latitude),
          lng: Number(point.lng ?? point.longitude),
          name: point.name ?? '',
        }))
        .filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng));
    } catch {
      return [];
    }
  }
}
