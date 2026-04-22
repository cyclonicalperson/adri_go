/**
 * route.service.ts
 *
 * Mapirano na /api/routes (backend RoutesController).
 * Pretvara Route odgovor u TouristRoute interfejs koji komponente očekuju.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TouristRoute,
  CreateRouteRequest,
  UpdateRouteRequest,
} from '../models/route.model';
import {
  ApiResponse,
  PaginatedResponse,
  PageRequest,
} from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class RouteService {
  private readonly url = `${environment.apiUrl}/routes`;

  constructor(private http: HttpClient) {}

  getAll(req: PageRequest & {
    destinationId?: number;
    regionId?: number;
    difficulty?: string;
    routeType?: string;
    status?: string;
  }): Observable<PaginatedResponse<TouristRoute>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('pageSize', req.pageSize);

    if (req.sortBy)    params = params.set('sortBy', req.sortBy);
    if (req.sortDir)   params = params.set('sortDir', req.sortDir!);
    if (req.search)    params = params.set('search', req.search);
    const rid = req.regionId ?? req.destinationId;
    if (rid)           params = params.set('region_id', rid);
    if (req.difficulty) params = params.set('difficulty', req.difficulty.toLowerCase());
    if (req.status)    params = params.set('status', req.status);
    // Backend ne podrzava routeType — ignorisemo

    return this.http.get<any>(this.url, { params }).pipe(
      map(res => ({
        data:       (res.data ?? []).map(backendToRoute),
        total:      res.total ?? 0,
        page:       res.page ?? req.page,
        pageSize:   res.pageSize ?? req.pageSize,
        totalPages: res.totalPages ?? 1,
      }))
    );
  }

  getById(id: number): Observable<ApiResponse<TouristRoute>> {
    return this.http.get<any>(`${this.url}/${id}`).pipe(
      map(res => ({
        data:    backendToRoute(res.data ?? res),
        success: res.success ?? true,
      }))
    );
  }

  create(payload: CreateRouteRequest): Observable<ApiResponse<TouristRoute>> {
    // Parsiramo waypoints u JSON string koji backend očekuje
    const waypointsJson = payload.waypoints
      ? JSON.stringify(payload.waypoints.map(w => ({
          lat:  w.latitude,
          lng:  w.longitude,
          name: '',
        })))
      : undefined;

    const body: any = {
      regionId:      payload.destinationId,
      name:          payload.name,
      difficulty:    payload.difficulty?.toLowerCase() ?? 'moderate',
      distanceKm:    payload.distanceKm,
      durationMin:   payload.durationMin,
      elevationGainM: payload.elevationGainM,
      description:   payload.description,
      waypoints:     waypointsJson,
      status:        'draft',
    };

    return this.http.post<any>(this.url, body).pipe(
      map(res => ({ data: backendToRoute(res.data ?? res), success: true }))
    );
  }

  update(id: number, payload: UpdateRouteRequest): Observable<ApiResponse<TouristRoute>> {
    const body: any = {};
    if (payload.name)           body['name']          = payload.name;
    if (payload.difficulty)     body['difficulty']     = payload.difficulty.toLowerCase();
    if (payload.distanceKm)     body['distanceKm']    = payload.distanceKm;
    if (payload.durationMin)    body['durationMin']   = payload.durationMin;
    if (payload.elevationGainM) body['elevationGainM'] = payload.elevationGainM;
    if (payload.description)    body['description']   = payload.description;
    if (payload.destinationId)  body['regionId']      = payload.destinationId;
    if (payload.waypoints) {
      body['waypoints'] = JSON.stringify(payload.waypoints.map(w => ({
        lat: w.latitude, lng: w.longitude, name: '',
      })));
    }

    return this.http.put<any>(`${this.url}/${id}`, body).pipe(
      map(res => ({ data: backendToRoute(res.data ?? res), success: true }))
    );
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<any>(`${this.url}/${id}`).pipe(
      map(res => ({ data: undefined, success: res.success ?? true }))
    );
  }
}

/** Pretvara backend Route u TouristRoute interfejs */
function backendToRoute(r: any): TouristRoute {
  if (!r) return {} as TouristRoute;

  // Parsiramo waypoints JSON string u niz objekata
  let waypointsParsed: any[] = [];
  if (r.waypoints) {
    try {
      waypointsParsed = typeof r.waypoints === 'string'
        ? JSON.parse(r.waypoints)
        : r.waypoints;
    } catch { waypointsParsed = []; }
  }

  const regionData = r.region ?? null;
  const firstWp = waypointsParsed[0];
  const lastWp  = waypointsParsed[waypointsParsed.length - 1];

  return {
    routeId:        r.routeId ?? r.id,
    destinationId:  r.regionId ?? r.destinationId ?? 0,
    name:           r.name ?? '',
    routeType:      'HIKING' as any,                      // Backend nema routeType — default
    difficulty:     (r.difficulty?.toUpperCase() ?? 'MODERATE') as any,
    distanceKm:     r.distanceKm ?? 0,
    durationMin:    r.durationMin ?? 0,
    elevationGainM: r.elevationGainM ?? r.elevationGain ?? 0,
    description:    r.description ?? '',
    startLatitude:  firstWp?.lat ?? 0,
    startLongitude: firstWp?.lng ?? 0,
    endLatitude:    lastWp?.lat  ?? 0,
    endLongitude:   lastWp?.lng  ?? 0,
    isActive:       r.status === 'published',
    createdBy:      r.adminId ?? 0,
    waypoints:      waypointsParsed.map((w: any, i: number) => ({
      waypointId:    i + 1,
      routeId:       r.routeId ?? r.id,
      latitude:      w.lat ?? 0,
      longitude:     w.lng ?? 0,
      sequenceOrder: i + 1,
    })),
    destination: regionData
      ? { destinationId: regionData.regionId ?? regionData.id, name: regionData.name }
      : undefined,
    // Čuvamo status za UI filtre
    ...(r.status ? { status: r.status } : {}),
  } as any;
}
