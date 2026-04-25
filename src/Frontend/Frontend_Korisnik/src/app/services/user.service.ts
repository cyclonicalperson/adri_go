import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserProfile {
  fullName: string;
  emailOrPhone: string;
  profilePic?: string;
  language: string;
  interests: string[];
  stats: {
    saved: number;
    tickets: number;
    upcoming: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:5125/api/tourists';

  constructor(private http: HttpClient) {}

  getUserProfile(): Observable<UserProfile> {
    // authInterceptor automatically injects Bearer token from tourist_session
    return this.http.get<UserProfile>(`${this.apiUrl}/profile`);
  }
}