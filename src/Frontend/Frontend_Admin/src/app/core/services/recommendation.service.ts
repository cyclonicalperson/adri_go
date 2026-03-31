import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface Recommendation {
  recommendationId: number;
  entityType: 'OBJECT' | 'EVENT' | 'ROUTE';
  entityId: number;
  entityName: string;
  reason: string;
  score: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly url = `${environment.apiUrl}/recommendations`;

  constructor(private http: HttpClient) { }

  getForSession(sessionId: string, limit = 6): Observable<ApiResponse<Recommendation[]>> {
    const params = new HttpParams()
      .set('sessionId', sessionId)
      .set('limit', limit);
    return this.http.get<ApiResponse<Recommendation[]>>(this.url, { params });
  }

  getForUser(userId: number, limit = 6): Observable<ApiResponse<Recommendation[]>> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<ApiResponse<Recommendation[]>>(`${this.url}/user/${userId}`, { params });
  }
}
