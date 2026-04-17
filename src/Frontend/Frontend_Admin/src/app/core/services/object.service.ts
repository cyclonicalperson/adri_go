/**
 * object.service.ts
 *
 * Mapirano na /api/posts (backend PostsController).
 * "Objekti" su svi postovi čiji post_type NIJE "event".
 * Pretvara Post odgovor u TouristObject interfejs koji komponente očekuju.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TouristObject,
  CreateObjectRequest,
  UpdateObjectRequest,
} from '../models/object.model';
import {
  ApiResponse,
  PaginatedResponse,
  PageRequest,
} from '../models/api-response.model';

// Mapiranje iz frontend kategorije u backend post_type
const CATEGORY_TO_POST_TYPE: Record<string, string> = {
  HOTEL:       'accommodation',
  APARTMENT:   'accommodation',
  RESTAURANT:  'restaurant',
  CAFE:        'restaurant',
  CLUB:        'club',
  SHOP:        'shop',
  CULTURAL:    'cultural_site',
  MONUMENT:    'monument',
  SPORT:       'sports_facility',
  NATURE:      'attraction',
  OTHER:       'other',
};

const POST_TYPE_TO_CATEGORY: Record<string, string> = {
  accommodation:    'HOTEL',
  restaurant:       'RESTAURANT',
  club:             'CLUB',
  shop:             'SHOP',
  cultural_site:    'CULTURAL',
  monument:         'MONUMENT',
  sports_facility:  'SPORT',
  attraction:       'NATURE',
  other:            'OTHER',
};

@Injectable({ providedIn: 'root' })
export class ObjectService {
  private readonly url = `${environment.apiUrl}/posts`;

  constructor(private http: HttpClient) {}

  getAll(
    req: PageRequest & { destinationId?: number; regionId?: number; category?: string; status?: string }
  ): Observable<PaginatedResponse<TouristObject>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('pageSize', req.pageSize);

    if (req.sortBy)  params = params.set('sortBy', req.sortBy);
    if (req.sortDir) params = params.set('sortDir', req.sortDir!);
    if (req.search)  params = params.set('search', req.search);

    // Filtriramo po regionId
    const rid = req.regionId ?? req.destinationId;
    if (rid) params = params.set('region_id', rid);

    // Mapiramo kategoriju u post_type
    if (req.category && req.category !== 'OTHER') {
      const pt = CATEGORY_TO_POST_TYPE[req.category];
      if (pt) params = params.set('type', pt);
    }

    // Status filter (draft/published/archived)
    if (req.status) params = params.set('status', req.status);

    return this.http.get<any>(this.url, { params }).pipe(
      map(res => {
        // Backend vraća sve tipove — filtriramo na klijentskoj strani da izuzmemo event
        const allPosts: any[] = res.data ?? [];
        const nonEvents = allPosts.filter((p: any) => p.postType !== 'event');
        return {
          data:       nonEvents.map(postToObject),
          total:      res.total ?? nonEvents.length,
          page:       res.page ?? req.page,
          pageSize:   res.pageSize ?? req.pageSize,
          totalPages: res.totalPages ?? 1,
        };
      })
    );
  }

  getById(id: number): Observable<ApiResponse<TouristObject>> {
    return this.http.get<any>(`${this.url}/${id}`).pipe(
      map(res => ({
        data:    postToObject(res.data ?? res),
        success: res.success ?? true,
      }))
    );
  }

  create(payload: CreateObjectRequest): Observable<ApiResponse<TouristObject>> {
    const body: any = {
      regionId:         payload.regionId ?? payload.destinationId,
      title:            payload.name,
      postType:         CATEGORY_TO_POST_TYPE[payload.category] ?? 'other',
      description:      payload.description,
      address:          payload.address,
      lat:              payload.latitude,
      lng:              payload.longitude,
      externalUrl:      payload.website ?? null,
      openingHours:     payload.workingHours ? { text: payload.workingHours } : null,
      details:          payload.phone ? { phone: payload.phone } : null,
      images:           payload.media?.map(m => m.url) ?? [],
      status:           'draft',
    };
    return this.http.post<any>(this.url, body).pipe(
      map(res => ({ data: postToObject(res.data ?? res), success: true }))
    );
  }

  update(id: number, payload: UpdateObjectRequest): Observable<ApiResponse<TouristObject>> {
    const body: any = {};
    if (payload.name !== undefined) body['title'] = payload.name;
    if (payload.category !== undefined) body['postType'] = CATEGORY_TO_POST_TYPE[payload.category] ?? 'other';
    if (payload.description !== undefined) body['description'] = payload.description;
    if (payload.address !== undefined) body['address'] = payload.address;
    if (payload.latitude !== undefined) body['lat'] = payload.latitude;
    if (payload.longitude !== undefined) body['lng'] = payload.longitude;
    if (payload.website !== undefined) body['externalUrl'] = payload.website;
    if (payload.workingHours !== undefined) body['openingHours'] = payload.workingHours ? { text: payload.workingHours } : null;
    if (payload.phone !== undefined) body['details'] = payload.phone ? { phone: payload.phone } : null;
    if (payload.media !== undefined) body['images'] = payload.media.map(m => m.url);
    if (payload.status !== undefined) body['status'] = payload.status;
    const rid = payload.regionId ?? payload.destinationId;
    if (rid !== undefined) body['regionId'] = rid;

    return this.http.put<any>(`${this.url}/${id}`, body).pipe(
      map(res => ({ data: postToObject(res.data ?? res), success: true }))
    );
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<any>(`${this.url}/${id}`).pipe(
      map(res => ({ data: undefined, success: res.success ?? true }))
    );
  }
}

/** Pretvara backend Post u TouristObject interfejs */
function postToObject(p: any): TouristObject {
  if (!p) return {} as TouristObject;
  const regionData = p.region ?? null;
  return {
    objectId:      p.id ?? p.postId,
    destinationId: p.regionId ?? 0,
    regionId:      p.regionId,
    name:          p.title ?? '',
    category:      (POST_TYPE_TO_CATEGORY[p.postType] ?? 'OTHER') as any,
    description:   p.description ?? '',
    address:       p.address ?? '',
    latitude:      p.lat ?? p.latitude ?? 0,
    longitude:     p.lng ?? p.longitude ?? 0,
    phone:         '',
    website:       p.externalUrl ?? '',
    workingHours:  p.openingHours?.text ?? '',
    createdBy:     p.adminId ?? 0,
    createdAt:     p.createdAt ?? '',
    destination:   regionData ? { destinationId: regionData.regionId ?? regionData.id, name: regionData.name } : null,
    region:        regionData ? { regionId: regionData.regionId ?? regionData.id, name: regionData.name } : null,
    averageRating: p.avgRating ?? null,
    reviewCount:   p.reviewCount ?? 0,
    media:         (p.images ?? []).map((url: string, idx: number) => ({
      mediaId: idx + 1,
      url,
      sortOrder: idx,
    })),
    // Čuvamo originalnu status vrijednost (za filter u UI)
    ...(p.status ? { status: p.status } : {}),
  } as any;
}
