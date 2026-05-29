/**
 * review.service.ts
 *
 * Mapirano na /api/reviews (backend ReviewsController).
 * Backend vraća AdminReviewListItemDto koji se mapira u Review interfejs.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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
    search?: string;
    status?: string;
    entityType?: string;
    minRating?: number;
  }, options?: { context?: any }): Observable<PaginatedResponse<Review>> {
    // Šaljemo pravi pageSize backendu — backend radi server-side paginaciju
    let params = new HttpParams()
      .set('page', req.page ?? 1)
      .set('pageSize', req.pageSize ?? 10);

    if (req.sortBy) params = params.set('sortBy', req.sortBy);
    if (req.sortDir) params = params.set('sortDir', req.sortDir!);
    if (req.search?.trim()) params = params.set('search', req.search.trim());
    if (req.status) params = params.set('status', req.status);
    if (req.entityType) params = params.set('entityType', req.entityType);
    if (req.minRating != null) params = params.set('minRating', req.minRating);

    return this.http.get<any>(this.url, { params, ...(options ?? {}) }).pipe(
      map(res => {
        const data: Review[] = (res.data ?? []).map(backendToReview);
        return {
          data,
          total: res.total ?? data.length,        // uvijek koristimo backend total
          page: res.page ?? (req.page ?? 1),
          pageSize: res.pageSize ?? (req.pageSize ?? 10),
          totalPages: res.totalPages ?? Math.max(1, Math.ceil((res.total ?? data.length) / (req.pageSize ?? 10))),
        };
      })
    );
  }

  getById(id: number): Observable<ApiResponse<Review>> {
    // Backend nema GET /reviews/{id} — koristimo listu i filtriramo
    return this.http.get<any>(this.url).pipe(
      map(res => {
        const found = (res.data ?? []).find((r: any) => r.reviewId === id || r.id === id);
        return { data: found ? backendToReview(found) : null as any, success: !!found };
      })
    );
  }

  create(payload: CreateReviewRequest): Observable<ApiResponse<Review>> {
    // Kreiranje recenzija ide kroz /api/posts/{id}/reviews
    const postId = payload.postId;
    if (!postId) throw new Error('postId je obavezan za kreiranje recenzije.');
    const body = { rating: payload.rating, comment: payload.comment };
    return this.http.post<any>(`${environment.apiUrl}/posts/${postId}/reviews`, body).pipe(
      map(res => ({ data: backendToReview(res), success: true }))
    );
  }

  updateStatus(id: number, payload: UpdateReviewStatusRequest): Observable<ApiResponse<Review>> {
    return this.http.patch<any>(`${this.url}/${id}/status`, {
      status: payload.status,
      rejectionReason: payload.rejectionReason,
    }).pipe(
      map(res => ({ data: backendToReview(res.data ?? res), success: res.success ?? true }))
    );
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<any>(`${this.url}/${id}`).pipe(
      map(res => ({ data: undefined, success: res.success ?? true }))
    );
  }
}

/** Pretvara backend AdminReviewListItemDto ili ReviewDto u Review interfejs */
function backendToReview(r: any): Review {
  if (!r) return {} as Review;
  return {
    reviewId: r.reviewId ?? r.id,
    touristId: r.touristId ?? null,
    postId: r.postId ?? null,
    routeId: r.routeId ?? null,
    rating: r.rating,
    comment: r.comment ?? null,
    status: r.status ?? 'PENDING',
    createdAt: r.createdAt,
    touristName: r.touristName ?? r.user?.fullName ?? null,
    user: r.touristId ? { userId: r.touristId, fullName: r.touristName ?? '' } : null,
    entityType: (r.entityType ?? (r.routeId ? 'ROUTE' : 'OBJECT')) as any,
    entityName: r.entityName ?? r.postTitle ?? r.routeName ?? null,
    postType: r.postType ?? null,
  };
}
