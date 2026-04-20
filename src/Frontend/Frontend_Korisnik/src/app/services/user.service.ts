import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'; // Dodat HttpHeaders
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
  // Ostaje tvoj port 5125
  // Zameni staro sa ovim:
    private apiUrl = 'http://localhost:5125/api/tourists';

  constructor(private http: HttpClient) {}

  getUserProfile(): Observable<UserProfile> {
    // 1. Preuzimamo token koji si dobio prilikom logina/registracije
    // NAPOMENA: Ako token čuvaš pod drugim imenom (npr. 'jwt_token'), promeni 'token' ispod!
    const token = localStorage.getItem('token'); 

    // 2. Kreiramo zaglavlje i ubacujemo token u "Bearer" formatu
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    // 3. Šaljemo GET zahtev i priključujemo zaglavlje
    return this.http.get<UserProfile>(`${this.apiUrl}/profile`, { headers: headers });
  }
}