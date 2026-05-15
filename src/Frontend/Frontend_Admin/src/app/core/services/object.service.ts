/**
 * object.service.ts — mapirano na /api/posts
 * "Objekti" su svi postovi čiji post_type NIJE "event".
 *
 * KRITIČNA ISPRAVKA: backend vraća openingHours i details kao JSON STRING
 * (npr: '{"text":"08:00-22:00"}'), ne kao objekat. parseJsonField() ih parsira
 * pre čitanja svojstava — ovo je bio uzrok zbog kojeg izmene nikad nisu bile vidljive.
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

const CATEGORY_TO_POST_TYPE: Record<string, string> = {
  HOTEL: 'accommodation',
  APARTMENT: 'accommodation',
  RESTAURANT: 'restaurant',
  CAFE: 'restaurant',
  CLUB: 'club',
  SHOP: 'shop',
  CULTURAL: 'cultural_site',
  MONUMENT: 'monument',
  SPORT: 'sports_facility',
  NATURE: 'attraction',
  OTHER: 'other',
};

const POST_TYPE_TO_CATEGORY: Record<string, string> = {
  accommodation: 'HOTEL',
  restaurant: 'RESTAURANT',
  club: 'CLUB',
  shop: 'SHOP',
  cultural_site: 'CULTURAL',
  monument: 'MONUMENT',
  sports_facility: 'SPORT',
  attraction: 'NATURE',
  other: 'OTHER',
};

/**
 * Parsira JSON string ili vraća objekat direktno.
 * Backend čuva openingHours i details kao JSON string u TEXT koloni.
 */
function parseJsonField(val: any): any {
  if (!val) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return null; }
  }
  return null;
}

@Injectable({ providedIn: 'root' })
export class ObjectService {
  private readonly url = `${environment.apiUrl}/posts`;

  constructor(private http: HttpClient) { }

  getAll(
    req: PageRequest & { destinationId?: number; regionId?: number; category?: string; status?: string }
  ): Observable<PaginatedResponse<TouristObject>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('pageSize', req.pageSize)
      .set('excludeType', 'event');  // isključi evente — oni imaju svoju listu

    if (req.sortBy) params = params.set('sortBy', req.sortBy);
    if (req.sortDir) params = params.set('sortDir', req.sortDir!);
    if (req.search) params = params.set('search', req.search);

    const rid = req.regionId ?? req.destinationId;
    if (rid) params = params.set('region_id', rid);

    if (req.category) {
      const pt = CATEGORY_TO_POST_TYPE[req.category];
      if (pt) params = params.set('type', pt);
    }

    if (req.status) params = params.set('status', req.status);

    return this.http.get<any>(this.url, { params }).pipe(
      map(res => {
        const posts: any[] = res.data ?? [];
        return {
          data: posts.map(postToObject),
          total: res.total ?? posts.length,
          page: res.page ?? req.page,
          pageSize: res.pageSize ?? req.pageSize,
          totalPages: res.totalPages ?? Math.ceil((res.total ?? posts.length) / (req.pageSize || 10)),
        };
      })
    );
  }

  getById(id: number): Observable<ApiResponse<TouristObject>> {
    return this.http.get<any>(`${this.url}/${id}`).pipe(
      map(res => ({
        data: postToObject(res.data ?? res),
        success: res.success ?? true,
      }))
    );
  }

  create(payload: CreateObjectRequest): Observable<ApiResponse<TouristObject>> {
    const body: any = {
      regionId: payload.regionId ?? payload.destinationId,
      title: payload.name,
      postType: CATEGORY_TO_POST_TYPE[payload.category] ?? 'other',
      description: payload.description,
      address: payload.address,
      lat: payload.latitude,
      lng: payload.longitude,
      externalUrl: payload.website ?? null,
      openingHours: payload.workingHours ? { text: payload.workingHours } : null,
      details: payload.phone ? { phone: payload.phone, website: payload.website ?? null } : null,
      images: (payload.media ?? [])
        .filter(m => m.url && (m.url.startsWith('http://') || m.url.startsWith('https://')))
        .map(m => m.url),
      status: 'draft',
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
    if (payload.media !== undefined) body['images'] = payload.media
      .filter(m => m.url && (m.url.startsWith('http://') || m.url.startsWith('https://')))
      .map(m => m.url);
    if (payload.status !== undefined) body['status'] = payload.status;
    if (payload.activityIds !== undefined) body['tagIds'] = payload.activityIds;
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

  // KRITIČNO: backend vraca openingHours i details kao JSON string
  const oh = parseJsonField(p.openingHours);
  const det = parseJsonField(p.details);

  const regionData = p.region ?? null;
  // Backend šalje regionName i regionId kao flat polja u PostDto
  // p.region nested objekat ne postoji — koristimo flat polja
  const regionName = p.regionName ?? regionData?.name ?? null;
  const regionId = p.regionId ?? regionData?.regionId ?? regionData?.id ?? 0;

  let imgs: string[] = [];
  if (Array.isArray(p.images)) {
    imgs = p.images;
  } else if (typeof p.images === 'string' && p.images) {
    try { imgs = JSON.parse(p.images); } catch { imgs = []; }
  }

  return {
    objectId: p.id ?? p.postId,
    destinationId: p.regionId ?? 0,
    regionId: regionId,
    name: p.title ?? '',
    category: (POST_TYPE_TO_CATEGORY[p.postType] ?? 'OTHER') as any,
    description: p.description ?? '',
    address: p.address ?? '',
    latitude: p.lat ?? p.latitude ?? 0,
    longitude: p.lng ?? p.longitude ?? 0,
    phone: det?.phone ?? '',
    website: p.externalUrl ?? det?.website ?? '',
    workingHours: oh?.text ?? '',
    createdBy: p.adminId ?? p.adminId ?? 0,
    createdAt: p.createdAt ?? '',
    destination: regionName ? { destinationId: regionId, name: regionName } : null,
    region: regionName ? { regionId: regionId, name: regionName } : null,
    averageRating: p.avgRating ?? null,
    reviewCount: p.reviewCount ?? 0,
    activities: (p.tagIds ?? []).map((id: number, idx: number) => ({
      activityId: id,
      name: (p.tagNames ?? p.TagNames ?? [])[idx] ?? '',
    })),
    media: imgs.map((url: string, idx: number) => ({
      mediaId: idx + 1,
      url,
      sortOrder: idx,
    })),
    ...(p.status ? { status: p.status } : {}),
  } as any;
}
