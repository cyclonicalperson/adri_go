import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Region, RegionType,
  CreateRegionRequest, UpdateRegionRequest,
} from '../models/region.model';
import {
  ApiResponse, PaginatedResponse, PageRequest,
} from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class RegionService {
  private readonly url = `${environment.apiUrl}/regions`;

  constructor(private http: HttpClient) { }

  getAll(req: PageRequest & { type?: RegionType; country?: string }): Observable<PaginatedResponse<Region>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('pageSize', req.pageSize);

    if (req.sortBy) params = params.set('sortBy', req.sortBy);
    if (req.sortDir) params = params.set('sortDir', req.sortDir!);
    if (req.search) params = params.set('search', req.search);
    if (req.type) params = params.set('type', req.type);
    if (req.country) params = params.set('country', req.country);

    return this.http.get<PaginatedResponse<Region>>(this.url, { params });
  }

  getById(id: number): Observable<ApiResponse<Region>> {
    return this.http.get<ApiResponse<Region>>(`${this.url}/${id}`);
  }

  create(payload: CreateRegionRequest): Observable<ApiResponse<Region>> {
    return this.http.post<ApiResponse<Region>>(this.url, payload);
  }

  update(id: number, payload: UpdateRegionRequest): Observable<ApiResponse<Region>> {
    return this.http.put<ApiResponse<Region>>(`${this.url}/${id}`, payload);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.url}/${id}`);
  }
}
