import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CrossCategoryRecommendation } from '../models/recommendation.model';

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  private readonly apiUrl = 'https://localhost:5001/api/recommendations';

  constructor(private http: HttpClient) {}

  getCrossCategoryRecommendations(
    sourceCategory: string,
    destinationId: number
  ): Observable<CrossCategoryRecommendation[]> {
    const params = new HttpParams()
      .set('sourceCategory', sourceCategory)
      .set('destinationId', destinationId);

    return this.http.get<CrossCategoryRecommendation[]>(
      `${this.apiUrl}/cross-category`,
      { params }
    );
  }
}