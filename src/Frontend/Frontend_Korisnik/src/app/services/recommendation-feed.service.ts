import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Location } from './location.service';
import { RecommendationFeedItem } from '@recommended/services/recommendation-feed.service';

export type { RecommendationFeedItem };

@Injectable({ providedIn: 'root' })
export class RecommendationFeedService {
  private readonly apiUrl = `${environment.apiUrl}/recommendations`;

  constructor(private http: HttpClient) {}

  getRegionRecommendations(
    regionId: number,
    options: {
      contextMode?: 'onsite' | 'planning';
      take?: number;
      touristId?: number | null;
    } = {},
  ): Observable<RecommendationFeedItem[]> {
    let params = new HttpParams()
      .set('regionId', String(regionId))
      .set('contextMode', options.contextMode ?? 'onsite')
      .set('take', String(options.take ?? 8));

    if (options.touristId != null) {
      params = params.set('touristId', String(options.touristId));
    }

    return this.http.get<RecommendationFeedItem[]>(this.apiUrl, { params });
  }

  toLocationStub(item: RecommendationFeedItem): Location {
    return {
      id: item.entityId,
      adminId: 0,
      adminName: 'AdriGo',
      regionId: item.regionId ?? undefined,
      regionName: item.regionName ?? undefined,
      title: item.title,
      postType: item.postType,
      images: item.imageUrl ? JSON.stringify([item.imageUrl]) : undefined,
      address: item.regionName ?? '',
      status: 'published',
      viewCount: Number(item.viewCount ?? 0),
      likeCount: 0,
      saveCount: Number(item.saveCount ?? 0),
      reviewCount: Number(item.reviewCount ?? 0),
      avgRating: item.avgRating ?? undefined,
      createdAt: '',
      updatedAt: '',
    };
  }
}
