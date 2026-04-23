/**
 * destination.service.ts
 *
 * Mapirano na /api/regions (backend RegionsController).
 * Pretvara Region odgovor u Destination interfejs koji stare komponente očekuju.
 * Nove komponente trebaju koristiti region.service.ts direktno.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Destination,
  CreateDestinationRequest,
  UpdateDestinationRequest,
} from '../models/destination.model';
import {
  ApiResponse,
  PaginatedResponse,
  PageRequest,
} from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class DestinationService {
  // Regije su "destinacije" u frontend terminologiji
  private readonly url = `${environment.apiUrl}/regions`;

  constructor(private http: HttpClient) {}

  getAll(req: PageRequest & { type?: string; region?: string }): Observable<PaginatedResponse<Destination>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('pageSize', req.pageSize);

    if (req.sortBy)  params = params.set('sortBy', req.sortBy);
    if (req.sortDir) params = params.set('sortDir', req.sortDir);
    if (req.search)  params = params.set('search', req.search);
    // Mapiramo frontend "type" (CITY, MOUNTAIN...) u backend lowercase (city, mountain...)
    if (req.type)    params = params.set('type', req.type.toLowerCase());

    return this.http.get<any>(this.url, { params }).pipe(
      map(res => ({
        data: (res.data ?? []).map(regionToDestination),
        total: res.total ?? 0,
        page: res.page ?? req.page,
        pageSize: res.pageSize ?? req.pageSize,
        totalPages: res.totalPages ?? 1,
      }))
    );
  }

  getById(id: number): Observable<ApiResponse<Destination>> {
    return this.http.get<any>(`${this.url}/${id}`).pipe(
      map(res => ({ data: regionToDestination(res.data), success: res.success }))
    );
  }

  create(payload: CreateDestinationRequest): Observable<ApiResponse<Destination>> {
    const body = {
      name:    payload.name,
      type:    payload.type?.toLowerCase() ?? 'city',
      description: payload.description,
      lat:     payload.latitude,
      lng:     payload.longitude,
      country: payload.country || 'Montenegro',
    };
    return this.http.post<any>(this.url, body).pipe(
      map(res => ({ data: regionToDestination(res.data ?? res), success: true }))
    );
  }

  update(id: number, payload: UpdateDestinationRequest): Observable<ApiResponse<Destination>> {
    const body: any = {};
    if (payload.name !== undefined) body['name'] = payload.name;
    if (payload.type !== undefined) body['type'] = payload.type.toLowerCase();
    if (payload.description !== undefined) body['description'] = payload.description;
    if (payload.country !== undefined) body['country'] = payload.country;
    if (payload.latitude !== undefined) body['lat'] = payload.latitude;
    if (payload.longitude !== undefined) body['lng'] = payload.longitude;
    return this.http.put<any>(`${this.url}/${id}`, body).pipe(
      map(res => ({ data: regionToDestination(res.data ?? res), success: true }))
    );
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<any>(`${this.url}/${id}`).pipe(
      map(res => ({ data: undefined, success: res.success ?? true }))
    );
  }
}

/** Pretvara backend Region odgovor u Destination interfejs koji stare komponente koriste */
function regionToDestination(r: any): Destination {
  if (!r) return {} as Destination;
  return {
    destinationId: r.regionId ?? r.id,
    name:          r.name ?? '',
    type:          (r.type ?? 'other').toUpperCase() as any,
    description:   r.description ?? '',
    country:       r.country ?? 'Montenegro',
    latitude:      r.lat ?? 0,
    longitude:     r.lng ?? 0,
    createdBy:     0,
    createdAt:     r.createdAt ?? '',
  };
}
