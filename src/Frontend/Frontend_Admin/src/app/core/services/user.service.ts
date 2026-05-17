/**
 * user.service.ts
 *
 * Mapirano na backend endpointe:
 *   /api/admin-users          — AdminUsersController
 *   /api/permissions          — PermissionsController
 *   /api/roles                — RolesController
 *   /api/organizations        — OrganizationsController
 *   /api/admin-registration   — AdminRegistrationController
 *   /api/admin-notifications  — AdminNotificationsController
 *
 * Backend response shape-ovi se mapiraju u frontend interfejse.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  User, Organization, Permission, UserPermission, Role,
  RegistrationRequest, AdminNotification,
  CreateUserRequest, UpdateUserRequest,
  ApproveRegistrationRequest,
} from '../models/user.model';
import {
  ApiResponse, PaginatedResponse, PageRequest,
} from '../models/api-response.model';
import { AdminRole } from '../auth/auth.service';

export interface UniversalPasswordStatus {
  isConfigured: boolean;
  canReveal: boolean;
  password: string | null;
  source: 'database' | 'configuration' | 'none' | string;
  updatedAt: string | null;
  updatedBy: number | null;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly url = `${environment.apiUrl}/admin-users`;

  constructor(private http: HttpClient) { }

  // ── Admin Users ────────────────────────────────────────────────────────────
  getAll(req: PageRequest & {
    role?: AdminRole;
    accountStatus?: string;
    organizationId?: number;
  }): Observable<PaginatedResponse<User>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('pageSize', req.pageSize);

    if (req.sortBy) params = params.set('sortBy', req.sortBy);
    if (req.sortDir) params = params.set('sortDir', req.sortDir!);
    if (req.search) params = params.set('search', req.search);
    if (req.role) params = params.set('role', req.role);
    if (req.accountStatus) params = params.set('accountStatus', req.accountStatus);
    if (req.organizationId) params = params.set('organizationId', req.organizationId);

    return this.http.get<any>(this.url, { params }).pipe(
      map(res => ({
        data: (res.data ?? []).map(mapUser),
        total: res.total ?? 0,
        page: res.page ?? req.page,
        pageSize: res.pageSize ?? req.pageSize,
        totalPages: res.totalPages ?? 1,
      }))
    );
  }

  getById(id: number): Observable<ApiResponse<User>> {
    return this.http.get<any>(`${this.url}/${id}`).pipe(
      map(res => ({ data: mapUser(res.data ?? res), success: res.success ?? true }))
    );
  }

  create(payload: CreateUserRequest): Observable<ApiResponse<User>> {
    return this.http.post<any>(this.url, payload).pipe(
      map(res => ({ data: mapUser(res.data ?? res), success: true }))
    );
  }

  update(id: number, payload: UpdateUserRequest): Observable<ApiResponse<User>> {
    return this.http.put<any>(`${this.url}/${id}`, payload).pipe(
      map(res => ({ data: mapUser(res.data ?? res), success: true }))
    );
  }

  /** Update own profile (any admin, calls PATCH /admin-users/me) */
  updateSelf(payload: { fullName?: string; email?: string; profileImage?: string | null }): Observable<ApiResponse<User>> {
    return this.http.patch<any>(`${this.url}/me`, payload).pipe(
      map(res => ({ data: mapUser(res.data ?? res), success: true }))
    );
  }

  uploadProfileImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${environment.apiUrl}/images/upload/profile`, formData).pipe(
      map(res => res.url),
    );
  }

  /** Change own password (calls PATCH /admin-users/me/password) */
  changePassword(currentPassword: string, newPassword: string): Observable<ApiResponse<void>> {
    return this.http.patch<any>(`${this.url}/me/password`, { currentPassword, newPassword }).pipe(
      map(res => ({ data: undefined, success: res.success ?? true }))
    );
  }

  getUniversalPassword(): Observable<ApiResponse<UniversalPasswordStatus>> {
    return this.http.get<any>(`${this.url}/universal-password`).pipe(
      map(res => ({ data: mapUniversalPasswordStatus(res.data ?? res), success: res.success ?? true }))
    );
  }

  updateUniversalPassword(currentPassword: string, newPassword: string): Observable<ApiResponse<UniversalPasswordStatus>> {
    return this.http.put<any>(`${this.url}/universal-password`, { currentPassword, newPassword }).pipe(
      map(res => ({ data: mapUniversalPasswordStatus(res.data ?? res), success: res.success ?? true }))
    );
  }

  suspend(id: number): Observable<ApiResponse<User>> {
    return this.http.patch<any>(`${this.url}/${id}/suspend`, {}).pipe(
      map(res => ({ data: mapUser(res.data ?? res), success: true }))
    );
  }

  activate(id: number): Observable<ApiResponse<User>> {
    return this.http.patch<any>(`${this.url}/${id}/activate`, {}).pipe(
      map(res => ({ data: mapUser(res.data ?? res), success: true }))
    );
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<any>(`${this.url}/${id}`).pipe(
      map(res => ({ data: undefined, success: res.success ?? true }))
    );
  }

  // ── Permissions ────────────────────────────────────────────────────────────
  getUserPermissions(userId: number): Observable<ApiResponse<UserPermission[]>> {
    return this.http.get<any>(`${this.url}/${userId}/permissions`).pipe(
      map(res => ({ data: res.data ?? [], success: res.success ?? true }))
    );
  }

  grantPermission(userId: number, permissionId: number, regionId?: number): Observable<ApiResponse<void>> {
    return this.http.post<any>(
      `${this.url}/${userId}/permissions`,
      { permissionId, regionId: regionId ?? null }
    ).pipe(map(res => ({ data: undefined, success: res.success ?? true })));
  }

  revokePermission(userId: number, permissionId: number): Observable<ApiResponse<void>> {
    return this.http.delete<any>(`${this.url}/${userId}/permissions/${permissionId}`).pipe(
      map(res => ({ data: undefined, success: res.success ?? true }))
    );
  }

  getAllPermissions(): Observable<ApiResponse<Permission[]>> {
    return this.http.get<any>(`${environment.apiUrl}/permissions`).pipe(
      map(res => ({ data: res.data ?? [], success: res.success ?? true }))
    );
  }

  // ── Roles ──────────────────────────────────────────────────────────────────
  getRoles(): Observable<ApiResponse<Role[]>> {
    return this.http.get<any>(`${environment.apiUrl}/roles`).pipe(
      map(res => ({ data: res.data ?? [], success: res.success ?? true }))
    );
  }

  // ── Organizations ──────────────────────────────────────────────────────────
  getOrganizations(): Observable<ApiResponse<Organization[]>> {
    return this.http.get<any>(`${environment.apiUrl}/organizations`).pipe(
      map(res => ({ data: res.data ?? [], success: res.success ?? true }))
    );
  }

  // ── Registration Requests ──────────────────────────────────────────────────
  // Frontend zove /registrations ali backend ima /admin-registration
  getRegistrationRequests(
    req: PageRequest & { status?: string; search?: string },
    options?: { context?: any }
  ): Observable<PaginatedResponse<RegistrationRequest>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('pageSize', req.pageSize);
    if (req.status) params = params.set('status', req.status);
    if (req.search) params = params.set('search', req.search);

    return this.http.get<any>(`${environment.apiUrl}/admin-registration`, { params, ...options }).pipe(
      map(res => ({
        data: (res.data ?? []).map(mapRegistration),
        total: res.total ?? 0,
        page: res.page ?? req.page,
        pageSize: res.pageSize ?? req.pageSize,
        totalPages: res.totalPages ?? 0,
      }))
    );
  }

  approveRegistration(id: number): Observable<ApiResponse<void>> {
    return this.http.post<any>(
      `${environment.apiUrl}/admin-registration/${id}/approve`, {}
    ).pipe(map(res => ({ data: undefined, success: true })));
  }

  rejectRegistration(id: number, payload: ApproveRegistrationRequest): Observable<ApiResponse<void>> {
    return this.http.post<any>(
      `${environment.apiUrl}/admin-registration/${id}/reject`,
      { rejectionReason: payload.rejectionReason }
    ).pipe(map(res => ({ data: undefined, success: true })));
  }

  // ── Admin Notifications ────────────────────────────────────────────────────
  getNotifications(optionsOrUnreadOnly: boolean | { context?: any } = false): Observable<ApiResponse<AdminNotification[]>> {
    const unreadOnly = typeof optionsOrUnreadOnly === 'boolean' ? optionsOrUnreadOnly : false;
    const httpOptions = typeof optionsOrUnreadOnly === 'object' ? optionsOrUnreadOnly : {};
    const params = unreadOnly ? new HttpParams().set('unreadOnly', true) : undefined;
    return this.http.get<any>(
      `${environment.apiUrl}/admin-notifications`, { params, ...httpOptions }
    ).pipe(
      map(res => ({ data: res.data ?? [], success: res.success ?? true }))
    );
  }

  markNotificationRead(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<any>(
      `${environment.apiUrl}/admin-notifications/${id}/read`, {}
    ).pipe(map(res => ({ data: undefined, success: res.success ?? true })));
  }

  markAllNotificationsRead(): Observable<ApiResponse<void>> {
    return this.http.patch<any>(
      `${environment.apiUrl}/admin-notifications/read-all`, {}
    ).pipe(map(res => ({ data: undefined, success: res.success ?? true })));
  }

  deleteNotification(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<any>(
      `${environment.apiUrl}/admin-notifications/${id}`
    ).pipe(map(res => ({ data: undefined, success: res.success ?? true })));
  }
}

// ── Mapiranje funkcije ─────────────────────────────────────────────────────

function mapUser(u: any): User {
  if (!u) return {} as User;
  return {
    userId: u.userId ?? u.id,
    organizationId: u.organizationId ?? null,
    fullName: u.fullName ?? u.full_name ?? '',
    email: u.email ?? '',
    emailVerifiedAt: u.emailVerifiedAt ?? null,
    role: u.role as AdminRole,
    isIndividual: u.isIndividual ?? true,
    accountStatus: u.accountStatus ?? 'pending',
    profileImage: u.profileImage ?? null,
    lastLoginAt: u.lastLoginAt ?? null,
    createdAt: u.createdAt ?? '',
    isActive: u.isActive ?? u.accountStatus === 'active',
    permissionCount: u.permissionCount ?? 0,
    organization: u.organization ?? null,
  };
}

function mapUniversalPasswordStatus(s: any): UniversalPasswordStatus {
  return {
    isConfigured: !!s?.isConfigured,
    canReveal: !!s?.canReveal,
    password: s?.password ?? null,
    source: s?.source ?? 'none',
    updatedAt: s?.updatedAt ?? null,
    updatedBy: s?.updatedBy ?? null,
  };
}

function mapRegistration(r: any): RegistrationRequest {
  if (!r) return {} as RegistrationRequest;
  return {
    id: r.id,
    fullName: r.fullName ?? '',
    email: r.email ?? '',
    isIndividual: r.isIndividual ?? !r.isOrganization,
    organizationName: r.organizationName ?? null,
    organizationEmail: r.organizationEmail ?? null,
    emailVerifiedAt: r.emailVerifiedAt ?? null,
    status: r.status ?? 'pending',
    rejectionReason: r.rejectionReason ?? null,
    submittedAt: r.submittedAt ?? r.submitted_at ?? '',
    reviewedAt: r.reviewedAt ?? null,
    reviewedBy: r.reviewedBy ?? null,
    documentUrl: r.documentUrl ?? null,
  };
}
