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
  isSaved?: boolean;
  waypoints: TouristRouteWaypoint[];
}

export interface TouristOwnedRouteItem {
  id: number;
  sourceRouteId: number | null;
  title: string;
  imageUrl?: string | null;
  travelMode: string;
  scenicMode: boolean;
  distanceKm?: number | null;
  durationMin?: number | null;
  createdAt?: string;
  updatedAt?: string;
  waypoints: TouristRouteWaypoint[];
}

export interface TouristRouteDraftPayload {
  title: string;
  waypoints: string;
  travelMode: string;
  scenicMode: boolean;
  distanceKm?: number;
  durationMin?: number;
  sourceRouteId?: number | null;
}

export type SavedRouteKind = 'curatedFavorite' | 'touristRoute';

export interface SavedRouteLibraryItem {
  id: number;
  kind: SavedRouteKind;
  badge: 'Curated route' | 'My route' | 'Modified route';
  routeId: number | null;
  touristRouteId: number | null;
  sourceRouteId: number | null;
  title: string;
  description?: string;
  distanceKm: number;
  durationMin: number;
  elevationGainM?: number | null;
  difficulty?: string;
  countryName?: string | null;
  regionName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  images?: string | string[] | null;
  imageUrl?: string | null;
  saveCount?: number;
  isSaved: boolean;
  travelMode?: string | null;
  scenicMode?: boolean | null;
  waypoints: TouristRouteWaypoint[];
}

export interface ToggleSavedRouteResponse {
  isSaved: boolean;
  saveCount?: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class TouristRoutesService {
  // Curated backend routes live under /api/routes and power Saved > Saved Routes.
  // They are intentionally separate from browser-local planner routes.
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

  getMySavedRoutes(): Observable<TouristRouteItem[]> {
    return this.http.get<any>(`${this.url}/my-saved`).pipe(
      map(res => (res.data ?? []).map((item: any) => this.normalize(item))),
    );
  }

  getSavedRoutesLibrary(): Observable<SavedRouteLibraryItem[]> {
    return this.http.get<any>(`${environment.apiUrl}/saved-routes`).pipe(
      map(res => (res.data ?? []).map((item: any) => this.normalizeSavedRoute(item))),
    );
  }

  toggleSaveRoute(id: number): Observable<ToggleSavedRouteResponse> {
    return this.http.post<ToggleSavedRouteResponse>(`${this.url}/${id}/toggle-save`, {});
  }

  getTouristRoutes(): Observable<TouristOwnedRouteItem[]> {
    return this.http.get<any>(`${environment.apiUrl}/tourist-routes`).pipe(
      map(res => (res.data ?? []).map((item: any) => this.normalizeTouristRoute(item))),
    );
  }

  getTouristRoute(id: number): Observable<TouristOwnedRouteItem | null> {
    return this.http.get<any>(`${environment.apiUrl}/tourist-routes/${id}`).pipe(
      map(res => (res?.data ? this.normalizeTouristRoute(res.data) : null)),
    );
  }

  createTouristRoute(payload: TouristRouteDraftPayload): Observable<TouristOwnedRouteItem | null> {
    return this.http.post<any>(`${environment.apiUrl}/tourist-routes`, payload).pipe(
      map(res => (res?.data ? this.normalizeTouristRoute(res.data) : null)),
    );
  }

  updateTouristRoute(id: number, payload: TouristRouteDraftPayload): Observable<TouristOwnedRouteItem | null> {
    return this.http.put<any>(`${environment.apiUrl}/tourist-routes/${id}`, payload).pipe(
      map(res => (res?.data ? this.normalizeTouristRoute(res.data) : null)),
    );
  }

  deleteTouristRoute(id: number): Observable<{ success?: boolean; message?: string }> {
    return this.http.delete<{ success?: boolean; message?: string }>(`${environment.apiUrl}/tourist-routes/${id}`);
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
      isSaved: !!item.isSaved,
      waypoints,
    };
  }

  private normalizeTouristRoute(item: any): TouristOwnedRouteItem {
    return {
      id: Number(item.touristRouteId ?? item.id ?? 0),
      sourceRouteId: item.sourceRouteId != null ? Number(item.sourceRouteId) : null,
      title: item.title ?? '',
      imageUrl: item.imageUrl ?? null,
      travelMode: item.travelMode ?? 'driving',
      scenicMode: !!item.scenicMode,
      distanceKm: item.distanceKm != null ? Number(item.distanceKm) : null,
      durationMin: item.durationMin != null ? Number(item.durationMin) : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      waypoints: this.parseWaypoints(item.waypoints),
    };
  }

  private normalizeSavedRoute(item: any): SavedRouteLibraryItem {
    const routeId = item.routeId != null ? Number(item.routeId) : null;
    const touristRouteId = item.touristRouteId != null ? Number(item.touristRouteId) : null;
    return {
      id: touristRouteId ?? routeId ?? 0,
      kind: item.kind === 'touristRoute' ? 'touristRoute' : 'curatedFavorite',
      badge: item.badge === 'My route' || item.badge === 'Modified route' ? item.badge : 'Curated route',
      routeId,
      touristRouteId,
      sourceRouteId: item.sourceRouteId != null ? Number(item.sourceRouteId) : null,
      title: item.title ?? item.name ?? '',
      description: item.description ?? '',
      distanceKm: Number(item.distanceKm ?? 0),
      durationMin: Number(item.durationMin ?? 0),
      elevationGainM: item.elevationGainM != null ? Number(item.elevationGainM) : null,
      difficulty: item.difficulty ?? '',
      countryName: item.countryName ?? item.country ?? null,
      regionName: item.regionName ?? item.region?.name ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      images: item.images ?? null,
      imageUrl: item.imageUrl ?? null,
      saveCount: item.saveCount != null ? Number(item.saveCount) : undefined,
      isSaved: item.isSaved !== false,
      travelMode: item.travelMode ?? null,
      scenicMode: item.scenicMode ?? null,
      waypoints: this.parseWaypoints(item.waypoints),
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
