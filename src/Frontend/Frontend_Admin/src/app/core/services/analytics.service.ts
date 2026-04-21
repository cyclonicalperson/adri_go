import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface DashboardStats {
  totalTourists: number;
  totalAdmins: number;
  totalLocations: number;
  totalPosts: number;       // alias — isti broj kao totalLocations
  totalRegions: number;
  totalRoutes: number;
  pendingRegistrations: number;
  pendingReviews: number;
  ticketsIssued: number;
  unreadNotifications: number;
}

export interface DailyVisit {
  date: string; // YYYY-MM-DD
  count: number;
}

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

/** @deprecated Use PopularPost */
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
 * Backend AnalyticsController.GetTouristMovements vraća:
 *   regionId, regionName, latitude, longitude, visitCount
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

  getDashboardStats(): Observable<ApiResponse<DashboardStats>> {
    return this.http.get<ApiResponse<DashboardStats>>(`${this.url}/stats`);
  }

  getDailyVisits(from: string, to: string): Observable<ApiResponse<DailyVisit[]>> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<ApiResponse<DailyVisit[]>>(`${this.url}/visits`, { params });
  }

  getPopularPosts(limit = 10): Observable<ApiResponse<PopularPost[]>> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<ApiResponse<PopularPost[]>>(`${this.url}/popular/posts`, { params });
  }

  /** @deprecated Use getPopularPosts() */
  getPopularObjects(limit = 10): Observable<ApiResponse<PopularPost[]>> {
    return this.getPopularPosts(limit);
  }

  getPopularEvents(limit = 10): Observable<ApiResponse<PopularPost[]>> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<ApiResponse<PopularPost[]>>(`${this.url}/popular/events`, { params });
  }

  getRegionPopularity(): Observable<ApiResponse<RegionPopularity[]>> {
    return this.http.get<ApiResponse<RegionPopularity[]>>(`${this.url}/regions`);
  }

  getTouristMovements(): Observable<ApiResponse<TouristMovement[]>> {
    return this.http.get<ApiResponse<TouristMovement[]>>(`${this.url}/movements`);
  }
}
