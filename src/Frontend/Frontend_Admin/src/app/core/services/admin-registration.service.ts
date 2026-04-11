import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PendingAdminDto {
  id: number;
  fullName: string;
  email: string;
  isOrganization: boolean;
  organizationName: string | null;
  organizationEmail: string | null;
  status: string;
  submittedAt: string;
}

export interface AdminRegistrationActionResponse {
  requestId: number;
  status: string;
  adminUserId: number | null;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AdminRegistrationService {
  private readonly url = `${environment.apiUrl}/admin-registration`;

  constructor(private http: HttpClient) {}

  /** Vraća sve pending zahteve (samo superadmin) */
  getPending(): Observable<PendingAdminDto[]> {
    return this.http.get<PendingAdminDto[]>(`${this.url}/pending`);
  }

  /** Odobrava zahtev – kreira/aktivira admin nalog */
  approve(id: number, reviewedBy?: string): Observable<AdminRegistrationActionResponse> {
    return this.http.post<AdminRegistrationActionResponse>(
      `${this.url}/${id}/approve`,
      reviewedBy ? { reviewedBy } : {}
    );
  }

  /** Odbija zahtev uz opcioni razlog */
  reject(
    id: number,
    rejectionReason?: string,
    reviewedBy?: string
  ): Observable<AdminRegistrationActionResponse> {
    return this.http.post<AdminRegistrationActionResponse>(
      `${this.url}/${id}/reject`,
      { rejectionReason, reviewedBy }
    );
  }
}
