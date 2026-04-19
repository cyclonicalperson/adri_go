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
    status?: string;
    entityType?: string;
  }): Observable<PaginatedResponse<Review>> {
    let params = new HttpParams()
      .set('page', 1)                          // fetch all, sort client-side
      .set('pageSize', 1000);

    if (req.status) params = params.set('status', req.status);
    if (req.entityType) params = params.set('entityType', req.entityType);

    return this.http.get<any>(this.url, { params }).pipe(
      map(res => {
        let data: Review[] = (res.data ?? []).map(backendToReview);

        // Client-side sort (backend doesn't support sortBy)
        const sortBy = req.sortBy ?? 'createdAt';
        const sortDir = req.sortDir ?? 'desc';
        data = data.sort((a, b) => {
          let va: any, vb: any;
          if (sortBy === 'rating') { va = a.rating ?? 0; vb = b.rating ?? 0; }
          else if (sortBy === 'createdAt') { va = new Date(a.createdAt).getTime(); vb = new Date(b.createdAt).getTime(); }
          else { va = a.createdAt; vb = b.createdAt; }
          return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
        });

        // Manual pagination after sort
        const total = data.length;
        const page = req.page ?? 1;
        const pageSize = req.pageSize ?? 10;
        const paged = data.slice((page - 1) * pageSize, page * pageSize);
        return {
          data: paged,
          total,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
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
