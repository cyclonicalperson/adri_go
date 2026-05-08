import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedResponse, PageRequest } from '../models/api-response.model';

export interface TouristUser {
  id: number;
  name: string;
  email: string;
  language: string;
  location: string | null;
  profileImage: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TouristUserDetail extends TouristUser {
  bio: string | null;
  interests: string | null;
  homeLat: number | null;
  homeLng: number | null;
  reviewsCount: number;
  viewsCount: number;
  likesCount: number;
  savedCount: number;
  favoritesCount: number;
}

// ── Activity / recommender profile ────────────────────────────────────────

export interface ActivityPost {
  postId: number;
  title: string;
  postType: string;
  date: string;
  durationSec?: number | null;
}

export interface ActivityReview {
  reviewId: number;
  postId: number | null;
  postTitle: string | null;
  rating: number;
  comment: string | null;
  status: string;
  reviewedAt: string;
}

export interface CategoryPref {
  postType: string;
  count: number;
}

export interface TouristActivity {
  recentViews:     ActivityPost[];
  recentLikes:     ActivityPost[];
  recentSaved:     ActivityPost[];
  recentReviews:   ActivityReview[];
  viewPreferences: CategoryPref[];
  likePreferences: CategoryPref[];
}

@Injectable({ providedIn: 'root' })
export class AdminTouristService {
  private readonly url = `${environment.apiUrl}/tourists`;

  constructor(private http: HttpClient) {}

  getAll(req: PageRequest & { accountStatus?: string }): Observable<PaginatedResponse<TouristUser>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('pageSize', req.pageSize);

    if (req.sortBy)       params = params.set('sortBy',        req.sortBy);
    if (req.sortDir)      params = params.set('sortDir',       req.sortDir!);
    if (req.search)       params = params.set('search',        req.search);
    if (req.accountStatus) params = params.set('accountStatus', req.accountStatus);

    return this.http.get<any>(this.url, { params }).pipe(
      map(res => ({
        data:       (res.data ?? []).map(mapTourist),
        total:      res.total      ?? 0,
        page:       res.page       ?? req.page,
        pageSize:   res.pageSize   ?? req.pageSize,
        totalPages: res.totalPages ?? 1,
      }))
    );
  }

  suspend(id: number): Observable<ApiResponse<TouristUser>> {
    return this.http.patch<any>(`${this.url}/${id}/suspend`, {}).pipe(
      map(res => ({ data: mapTourist(res.data ?? res), success: true }))
    );
  }

  activate(id: number): Observable<ApiResponse<TouristUser>> {
    return this.http.patch<any>(`${this.url}/${id}/activate`, {}).pipe(
      map(res => ({ data: mapTourist(res.data ?? res), success: true }))
    );
  }

  getById(id: number): Observable<ApiResponse<TouristUserDetail>> {
    return this.http.get<any>(`${this.url}/${id}`).pipe(
      map(res => ({ data: mapTouristDetail(res.data ?? res), success: true }))
    );
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<any>(`${this.url}/${id}`).pipe(
      map(res => ({ data: undefined, success: res.success ?? true }))
    );
  }

  getActivity(id: number): Observable<ApiResponse<TouristActivity>> {
    return this.http.get<any>(`${this.url}/${id}/activity`).pipe(
      map(res => ({ data: mapActivity(res.data ?? res), success: true }))
    );
  }
}

function mapTourist(t: any): TouristUser {
  if (!t) return {} as TouristUser;
  return {
    id:              t.id,
    name:            t.name ?? '',
    email:           t.email ?? '',
    language:        t.language ?? 'en',
    location:        t.location ?? null,
    profileImage:    t.profileImage ?? null,
    isActive:        t.isActive ?? true,
    isEmailVerified: t.isEmailVerified ?? false,
    createdAt:       t.createdAt ?? '',
    updatedAt:       t.updatedAt ?? '',
  };
}

function mapTouristDetail(t: any): TouristUserDetail {
  return {
    ...mapTourist(t),
    bio:           t.bio ?? null,
    interests:     t.interests ?? null,
    homeLat:       t.homeLat ?? null,
    homeLng:       t.homeLng ?? null,
    reviewsCount:  t.reviewsCount ?? 0,
    viewsCount:    t.viewsCount ?? 0,
    likesCount:    t.likesCount ?? 0,
    savedCount:    t.savedCount ?? 0,
    favoritesCount: t.favoritesCount ?? 0,
  };
}

function mapActivity(d: any): TouristActivity {
  if (!d) return { recentViews: [], recentLikes: [], recentSaved: [], recentReviews: [], viewPreferences: [], likePreferences: [] };
  return {
    recentViews: (d.recentViews ?? []).map((v: any): ActivityPost => ({
      postId: v.postId, title: v.title ?? '', postType: v.postType ?? 'other',
      date: v.viewedAt ?? '', durationSec: v.durationSec ?? null,
    })),
    recentLikes: (d.recentLikes ?? []).map((l: any): ActivityPost => ({
      postId: l.postId, title: l.title ?? '', postType: l.postType ?? 'other',
      date: l.likedAt ?? '',
    })),
    recentSaved: (d.recentSaved ?? []).map((s: any): ActivityPost => ({
      postId: s.postId, title: s.title ?? '', postType: s.postType ?? 'other',
      date: s.savedAt ?? '',
    })),
    recentReviews: (d.recentReviews ?? []).map((r: any): ActivityReview => ({
      reviewId: r.reviewId, postId: r.postId ?? null, postTitle: r.postTitle ?? null,
      rating: r.rating ?? 0, comment: r.comment ?? null,
      status: r.status ?? 'PENDING', reviewedAt: r.reviewedAt ?? '',
    })),
    viewPreferences: (d.viewPreferences ?? []).map((p: any): CategoryPref => ({
      postType: p.postType ?? 'other', count: p.count ?? 0,
    })),
    likePreferences: (d.likePreferences ?? []).map((p: any): CategoryPref => ({
      postType: p.postType ?? 'other', count: p.count ?? 0,
    })),
  };
}
