import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse, PageRequest } from '../models/api-response.model';
import { CreatePostRequest, Post, PostStatus, PostType, UpdatePostRequest } from '../models/post.model';

export interface PostQuery extends PageRequest {
  regionId?: number;
  type?: PostType | string;
  excludeType?: PostType | string;
  status?: PostStatus | string;
}

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly url = `${environment.apiUrl}/posts`;

  constructor(private http: HttpClient) { }

  getAll(req: PostQuery): Observable<PaginatedResponse<Post>> {
    let params = new HttpParams()
      .set('page', req.page ?? 1)
      .set('pageSize', req.pageSize ?? 10);

    if (req.sortBy) params = params.set('sortBy', req.sortBy);
    if (req.sortDir) params = params.set('sortDir', req.sortDir);
    if (req.search) params = params.set('search', req.search);
    if (req.regionId) params = params.set('region_id', req.regionId);
    if (req.type) params = params.set('type', req.type);
    if (req.excludeType) params = params.set('excludeType', req.excludeType);
    if (req.status) params = params.set('status', req.status);

    return this.http.get<any>(this.url, { params }).pipe(
      map(res => {
        const data = (res.data ?? []).map((item: any) => normalizePost(item));
        return {
          data,
          total: res.total ?? data.length,
          page: res.page ?? (req.page ?? 1),
          pageSize: res.pageSize ?? (req.pageSize ?? 10),
          totalPages: res.totalPages ?? Math.max(1, Math.ceil((res.total ?? data.length) / (req.pageSize ?? 10))),
        };
      }),
    );
  }

  getById(id: number): Observable<ApiResponse<Post>> {
    return this.http.get<any>(`${this.url}/${id}`).pipe(
      map(res => ({
        data: normalizePost(res.data ?? res),
        success: res.success ?? true,
      })),
    );
  }

  create(payload: CreatePostRequest): Observable<ApiResponse<Post>> {
    return this.http.post<any>(this.url, payload).pipe(
      map(res => ({
        data: normalizePost(res.data ?? res),
        success: res.success ?? true,
      })),
    );
  }

  update(id: number, payload: UpdatePostRequest): Observable<ApiResponse<Post>> {
    return this.http.put<any>(`${this.url}/${id}`, payload).pipe(
      map(res => ({
        data: normalizePost(res.data ?? res),
        success: res.success ?? true,
      })),
    );
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

function normalizePost(item: any): Post {
  const details = parseJsonField(item?.details);
  const openingHours = parseJsonField(item?.openingHours);
  const images = parseImages(item?.images);
  const region = item?.region
    ? {
        regionId: item.region.regionId ?? item.region.id ?? item.regionId ?? 0,
        name: item.region.name ?? item.regionName ?? '',
        type: item.region.type ?? '',
        lat: item.region.lat ?? 0,
        lng: item.region.lng ?? 0,
        country: item.region.country ?? '',
      }
    : (item?.regionName
      ? {
          regionId: item.regionId ?? 0,
          name: item.regionName,
          type: '',
          lat: 0,
          lng: 0,
          country: '',
        }
      : null);

  return {
    postId: item?.postId ?? item?.id ?? 0,
    adminId: item?.adminId ?? 0,
    adminName: item?.adminName ?? undefined,
    adminRole: item?.adminRole ?? undefined,
    adminOrganizationId: item?.adminOrganizationId ?? null,
    regionId: item?.regionId ?? null,
    region,
    title: item?.title ?? '',
    postType: (item?.postType ?? 'other') as PostType,
    description: item?.description ?? null,
    lat: item?.lat ?? null,
    lng: item?.lng ?? null,
    address: item?.address ?? null,
    externalUrl: item?.externalUrl ?? null,
    externalUrlLabel: item?.externalUrlLabel ?? null,
    images,
    openingHours,
    details,
    status: (item?.status ?? 'draft') as PostStatus,
    viewCount: Number(item?.viewCount ?? 0),
    likeCount: Number(item?.likeCount ?? 0),
    saveCount: Number(item?.saveCount ?? 0),
    reviewCount: Number(item?.reviewCount ?? 0),
    avgRating: item?.avgRating ?? null,
    publishedAt: item?.publishedAt ?? null,
    createdAt: item?.createdAt ?? '',
    updatedAt: item?.updatedAt ?? '',
  };
}

function parseJsonField(value: any): Record<string, any> | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, any>
        : null;
    } catch {
      return null;
    }
  }

  return null;
}

function parseImages(value: any): string[] | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : null;
    } catch {
      return null;
    }
  }

  return null;
}
