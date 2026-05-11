import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
  images?: string | string[];
  openingHours?: string;
  details?: string;
  status: string;
  viewCount: number;
  likeCount: number;
  saveCount: number;
  reviewCount: number;
  avgRating?: number;
  rating?: number;
  reviews?: number;
  likes?: number;
  saves?: number;
  category?: string;
  imageUrl?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
  isSaved?: boolean;
  distanceKm?: number | null;
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

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getLocations(page = 1, pageSize = 20, type?: string, regionId?: number): Observable<LocationsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    if (type)     params = params.set('type', type);
    if (regionId) params = params.set('region_id', regionId.toString());
    return this.http.get<LocationsResponse>(`${this.apiUrl}/posts/public`, { params });
  }

  searchLocations(
    query: string,
    page = 1,
    pageSize = 20,
    context?: { lat?: number | null; lng?: number | null; type?: string }
  ): Observable<LocationsResponse> {
    let params = new HttpParams()
      .set('q', query)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (context?.type) params = params.set('type', context.type);
    if (context?.lat != null && context?.lng != null) {
      params = params
        .set('lat', context.lat.toString())
        .set('lng', context.lng.toString());
    }

    return this.http.get<LocationsResponse>(`${this.apiUrl}/posts/search`, { params });
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
  // Povlači sve sačuvane postove ulogovanog korisnika
  getMySavedPosts(): Observable<Location[]> {
    return this.http.get<Location[]>(`${this.apiUrl}/posts/my-saved`); 
  }
  parseImages(imagesJson?: string | string[]): string[] {
    if (!imagesJson) return [];
    if (Array.isArray(imagesJson)) return imagesJson;
    try {
      const parsed = JSON.parse(imagesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  // Dodaj ovo u location.service.ts ako već nisi:
  toggleSaveLocation(postId: number): Observable<{ isSaved: boolean, message: string }> {
    return this.http.post<{ isSaved: boolean, message: string }>(
      `${this.apiUrl}/posts/${postId}/toggle-save`, 
      {}
    );
  }
}
