import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { GuestItineraryService, LocalCalendarSeed } from './guest-itinerary.service';
import { PlannerStop } from './route-planner.service';
import { RouteSummary } from './routing.service';
import { TravelMode } from './tourist-preferences.service';
import { Location } from './location.service';

export interface UserProfile {
  fullName: string;
  emailOrPhone: string;
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
  language?: string;
  bio?: string;
  location?: string;
  interests?: string[];
}

export interface CalendarItem {
  id: number;
  postId: number;
  title: string;
  postType: string;
  address: string;
  date: string;
  notes: string;
  scheduledTime: string;
  imageUrl: string | null;
}

export interface CalendarMutationResult {
  message: string;
  alreadyAdded?: boolean;
  localOnly?: boolean;
  addedCount?: number;
  alreadyCount?: number;
  savedTripId?: string;
}

interface TouristProfileResponse {
  id: number;
  name: string;
  email: string;
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
    private guestItinerary: GuestItineraryService,
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

  getCalendar(): Observable<CalendarItem[]> {
    if (!this.authService.isLoggedIn) {
      return of(this.guestItinerary.getGuestCalendar());
    }

    return this.http.get<CalendarItem[]>(`${this.authApiUrl}/calendar`);
  }

  addToCalendar(postId: number): Observable<any> {
    if (!this.authService.isLoggedIn) {
      return of({
        localOnly: true,
        message: 'Guests need full location details to save calendar items locally.',
      });
    }

    return this.http.post(`${this.authApiUrl}/calendar/${postId}`, {});
  }

  addLocationToCalendar(location: Pick<Location, 'id' | 'title' | 'postType' | 'address' | 'regionName' | 'images'> & { imageUrl?: string | null }): Observable<CalendarMutationResult> {
    if (this.authService.isLoggedIn) {
      return this.http.post<any>(`${this.authApiUrl}/calendar/${location.id}`, {}).pipe(
        map(res => ({
          message: res?.alreadyAdded
            ? 'Already in your server-synced calendar.'
            : 'Added to your server-synced calendar.',
          alreadyAdded: !!res?.alreadyAdded,
          localOnly: false,
        })),
      );
    }

    const localResult = this.guestItinerary.addLocationToCalendar(this.toLocalCalendarSeed(location));
    return of({
      message: localResult.alreadyAdded
        ? 'Already saved locally on this device. Log in to sync it everywhere.'
        : 'Saved locally on this device. Log in if you want this calendar to sync across devices.',
      alreadyAdded: localResult.alreadyAdded,
      localOnly: true,
    });
  }

  saveTripToCalendar(
    stops: PlannerStop[],
    routeSummary: RouteSummary,
    options: {
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
      const localResult = this.guestItinerary.saveTripToCalendar(validStops, routeSummary, {
        title: options.title,
        travelMode: options.travelMode,
        scenicMode: options.scenicMode,
      });

      const message = localResult.addedCount > 0
        ? `Trip saved locally on this device. ${localResult.addedCount} stop(s) were added to your local calendar. Log in to sync them on the server.`
        : 'This trip is already saved locally on this device. Log in if you want cross-device sync.';

      return of({
        message,
        localOnly: true,
        addedCount: localResult.addedCount,
        alreadyCount: localResult.alreadyCount,
        savedTripId: localResult.savedTrip.id,
      });
    }

    return forkJoin(validStops.map(stop =>
      this.http.post<any>(`${this.authApiUrl}/calendar/${stop.id}`, {}).pipe(
        map(result => ({ failed: false, alreadyAdded: !!result?.alreadyAdded })),
      )
    )).pipe(
      map(results => {
        const addedCount = results.filter(result => !result.failed && !result.alreadyAdded).length;
        const alreadyCount = results.filter(result => result.alreadyAdded).length;
        const suffix = options.emailNotifications
          ? ' A summary will also appear in your email digest.'
          : '';

        return {
          message: addedCount > 0
            ? `${addedCount} stop(s) added to your calendar.${suffix}`
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

  removeFromCalendar(postId: number, plannerItemId?: number): Observable<any> {
    if (!this.authService.isLoggedIn) {
      return of({
        success: this.guestItinerary.removeCalendarItem(postId, plannerItemId),
        localOnly: true,
      });
    }

    return this.http.delete(`${this.authApiUrl}/calendar/${postId}`);
  }

  private mapProfile(profile: TouristProfileResponse): UserProfile {
    return {
      fullName: profile?.name ?? '',
      emailOrPhone: profile?.email ?? '',
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

  private toLocalCalendarSeed(location: Pick<Location, 'id' | 'title' | 'postType' | 'address' | 'regionName' | 'images'> & { imageUrl?: string | null }): LocalCalendarSeed {
    const firstImage = location.imageUrl
      ?? (() => { try { const imgs = Array.isArray(location.images) ? location.images : (JSON.parse(location.images ?? '[]') as string[]); return imgs[0]; } catch { return undefined; } })()
      ?? null;

    return {
      postId: location.id,
      title: location.title,
      postType: location.postType,
      address: location.address || location.regionName || '',
      imageUrl: firstImage,
    };
  }
}
