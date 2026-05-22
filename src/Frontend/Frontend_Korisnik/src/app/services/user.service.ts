import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { PlannerStop } from './route-planner.service';
import { RouteSummary } from './routing.service';
import { TravelMode } from './tourist-preferences.service';
import { Location } from './location.service';

export interface UserProfile {
  fullName: string;
  emailOrPhone: string;
  pendingEmail?: string | null;
  profilePic?: string;
  language: string;
  bio?: string;
  location?: string;
  interests: string[];
  stats: {
    saved: number;
    reviews: number;
    upcoming: number;
  };
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  language?: string;
  bio?: string;
  location?: string;
  interests?: string[];
  profileImage?: string | null;
}

export interface CalendarItem {
  id: number;
  postId: number | null;
  routeId?: number | null;
  touristRouteId?: number | null;
  title: string;
  postType: string;
  address: string;
  date: string;
  notes: string;
  scheduledTime: string;
  imageUrl: string | null;
}

export interface TouristRouteWaypoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface TouristRouteDetails {
  id: number;
  title: string;
  waypoints: TouristRouteWaypoint[];
  travelMode: string;
  scenicMode: boolean;
}

export interface PrivateRouteCalendarPayload {
  touristRouteId?: number;
  title?: string;
  waypoints?: string;
  travelMode?: string;
  scenicMode?: boolean;
  distanceKm?: number;
  durationMin?: number;
  scheduledAt: string;
}

export interface CalendarMutationResult {
  message: string;
  alreadyAdded?: boolean;
  localOnly?: boolean;
  addedCount?: number;
  alreadyCount?: number;
  savedTripId?: string;
}

export interface CalendarSchedulePayload {
  scheduledAt?: string | null;
}

/**
 * Describes an item the user wants to place on the calendar. It is handed to
 * the Calendar page (via router state) so the user can pick the day/time there
 * instead of using an inline date picker.
 */
export interface PendingScheduleBase {
  title: string;
  imageUrl?: string | null;
  address?: string | null;
}

export interface PendingPostSchedule extends PendingScheduleBase {
  kind: 'post';
  postId: number;
  postType: string;
  isEvent: boolean;
  /** ISO start/end of the event — when set, scheduling is limited to this range. */
  eventStart?: string | null;
  eventEnd?: string | null;
}

export interface PendingCuratedRouteSchedule extends PendingScheduleBase {
  kind: 'curatedRoute';
  routeId: number;
}

export interface PendingPrivateRouteSchedule extends PendingScheduleBase {
  kind: 'privateRoute';
  privateRoute: Omit<PrivateRouteCalendarPayload, 'scheduledAt'>;
}

export type PendingSchedule =
  | PendingPostSchedule
  | PendingCuratedRouteSchedule
  | PendingPrivateRouteSchedule;

export interface PostTypePreference {
  postType: string;
  likeCount: number;
  saveCount: number;
  viewCount: number;
  score: number;
}

export interface TagPreference {
  tagId: number;
  tagName: string;
  tagCategory: string;
  likeCount: number;
  saveCount: number;
  viewCount: number;
  score: number;
}

export interface RegionPreference {
  regionId: number;
  regionName: string;
  likeCount: number;
  saveCount: number;
  viewCount: number;
  score: number;
}

export interface ServerPreferences {
  summary: { totalLikes: number; totalSaves: number; totalViews: number; totalReviews: number };
  postTypePreferences: PostTypePreference[];
  tagPreferences: TagPreference[];
  regionPreferences: RegionPreference[];
}

interface TouristProfileResponse {
  id: number;
  name: string;
  email: string;
  pendingEmail?: string | null;
  language: string;
  bio?: string | null;
  location?: string | null;
  profileImage?: string | null;
  interests?: string[];
  savedPostsCount?: number;
  reviewsCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly authApiUrl = `${environment.apiUrl}/tourist-auth`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  getUserProfile(): Observable<UserProfile> {
    return this.http.get<TouristProfileResponse>(`${this.authApiUrl}/me`).pipe(
      map(profile => this.mapProfile(profile)),
    );
  }

  updateProfile(payload: UpdateProfilePayload): Observable<UserProfile> {
    return this.http.put<TouristProfileResponse>(`${this.authApiUrl}/profile`, payload).pipe(
      map(profile => this.mapProfile(profile)),
    );
  }

  uploadProfileImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${environment.apiUrl}/images/upload/profile`, formData).pipe(
      map(res => res.url),
    );
  }

  getCalendar(): Observable<CalendarItem[]> {
    if (!this.authService.isLoggedIn) {
      return of([]);
    }

    return this.http.get<CalendarItem[]>(`${this.authApiUrl}/calendar`);
  }

  addToCalendar(postId: number, schedule?: CalendarSchedulePayload): Observable<any> {
    if (!this.authService.isLoggedIn) {
      return throwError(() => ({ status: 401, message: 'Login required.' }));
    }

    return this.http.post(`${this.authApiUrl}/calendar/${postId}`, schedule ?? {});
  }

  addRouteToCalendar(routeId: number, schedule?: CalendarSchedulePayload): Observable<any> {
    if (!this.authService.isLoggedIn) {
      return throwError(() => ({ status: 401, message: 'Login required.' }));
    }

    return this.http.post(`${this.authApiUrl}/calendar/route/${routeId}`, schedule ?? {});
  }

  addPrivateRouteToCalendar(payload: PrivateRouteCalendarPayload): Observable<any> {
    if (!this.authService.isLoggedIn) {
      return throwError(() => ({ status: 401, message: 'Login required.' }));
    }

    return this.http.post(`${this.authApiUrl}/calendar/tourist-route`, payload);
  }

  getTouristRoute(id: number): Observable<TouristRouteDetails | null> {
    if (!this.authService.isLoggedIn) {
      return of(null);
    }

    return this.http.get<any>(`${this.authApiUrl}/tourist-routes/${id}`).pipe(
      map(res => {
        if (!res) return null;
        let waypoints: TouristRouteWaypoint[] = [];
        try {
          const parsed = typeof res.waypoints === 'string' ? JSON.parse(res.waypoints) : res.waypoints;
          waypoints = (Array.isArray(parsed) ? parsed : [])
            .map((p: any) => ({ lat: Number(p.lat ?? p.latitude), lng: Number(p.lng ?? p.longitude), name: p.name ?? '' }))
            .filter((p: TouristRouteWaypoint) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
        } catch {
          waypoints = [];
        }
        return {
          id: Number(res.id),
          title: res.title ?? '',
          waypoints,
          travelMode: res.travelMode ?? 'driving',
          scenicMode: !!res.scenicMode,
        };
      }),
    );
  }

  addLocationToCalendar(location: Pick<Location, 'id' | 'title' | 'postType' | 'address' | 'regionName' | 'images'> & { imageUrl?: string | null }, schedule?: CalendarSchedulePayload): Observable<CalendarMutationResult> {
    if (this.authService.isLoggedIn) {
      return this.http.post<any>(`${this.authApiUrl}/calendar/${location.id}`, schedule ?? {}).pipe(
        map(res => ({
          message: res?.updated
            ? 'Calendar date updated.'
            : res?.alreadyAdded
            ? 'Already in your server-synced calendar.'
            : 'Added to your server-synced calendar.',
          alreadyAdded: !!res?.alreadyAdded,
          localOnly: false,
        })),
      );
    }

    return throwError(() => ({ status: 401, message: 'Login required.' }));
  }

  saveTripToCalendar(
    stops: PlannerStop[],
    _routeSummary: RouteSummary,
    _options: {
      title: string;
      travelMode: TravelMode;
      scenicMode: boolean;
      emailNotifications?: boolean;
    },
  ): Observable<CalendarMutationResult> {
    const validStops = stops.filter(stop => stop.id > 0);
    if (validStops.length === 0) {
      return of({
        message: 'This trip has no savable destination stops yet.',
        localOnly: !this.authService.isLoggedIn,
        addedCount: 0,
        alreadyCount: 0,
      });
    }

    if (!this.authService.isLoggedIn) {
      return throwError(() => ({ status: 401, message: 'Login required.' }));
    }

    return forkJoin(validStops.map(stop =>
      this.http.post<any>(`${this.authApiUrl}/calendar/${stop.id}`, {}).pipe(
        map(result => ({ failed: false, alreadyAdded: !!result?.alreadyAdded })),
      )
    )).pipe(
      map(results => {
        const addedCount = results.filter(result => !result.failed && !result.alreadyAdded).length;
        const alreadyCount = results.filter(result => result.alreadyAdded).length;

        return {
          message: addedCount > 0
            ? `${addedCount} stop(s) added to your calendar.`
            : alreadyCount > 0
              ? 'These stops are already in your calendar.'
              : 'We could not save this trip to the calendar.',
          localOnly: false,
          addedCount,
          alreadyCount,
        };
      }),
    );
  }

  getMyServerPreferences(): Observable<ServerPreferences | null> {
    if (!this.authService.isLoggedIn) {
      return of(null);
    }

    return this.http
      .get<{ success: boolean; data: ServerPreferences }>(
        `${environment.apiUrl}/tourist-preferences/my`,
      )
      .pipe(map(res => res?.data ?? null));
  }

  removeCalendarItem(plannerItemId: number): Observable<any> {
    if (!this.authService.isLoggedIn) {
      return throwError(() => ({ status: 401, message: 'Login required.' }));
    }

    return this.http.delete(`${this.authApiUrl}/calendar/item/${plannerItemId}`);
  }

  private mapProfile(profile: TouristProfileResponse): UserProfile {
    return {
      fullName: profile?.name ?? '',
      emailOrPhone: profile?.email ?? '',
      pendingEmail: profile?.pendingEmail ?? null,
      profilePic: profile?.profileImage ?? undefined,
      language: profile?.language ?? 'en',
      bio: profile?.bio ?? '',
      location: profile?.location ?? '',
      interests: Array.isArray(profile?.interests) ? profile.interests : [],
      stats: {
        saved: profile?.savedPostsCount ?? 0,
        reviews: profile?.reviewsCount ?? 0,
        upcoming: 0,
      },
    };
  }

}
