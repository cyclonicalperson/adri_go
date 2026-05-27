import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TouristActivityItem {
  id: number;
  name: string;
  category: string;
  color?: string;
  description?: string;
  duration?: string;
  difficulty?: string;
  tags?: string;
  locationName?: string;
  lat?: number | null;
  lng?: number | null;
  postId?: number | null;
  postIds?: number[];
  viewCount?: number;
  linkedPosts?: number;
}

@Injectable({ providedIn: 'root' })
export class TouristActivitiesService {
  private readonly url = `${environment.apiUrl}/activities`;

  constructor(private http: HttpClient) {}

  getActivities(search = '', sortBy = 'name', sortDir = 'asc'): Observable<TouristActivityItem[]> {
    let params = new HttpParams()
      .set('page', 1)
      .set('pageSize', 100)
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<any>(this.url, { params }).pipe(
      map(res => (res.data ?? []).map((item: any) => ({
        id: item.activityId ?? item.id,
        name: item.name ?? '',
        category: item.category ?? 'OTHER',
        color: item.color ?? '#22c55e',
        description: item.description ?? '',
        duration: item.duration ?? '',
        difficulty: item.difficulty ?? '',
        tags: item.tags ?? '',
        locationName: item.locationName ?? '',
        lat: this.normalizeCoordinate(item.lat),
        lng: this.normalizeCoordinate(item.lng),
        postId: item.postId ?? null,
        postIds: Array.isArray(item.postIds)
          ? item.postIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id))
          : [],
        viewCount: item.viewCount ?? 0,
        linkedPosts: item.linkedPosts ?? 0,
      }))),
    );
  }

  private normalizeCoordinate(value: unknown): number | null {
    if (value == null || value === '') return null;
    const coordinate = Number(value);
    return Number.isFinite(coordinate) ? coordinate : null;
  }
}
