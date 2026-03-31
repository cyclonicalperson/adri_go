import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  private readonly url = `${environment.apiUrl}/destinations`;

  constructor(private http: HttpClient) { }

  getAll(req: PageRequest & { type?: string; region?: string }): Observable<PaginatedResponse<Destination>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('pageSize', req.pageSize);

    if (req.sortBy) params = params.set('sortBy', req.sortBy);
    if (req.sortDir) params = params.set('sortDir', req.sortDir);
    if (req.search) params = params.set('search', req.search);
    if (req.type) params = params.set('type', req.type);
    if (req.region) params = params.set('region', req.region);

    return this.http.get<PaginatedResponse<Destination>>(this.url, { params });
  }

  getById(id: number): Observable<ApiResponse<Destination>> {
    return this.http.get<ApiResponse<Destination>>(`${this.url}/${id}`);
  }

  create(payload: CreateDestinationRequest): Observable<ApiResponse<Destination>> {
    return this.http.post<ApiResponse<Destination>>(this.url, payload);
  }

  update(id: number, payload: UpdateDestinationRequest): Observable<ApiResponse<Destination>> {
    return this.http.put<ApiResponse<Destination>>(`${this.url}/${id}`, payload);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.url}/${id}`);
  }
}
