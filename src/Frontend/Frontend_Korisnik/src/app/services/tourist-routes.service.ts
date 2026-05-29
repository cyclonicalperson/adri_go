import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { PlannerStop } from './route-planner.service';

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
  countryName?: string | null;
  regionName?: string | null;
  createdAt?: string;
  images?: string | string[];
  viewCount?: number;
  saveCount?: number;
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

  getRouteById(id: number): Observable<TouristRouteItem | null> {
    return this.http.get<any>(`${this.url}/${id}`).pipe(
      map(res => (res?.data ? this.normalize(res.data) : null)),
    );
  }

  // Curated route waypoints become synthetic planner stops. Negative ids keep
  // them out of post-only flows (e.g. the calendar stop-loop filters id > 0).
  routeToPlannerStops(route: TouristRouteItem): PlannerStop[] {
    return route.waypoints.map((point, index) => ({
      id: -(route.id * 1000 + index + 1),
      title: point.name || `${route.name} ${index + 1}`,
      postType: 'route',
      lat: point.lat,
      lng: point.lng,
      regionName: route.regionName ?? undefined,
    }));
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
      countryName: item.region?.country ?? item.countryName ?? item.country ?? null,
      regionName: item.region?.name ?? item.regionName ?? null,
      createdAt: item.createdAt,
      images: item.images ?? [],
      viewCount: Number(item.viewCount ?? 0),
      saveCount: Number(item.saveCount ?? 0),
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
