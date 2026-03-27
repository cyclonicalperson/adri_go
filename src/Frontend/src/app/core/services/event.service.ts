import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  private readonly url = `${environment.apiUrl}/events`;

  constructor(private http: HttpClient) { }

  getAll(req: PageRequest & {
    destinationId?: number;
    category?: string;
    from?: string;
    to?: string;
  }): Observable<PaginatedResponse<TouristEvent>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('pageSize', req.pageSize);

    if (req.sortBy) params = params.set('sortBy', req.sortBy);
    if (req.sortDir) params = params.set('sortDir', req.sortDir);
    if (req.search) params = params.set('search', req.search);
    if (req.destinationId) params = params.set('destinationId', req.destinationId);
    if (req.category) params = params.set('category', req.category);
    if (req.from) params = params.set('from', req.from);
    if (req.to) params = params.set('to', req.to);

    return this.http.get<PaginatedResponse<TouristEvent>>(this.url, { params });
  }

  getById(id: number): Observable<ApiResponse<TouristEvent>> {
    return this.http.get<ApiResponse<TouristEvent>>(`${this.url}/${id}`);
  }

  create(payload: CreateEventRequest): Observable<ApiResponse<TouristEvent>> {
    return this.http.post<ApiResponse<TouristEvent>>(this.url, payload);
  }

  update(id: number, payload: UpdateEventRequest): Observable<ApiResponse<TouristEvent>> {
    return this.http.put<ApiResponse<TouristEvent>>(`${this.url}/${id}`, payload);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.url}/${id}`);
  }
}
