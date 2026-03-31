import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface DashboardStats {
  totalDestinations: number;
  totalObjects: number;
  totalEvents: number;
  totalRoutes: number;
  totalUsers: number;
  pendingReviews: number;
}

export interface DailyVisit {
  date: string;
  count: number;
}

export interface PopularEntity {
  id: number;
  name: string;
  category: string;
  viewCount: number;
  averageRating: number;
}

export interface TouristMovement {
  destinationId: number;
  destinationName: string;
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

  getPopularObjects(limit = 10): Observable<ApiResponse<PopularEntity[]>> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<ApiResponse<PopularEntity[]>>(`${this.url}/popular/objects`, { params });
  }

  getPopularEvents(limit = 10): Observable<ApiResponse<PopularEntity[]>> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<ApiResponse<PopularEntity[]>>(`${this.url}/popular/events`, { params });
  }

  getTouristMovements(): Observable<ApiResponse<TouristMovement[]>> {
    return this.http.get<ApiResponse<TouristMovement[]>>(`${this.url}/movements`);
  }
}
