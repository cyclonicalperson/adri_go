import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

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

  constructor(private http: HttpClient) {}

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
    return this.http.get<CalendarItem[]>(`${this.authApiUrl}/calendar`);
  }

  addToCalendar(postId: number): Observable<any> {
    return this.http.post(`${this.authApiUrl}/calendar/${postId}`, {});
  }

  removeFromCalendar(postId: number): Observable<any> {
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
}
