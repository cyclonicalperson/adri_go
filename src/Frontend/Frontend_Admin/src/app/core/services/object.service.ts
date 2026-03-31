import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TouristObject,
  CreateObjectRequest,
  UpdateObjectRequest,
} from '../models/object.model';
import {
  ApiResponse,
  PaginatedResponse,
  PageRequest,
} from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class ObjectService {
  private readonly url = `${environment.apiUrl}/objects`;

  constructor(private http: HttpClient) { }

  getAll(req: PageRequest & { destinationId?: number; category?: string }): Observable<PaginatedResponse<TouristObject>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('pageSize', req.pageSize);

    if (req.sortBy) params = params.set('sortBy', req.sortBy);
    if (req.sortDir) params = params.set('sortDir', req.sortDir);
    if (req.search) params = params.set('search', req.search);
    if (req.destinationId) params = params.set('destinationId', req.destinationId);
    if (req.category) params = params.set('category', req.category);

    return this.http.get<PaginatedResponse<TouristObject>>(this.url, { params });
  }

  getById(id: number): Observable<ApiResponse<TouristObject>> {
    return this.http.get<ApiResponse<TouristObject>>(`${this.url}/${id}`);
  }

  create(payload: CreateObjectRequest): Observable<ApiResponse<TouristObject>> {
    return this.http.post<ApiResponse<TouristObject>>(this.url, payload);
  }

  update(id: number, payload: UpdateObjectRequest): Observable<ApiResponse<TouristObject>> {
    return this.http.put<ApiResponse<TouristObject>>(`${this.url}/${id}`, payload);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.url}/${id}`);
  }
}
