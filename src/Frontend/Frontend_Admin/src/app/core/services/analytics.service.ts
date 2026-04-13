import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

/**
 * Maps to v_superadmin_overview view.
 */
export interface DashboardStats {
  totalTourists: number;
  totalAdmins: number;
  totalPosts: number;
  totalRoutes: number;
  pendingRegistrations: number;
  pendingReviews: number;
  ticketsIssued: number;
  unreadNotifications: number;
}

/**
 * Maps to post_view aggregated by date.
 */
export interface DailyVisit {
  date: string; // YYYY-MM-DD
  count: number;
}

/**
 * Maps to v_post_stats view columns.
 */
export interface PopularPost {
  id: number;
  title: string;
  postType: string;
  viewCount: number;
  likeCount: number;
  avgRating: number | null;
  regionName: string | null;
  adminName: string;
}

/** @deprecated Use PopularPost. Kept for compatibility. */
export type PopularEntity = PopularPost;

export interface RegionPopularity {
  regionId: number;
  name: string;
  type: string;
  numPosts: number;
  totalViews: number;
  totalLikes: number;
  avgRating: number | null;
}

/**
 * Maps to aggregated post_view data per region.
 * NOTE: fields use regionId/regionName (not destinationId/destinationName).
 */
export interface TouristMovement {
  regionId: number;
  regionName: string;
  latitude: number;
  longitude: number;
  visitCount: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly url = `${environment.apiUrl}/analytics`;

  constructor(private http: HttpClient) { }

  /** v_superadmin_overview — all platform KPIs */
  getDashboardStats(): Observable<ApiResponse<DashboardStats>> {
    return this.http.get<ApiResponse<DashboardStats>>(`${this.url}/stats`);
  }

  /** Aggregated post_view counts by day */
  getDailyVisits(from: string, to: string): Observable<ApiResponse<DailyVisit[]>> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<ApiResponse<DailyVisit[]>>(`${this.url}/visits`, { params });
  }

  /** Top posts (non-event) by view_count */
  getPopularPosts(limit = 10): Observable<ApiResponse<PopularPost[]>> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<ApiResponse<PopularPost[]>>(`${this.url}/popular/posts`, { params });
  }

  /**
   * Alias for getPopularPosts — kept for backward compatibility.
   * @deprecated Use getPopularPosts() instead.
   */
  getPopularObjects(limit = 10): Observable<ApiResponse<PopularPost[]>> {
    return this.getPopularPosts(limit);
  }

  /** Top event posts by view_count */
  getPopularEvents(limit = 10): Observable<ApiResponse<PopularPost[]>> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<ApiResponse<PopularPost[]>>(`${this.url}/popular/events`, { params });
  }

  /** v_region_popularity — visits per region */
  getRegionPopularity(): Observable<ApiResponse<RegionPopularity[]>> {
    return this.http.get<ApiResponse<RegionPopularity[]>>(`${this.url}/regions`);
  }

  /** Aggregated post_view by region — for tourist movement map */
  getTouristMovements(): Observable<ApiResponse<TouristMovement[]>> {
    return this.http.get<ApiResponse<TouristMovement[]>>(`${this.url}/movements`);
  }
}
