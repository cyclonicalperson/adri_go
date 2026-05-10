import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Activity, ActivityCategory, ActivityStatus, CreateActivityRequest, UpdateActivityRequest } from '../models/activity.model';
import { ApiResponse, PaginatedResponse, PageRequest } from '../models/api-response.model';

export interface ActivityQuery extends PageRequest {
  category?: ActivityCategory | string;
  status?: ActivityStatus | string;
}

export interface ActivityPageResponse extends PaginatedResponse<Activity> {
  sportCount: number;
  natureCount: number;
  wellnessCount: number;
  pendingCount: number;
}

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly url = `${environment.apiUrl}/activities`;

  constructor(private http: HttpClient) { }

  getAll(req: ActivityQuery): Observable<ActivityPageResponse> {
    let params = new HttpParams()
      .set('page', req.page ?? 1)
      .set('pageSize', req.pageSize ?? 10);

    if (req.sortBy) params = params.set('sortBy', req.sortBy);
    if (req.sortDir) params = params.set('sortDir', req.sortDir);
    if (req.search) params = params.set('search', req.search);
    if (req.category) params = params.set('category', req.category);
    if (req.status) params = params.set('status', req.status);

    return this.http.get<any>(this.url, { params }).pipe(
      map(res => {
        const data = (res.data ?? []).map((item: any) => normalizeActivity(item));
        return {
          data,
          total: res.total ?? data.length,
          page: res.page ?? (req.page ?? 1),
          pageSize: res.pageSize ?? (req.pageSize ?? 10),
          totalPages: res.totalPages ?? Math.max(1, Math.ceil((res.total ?? data.length) / (req.pageSize ?? 10))),
          sportCount: res.sportCount ?? data.filter(item => item.category === 'SPORT').length,
          natureCount: res.natureCount ?? data.filter(item => item.category === 'ADVENTURE').length,
          wellnessCount: res.wellnessCount ?? data.filter(item => item.category === 'WELLNESS').length,
          pendingCount: res.pendingCount ?? data.filter(item => item.status === 'pending').length,
        };
      }),
    );
  }

  getById(id: number): Observable<ApiResponse<Activity>> {
    return this.http.get<any>(`${this.url}/${id}`).pipe(
      map(res => ({
        data: normalizeActivity(res.data ?? res),
        success: res.success ?? true,
      })),
    );
  }

  create(payload: CreateActivityRequest): Observable<ApiResponse<Activity>> {
    return this.http.post<any>(this.url, toActivityPayload(payload)).pipe(
      map(res => ({
        data: normalizeActivity(res.data ?? res),
        success: res.success ?? true,
      })),
    );
  }

  update(id: number, payload: UpdateActivityRequest): Observable<ApiResponse<Activity>> {
    return this.http.put<any>(`${this.url}/${id}`, toActivityPayload(payload)).pipe(
      map(res => ({
        data: normalizeActivity(res.data ?? res),
        success: res.success ?? true,
      })),
    );
  }

  updateStatus(id: number, status: ActivityStatus): Observable<ApiResponse<Activity>> {
    return this.update(id, { status });
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<any>(`${this.url}/${id}`).pipe(
      map(res => ({
        data: undefined,
        success: res.success ?? true,
      })),
    );
  }
}

function normalizeActivity(item: any): Activity {
  return {
    activityId: item?.activityId ?? item?.id ?? 0,
    name: item?.name ?? '',
    category: (item?.category ?? 'OTHER') as ActivityCategory,
    description: item?.description ?? '',
    duration: item?.duration ?? '',
    difficulty: item?.difficulty ?? '',
    maxCapacity: item?.maxCapacity ?? null,
    tags: item?.tags ?? '',
    postId: item?.postId ?? null,
    lat: item?.lat ?? item?.latitude ?? null,
    lng: item?.lng ?? item?.longitude ?? null,
    locationName: item?.locationName ?? '',
    color: item?.color ?? undefined,
    status: (item?.status ?? 'approved') as ActivityStatus,
    viewCount: Number(item?.viewCount ?? 0),
    linkedPosts: Number(item?.linkedPosts ?? 0),
  };
}

function toActivityPayload(payload: Partial<CreateActivityRequest>): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if ('name' in payload) body['name'] = payload.name;
  if ('category' in payload) body['category'] = payload.category;
  if ('status' in payload) body['status'] = payload.status;
  if ('description' in payload) body['description'] = payload.description ?? '';
  if ('duration' in payload) body['duration'] = payload.duration ?? '';
  if ('difficulty' in payload) body['difficulty'] = payload.difficulty ?? '';
  if ('maxCapacity' in payload) body['maxCapacity'] = payload.maxCapacity ?? null;
  if ('tags' in payload) body['tags'] = payload.tags ?? '';
  if ('latitude' in payload) body['latitude'] = payload.latitude ?? null;
  if ('longitude' in payload) body['longitude'] = payload.longitude ?? null;
  if ('postId' in payload) body['postId'] = payload.postId ?? null;
  if ('clearPost' in payload) body['clearPost'] = payload.clearPost;

  return body;
}
