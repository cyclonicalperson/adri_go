

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ── Modeli koji odgovaraju backend PostDto ─────────────────────────────────────

export interface Location {
  id: number;
  adminId: number;
  adminName: string;
  regionId?: number;
  regionName?: string;
  title: string;
  postType: string;
  description?: string;
  lat?: number;
  lng?: number;
  address?: string;
  externalUrl?: string;
  externalUrlLabel?: string;
  images?: string;        // JSON string: '["url1","url2"]'
  openingHours?: string;
  details?: string;
  status: string;
  viewCount: number;
  likeCount: number;
  saveCount: number;
  reviewCount: number;
  avgRating?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocationsResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  data: Location[];
}

export interface Review {
  id: number;
  touristId: number;
  touristName: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface ReviewsResponse {
  total: number;
  data: Review[];
}

export interface InteractionResponse {
  message: string;
  likeCount?: number;
  saveCount?: number;
  viewCount?: number;
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  private apiUrl = 'http://localhost:5125/api';

  constructor(private http: HttpClient) {}

  // ── GET /api/posts/public — lista lokacija (bez logina) ────────────────────
  getLocations(page = 1, pageSize = 20, type?: string, regionId?: number): Observable<LocationsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (type) params = params.set('type', type);
    if (regionId) params = params.set('region_id', regionId.toString());

    return this.http.get<LocationsResponse>(`${this.apiUrl}/posts/public`, { params });
  }

  // ── GET /api/posts/:id — detalji lokacije ──────────────────────────────────
  getLocationById(id: number): Observable<Location> {
    return this.http.get<Location>(`${this.apiUrl}/posts/${id}`);
  }

  // ── GET /api/posts/:id/reviews — lista recenzija ───────────────────────────
  getReviews(postId: number): Observable<ReviewsResponse> {
    return this.http.get<ReviewsResponse>(`${this.apiUrl}/posts/${postId}/reviews`);
  }

  // ── POST /api/posts/:id/reviews — dodaj recenziju ─────────────────────────
  addReview(postId: number, touristId: number, rating: number, comment?: string): Observable<Review> {
    return this.http.post<Review>(`${this.apiUrl}/posts/${postId}/reviews`, {
      touristId,
      rating,
      comment: comment || null
    });
  }

  // ── POST /api/posts/:id/like — lajkuj ─────────────────────────────────────
  likeLocation(postId: number, touristId: number): Observable<InteractionResponse> {
    return this.http.post<InteractionResponse>(`${this.apiUrl}/posts/${postId}/like`, { touristId });
  }

  // ── POST /api/posts/:id/save — sačuvaj ────────────────────────────────────
  saveLocation(postId: number, touristId: number): Observable<InteractionResponse> {
    return this.http.post<InteractionResponse>(`${this.apiUrl}/posts/${postId}/save`, { touristId });
  }

  // ── POST /api/posts/:id/view — registruj pregled ──────────────────────────
  registerView(postId: number, touristId: number): Observable<InteractionResponse> {
    return this.http.post<InteractionResponse>(`${this.apiUrl}/posts/${postId}/view`, { touristId });
  }

  // ── Helper: parsiraj images JSON string u niz URL-ova ─────────────────────
  parseImages(imagesJson?: string): string[] {
    if (!imagesJson) return [];
    try {
      const parsed = JSON.parse(imagesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
