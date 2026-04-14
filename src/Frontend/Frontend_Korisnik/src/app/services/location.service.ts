import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  latitude?: number;
  longitude?: number;
  address?: string;
  externalUrl?: string;
  externalUrlLabel?: string;
  images?: string;
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

@Injectable({ providedIn: 'root' })
export class LocationService {

  private apiUrl = 'http://localhost:5125/api';

  constructor(private http: HttpClient) {}

  getLocations(page = 1, pageSize = 20, type?: string, regionId?: number): Observable<LocationsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (type)     params = params.set('type', type);
    if (regionId) params = params.set('region_id', regionId.toString());
    return this.http.get<LocationsResponse>(`${this.apiUrl}/posts/public`, { params });
  }

  getLocationById(id: number): Observable<Location> {
    return this.http.get<Location>(`${this.apiUrl}/posts/${id}`);
  }

  getReviews(postId: number): Observable<ReviewsResponse> {
    return this.http.get<ReviewsResponse>(`${this.apiUrl}/posts/${postId}/reviews`);
  }

  // touristId kept as optional for backward compatibility — backend reads from JWT
  addReview(postId: number, touristId?: number, rating?: number, comment?: string): Observable<Review> {
    return this.http.post<Review>(`${this.apiUrl}/posts/${postId}/reviews`, {
      rating: rating ?? 5,
      comment: comment || null
    });
  }

  // touristId kept as optional param — ignored, backend reads from JWT
  likeLocation(postId: number, touristId?: number): Observable<InteractionResponse> {
    return this.http.post<InteractionResponse>(`${this.apiUrl}/posts/${postId}/like`, {});
  }

  unlikeLocation(postId: number): Observable<InteractionResponse> {
    return this.http.delete<InteractionResponse>(`${this.apiUrl}/posts/${postId}/like`);
  }

  // touristId kept as optional param — ignored, backend reads from JWT
  saveLocation(postId: number, touristId?: number): Observable<InteractionResponse> {
    return this.http.post<InteractionResponse>(`${this.apiUrl}/posts/${postId}/save`, {});
  }

  unsaveLocation(postId: number): Observable<InteractionResponse> {
    return this.http.delete<InteractionResponse>(`${this.apiUrl}/posts/${postId}/save`);
  }

  // touristId kept as optional param — ignored, backend reads from JWT
  registerView(postId: number, touristId?: number): Observable<InteractionResponse> {
    return this.http.post<InteractionResponse>(`${this.apiUrl}/posts/${postId}/view`, {});
  }

  parseImages(imagesJson?: string): string[] {
    if (!imagesJson) return [];
    try {
      const parsed = JSON.parse(imagesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
}
