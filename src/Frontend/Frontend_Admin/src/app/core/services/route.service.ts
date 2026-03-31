import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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

  constructor(private http: HttpClient) { }

  getAll(req: PageRequest & {
    destinationId?: number;
    difficulty?: string;
    routeType?: string;
  }): Observable<PaginatedResponse<TouristRoute>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('pageSize', req.pageSize);

    if (req.sortBy) params = params.set('sortBy', req.sortBy);
    if (req.sortDir) params = params.set('sortDir', req.sortDir);
    if (req.search) params = params.set('search', req.search);
    if (req.destinationId) params = params.set('destinationId', req.destinationId);
    if (req.difficulty) params = params.set('difficulty', req.difficulty);
    if (req.routeType) params = params.set('routeType', req.routeType);

    return this.http.get<PaginatedResponse<TouristRoute>>(this.url, { params });
  }

  getById(id: number): Observable<ApiResponse<TouristRoute>> {
    return this.http.get<ApiResponse<TouristRoute>>(`${this.url}/${id}`);
  }

  create(payload: CreateRouteRequest): Observable<ApiResponse<TouristRoute>> {
    return this.http.post<ApiResponse<TouristRoute>>(this.url, payload);
  }

  update(id: number, payload: UpdateRouteRequest): Observable<ApiResponse<TouristRoute>> {
    return this.http.put<ApiResponse<TouristRoute>>(`${this.url}/${id}`, payload);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.url}/${id}`);
  }
}
