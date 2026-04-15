/**
 * event.service.ts
 *
 * Mapirano na /api/posts (backend PostsController) sa type=event filterom.
 * Pretvara Post odgovor u TouristEvent interfejs koji komponente očekuju.
 * Komponente (EventsListComponent) već koriste Post model direktno — ovaj servis
 * je zadržan za kompatibilnost sa starijim komponentama.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TouristEvent,
  CreateEventRequest,
  UpdateEventRequest,
} from '../models/event.model';
import {
  ApiResponse,
  PaginatedResponse,
  PageRequest,
} from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly url = `${environment.apiUrl}/posts`;

  constructor(private http: HttpClient) {}

  getAll(req: PageRequest & {
    destinationId?: number;
    regionId?: number;
    category?: string;
    from?: string;
    to?: string;
    status?: string;
  }): Observable<PaginatedResponse<TouristEvent>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('pageSize', req.pageSize)
      .set('type', 'event');          // Uvijek filtriramo samo evente

    if (req.sortBy)  params = params.set('sortBy', req.sortBy);
    if (req.sortDir) params = params.set('sortDir', req.sortDir!);
    if (req.search)  params = params.set('search', req.search);

    const rid = req.regionId ?? req.destinationId;
    if (rid) params = params.set('region_id', rid);
    if (req.status) params = params.set('status', req.status);

    return this.http.get<any>(this.url, { params }).pipe(
      map(res => ({
        data:       (res.data ?? []).map(postToEvent),
        total:      res.total ?? 0,
        page:       res.page ?? req.page,
        pageSize:   res.pageSize ?? req.pageSize,
        totalPages: res.totalPages ?? 1,
      }))
    );
  }

  getById(id: number): Observable<ApiResponse<TouristEvent>> {
    return this.http.get<any>(`${this.url}/${id}`).pipe(
      map(res => ({ data: postToEvent(res.data ?? res), success: res.success ?? true }))
    );
  }

  create(payload: CreateEventRequest): Observable<ApiResponse<TouristEvent>> {
    const details: any = {};
    if (payload.startAt)   details['eventStart'] = payload.startAt;
    if (payload.endAt)     details['eventEnd']   = payload.endAt;
    if (payload.ticketUrl) details['ticketUrl']  = payload.ticketUrl;
    if (payload.category)  details['category']   = payload.category;

    const body: any = {
      regionId:    payload.destinationId,
      title:       payload.name,
      postType:    'event',
      description: payload.description,
      lat:         payload.latitude,
      lng:         payload.longitude,
      details,
      status:      'draft',
    };

    return this.http.post<any>(this.url, body).pipe(
      map(res => ({ data: postToEvent(res.data ?? res), success: true }))
    );
  }

  update(id: number, payload: UpdateEventRequest): Observable<ApiResponse<TouristEvent>> {
    const body: any = {};
    if (payload.name)        body['title']       = payload.name;
    if (payload.description) body['description'] = payload.description;
    if (payload.latitude)    body['lat']         = payload.latitude;
    if (payload.longitude)   body['lng']         = payload.longitude;
    const rid = payload.destinationId;
    if (rid) body['regionId'] = rid;

    const details: any = {};
    if (payload.startAt)   details['eventStart'] = payload.startAt;
    if (payload.endAt)     details['eventEnd']   = payload.endAt;
    if (payload.ticketUrl) details['ticketUrl']  = payload.ticketUrl;
    if (payload.category)  details['category']   = payload.category;
    if (Object.keys(details).length) body['details'] = details;

    return this.http.put<any>(`${this.url}/${id}`, body).pipe(
      map(res => ({ data: postToEvent(res.data ?? res), success: true }))
    );
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<any>(`${this.url}/${id}`).pipe(
      map(res => ({ data: undefined, success: res.success ?? true }))
    );
  }
}

/** Pretvara backend Post u TouristEvent interfejs */
function postToEvent(p: any): TouristEvent {
  if (!p) return {} as TouristEvent;
  const det = p.details ?? {};
  const regionData = p.region ?? null;
  return {
    eventId:        p.id ?? p.postId,
    destinationId:  p.regionId ?? null,
    objectId:       null,
    organizationId: p.adminOrganizationId ?? null,
    name:           p.title ?? '',
    category:       (det['category'] ?? 'OTHER') as any,
    description:    p.description ?? '',
    startAt:        det['eventStart'] ?? '',
    endAt:          det['eventEnd'] ?? '',
    ticketUrl:      det['ticketUrl'] ?? p.externalUrl ?? null,
    latitude:       p.lat ?? null,
    longitude:      p.lng ?? null,
    createdBy:      p.adminId ?? 0,
    createdAt:      p.createdAt ?? '',
    destination:    regionData ? { destinationId: regionData.regionId ?? regionData.id, name: regionData.name } : undefined,
  };
}
