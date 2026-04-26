import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl     = 'http://localhost:5125/api/tourists';
  private readonly authApiUrl = 'http://localhost:5125/api/tourist-auth';

  constructor(private http: HttpClient) {}

  /** Returns the full tourist profile with real DB data */
  getUserProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/profile`);
  }

  /** Persists name / bio / location / language / interests to the DB */
  updateProfile(payload: UpdateProfilePayload): Observable<any> {
    return this.http.put(`${this.authApiUrl}/profile`, payload);
  }

  // ── Calendar (VisitPlanner) ───────────────────────────────────────────

  getCalendar(): Observable<CalendarItem[]> {
    return this.http.get<CalendarItem[]>(`${this.authApiUrl}/calendar`);
  }

  addToCalendar(postId: number): Observable<any> {
    return this.http.post(`${this.authApiUrl}/calendar/${postId}`, {});
  }

  removeFromCalendar(postId: number): Observable<any> {
    return this.http.delete(`${this.authApiUrl}/calendar/${postId}`);
  }
}
