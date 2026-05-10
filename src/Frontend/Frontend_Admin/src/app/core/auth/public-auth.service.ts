import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminRegistrationResponse {
  requestId: number;
  email: string;
  status: string;
  requiresEmailVerification: boolean;
  message: string;
}

export interface EmailVerificationResponse {
  message?: string;
  alreadyVerified?: boolean;
  verifiedAt?: string;
  expired?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PublicAuthService {
  private readonly http = inject(HttpClient);
  private readonly authApiUrl = `${environment.apiUrl}/auth`;

  submitAdminRegistration(payload: FormData): Observable<AdminRegistrationResponse> {
    return this.http.post<AdminRegistrationResponse>(`${this.authApiUrl}/register`, payload);
  }

  verifyAdminRegistrationEmail(token: string): Observable<EmailVerificationResponse> {
    const params = new HttpParams().set('token', token);
    return this.http.get<EmailVerificationResponse>(`${this.authApiUrl}/verify-registration-email`, { params });
  }
}
