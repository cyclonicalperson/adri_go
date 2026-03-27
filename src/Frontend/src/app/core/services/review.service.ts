import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Review,
  CreateReviewRequest,
  UpdateReviewStatusRequest,
} from '../models/review.model';
import {
  ApiResponse,
  PaginatedResponse,
  PageRequest,
} from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly url = `${environment.apiUrl}/reviews`;

  constructor(private http: HttpClient) { }

  getAll(req: PageRequest & {
    status?: string;
    entityType?: string;
  }): Observable<PaginatedResponse<Review>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('pageSize', req.pageSize);

    if (req.sortBy) params = params.set('sortBy', req.sortBy);
    if (req.sortDir) params = params.set('sortDir', req.sortDir);
    if (req.search) params = params.set('search', req.search);
    if (req.status) params = params.set('status', req.status);
    if (req.entityType) params = params.set('entityType', req.entityType);

    return this.http.get<PaginatedResponse<Review>>(this.url, { params });
  }

  getById(id: number): Observable<ApiResponse<Review>> {
    return this.http.get<ApiResponse<Review>>(`${this.url}/${id}`);
  }

  create(payload: CreateReviewRequest): Observable<ApiResponse<Review>> {
    return this.http.post<ApiResponse<Review>>(this.url, payload);
  }

  updateStatus(id: number, payload: UpdateReviewStatusRequest): Observable<ApiResponse<Review>> {
    return this.http.patch<ApiResponse<Review>>(`${this.url}/${id}/status`, payload);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.url}/${id}`);
  }
}
