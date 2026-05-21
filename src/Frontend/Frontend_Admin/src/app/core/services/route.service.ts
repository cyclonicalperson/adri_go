import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  PaginatedResponse,
  PageRequest,
} from '../models/api-response.model';
import {
  CreateRouteRequest,
  RouteStatus,
  TouristRoute,
  UpdateRouteRequest,
} from '../models/route.model';
import { Review } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class RouteService {
  private readonly url = `${environment.apiUrl}/routes`;

  constructor(private http: HttpClient) {}

  getAll(req: PageRequest & {
    destinationId?: number;
    regionId?: number;
    difficulty?: string;
    status?: string;
  }): Observable<PaginatedResponse<TouristRoute>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('pageSize', req.pageSize);

    if (req.sortBy) params = params.set('sortBy', req.sortBy);
    if (req.sortDir) params = params.set('sortDir', req.sortDir);
    if (req.search) params = params.set('search', req.search);

    const rid = req.regionId ?? req.destinationId;
    if (rid) params = params.set('region_id', rid);
    if (req.difficulty) params = params.set('difficulty', req.difficulty.toLowerCase());
    if (req.status) params = params.set('status', req.status);

    return this.http.get<any>(this.url, { params }).pipe(
      map(res => ({
        data: (res.data ?? []).map(backendToRoute),
        total: res.total ?? 0,
        page: res.page ?? req.page,
        pageSize: res.pageSize ?? req.pageSize,
        totalPages: res.totalPages ?? 1,
      })),
    );
  }

  getById(id: number): Observable<ApiResponse<TouristRoute>> {
    return this.http.get<any>(`${this.url}/${id}`).pipe(
      map(res => ({
        data: backendToRoute(res.data ?? res),
        success: res.success ?? true,
      })),
    );
  }

  getReviews(id: number): Observable<Review[]> {
    return this.http.get<any>(`${this.url}/${id}/reviews`).pipe(
      map(res => (res.data ?? []).map((review: any) => backendRouteReviewToReview(review, id))),
    );
  }

  create(payload: CreateRouteRequest): Observable<ApiResponse<TouristRoute>> {
    const proposedRegionName = normalizeProposedRegionName(payload.proposedRegionName);
    const regionId = proposedRegionName ? null : (payload.destinationId ?? payload.regionId);

    const waypointsJson = payload.waypoints
      ? JSON.stringify(payload.waypoints.map(w => ({
          lat: w.latitude,
          lng: w.longitude,
          name: '',
        })))
      : undefined;

    const body: any = {
      regionId,
      proposedRegionName,
      name: payload.name,
      difficulty: payload.difficulty?.toLowerCase() ?? 'moderate',
      distanceKm: payload.distanceKm,
      durationMin: payload.durationMin,
      elevationGainM: payload.elevationGainM,
      description: payload.description,
      waypoints: waypointsJson,
      images: JSON.stringify(payload.images ?? []),
    };

    const nextStatus = resolvePayloadStatus(payload);
    if (nextStatus) body.status = nextStatus;

    return this.http.post<any>(this.url, body).pipe(
      map(res => ({ data: backendToRoute(res.data ?? res), success: true })),
    );
  }

  update(id: number, payload: UpdateRouteRequest): Observable<ApiResponse<TouristRoute>> {
    const body: any = {};
    const proposedRegionName = normalizeProposedRegionName(payload.proposedRegionName);
    const regionId = proposedRegionName ? null : (payload.destinationId ?? payload.regionId);

    if (payload.name !== undefined) body.name = payload.name;
    if (payload.difficulty !== undefined) body.difficulty = payload.difficulty.toLowerCase();
    if (payload.distanceKm !== undefined) body.distanceKm = payload.distanceKm;
    if (payload.durationMin !== undefined) body.durationMin = payload.durationMin;
    if (payload.elevationGainM !== undefined) body.elevationGainM = payload.elevationGainM;
    if (payload.description !== undefined) body.description = payload.description;
    if (regionId !== undefined) body.regionId = regionId;
    if (payload.proposedRegionName !== undefined) {
      body.proposedRegionName = proposedRegionName;
      if (proposedRegionName) body.regionId = null;
    }
    if (payload.images !== undefined) body.images = JSON.stringify(payload.images ?? []);
    const nextStatus = resolvePayloadStatus(payload);
    if (nextStatus) body.status = nextStatus;

    if (payload.waypoints) {
      body.waypoints = JSON.stringify(payload.waypoints.map(w => ({
        lat: w.latitude,
        lng: w.longitude,
        name: '',
      })));
    }

    return this.http.put<any>(`${this.url}/${id}`, body).pipe(
      map(res => ({ data: backendToRoute(res.data ?? res), success: true })),
    );
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<any>(`${this.url}/${id}`).pipe(
      map(res => ({ data: undefined, success: res.success ?? true })),
    );
  }
}

function backendToRoute(r: any): TouristRoute {
  if (!r) return {} as TouristRoute;

  let waypointsParsed: any[] = [];
  if (r.waypoints) {
    try {
      waypointsParsed = typeof r.waypoints === 'string'
        ? JSON.parse(r.waypoints)
        : r.waypoints;
    } catch {
      waypointsParsed = [];
    }
  }

  let imagesParsed: string[] = [];
  if (r.images) {
    try {
      imagesParsed = typeof r.images === 'string'
        ? JSON.parse(r.images)
        : r.images;
    } catch {
      imagesParsed = [];
    }
  }

  const regionData = r.region ?? null;
  const firstWp = waypointsParsed[0];
  const lastWp = waypointsParsed[waypointsParsed.length - 1];

  return {
    routeId: r.routeId ?? r.id,
    destinationId: r.regionId ?? r.destinationId ?? 0,
    regionId: r.regionId ?? r.destinationId ?? null,
    proposedRegionName: r.proposedRegionName ?? null,
    name: r.name ?? '',
    difficulty: (r.difficulty?.toUpperCase() ?? 'MODERATE') as any,
    distanceKm: r.distanceKm ?? 0,
    durationMin: r.durationMin ?? 0,
    elevationGainM: r.elevationGainM ?? r.elevationGain ?? 0,
    description: r.description ?? '',
    startLatitude: firstWp?.lat ?? 0,
    startLongitude: firstWp?.lng ?? 0,
    endLatitude: lastWp?.lat ?? 0,
    endLongitude: lastWp?.lng ?? 0,
    isActive: r.status === 'published',
    createdBy: r.adminId ?? 0,
    images: Array.isArray(imagesParsed) ? imagesParsed : [],
    waypoints: waypointsParsed.map((w: any, i: number) => ({
      waypointId: i + 1,
      routeId: r.routeId ?? r.id,
      latitude: w.lat ?? 0,
      longitude: w.lng ?? 0,
      sequenceOrder: i + 1,
    })),
    destination: regionData
      ? { destinationId: regionData.regionId ?? regionData.id, name: regionData.name }
      : undefined,
    viewCount: r.viewCount ?? 0,
    saveCount: r.saveCount ?? 0,
    ...(r.status ? { status: r.status } : {}),
  } as any;
}

function resolvePayloadStatus(payload: Partial<CreateRouteRequest | UpdateRouteRequest>): RouteStatus | undefined {
  if (payload.status) {
    return payload.status;
  }

  if (payload.isActive !== undefined) {
    return payload.isActive ? 'published' : 'draft';
  }

  return undefined;
}

function normalizeProposedRegionName(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function backendRouteReviewToReview(review: any, routeId: number): Review {
  return {
    reviewId: review.reviewId ?? review.id,
    touristId: review.touristId ?? null,
    postId: null,
    routeId,
    rating: review.rating ?? 0,
    comment: review.comment ?? null,
    status: 'APPROVED',
    createdAt: review.createdAt,
    touristName: review.touristName ?? null,
    user: review.touristId ? { userId: review.touristId, fullName: review.touristName ?? '' } : null,
    entityType: 'ROUTE',
    entityName: review.routeName ?? null,
    postType: null,
  };
}
