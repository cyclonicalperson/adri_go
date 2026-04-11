import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly url = `${environment.apiUrl}/admin-users`;

  constructor(private http: HttpClient) { }

  // ── Admin Users (v_admin_users_full) ──────────────────────────────────
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

    return this.http.get<PaginatedResponse<User>>(this.url, { params });
  }

  getById(id: number): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.url}/${id}`);
  }

  create(payload: CreateUserRequest): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(this.url, payload);
  }

  update(id: number, payload: UpdateUserRequest): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.url}/${id}`, payload);
  }

  suspend(id: number): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.url}/${id}/suspend`, {});
  }

  activate(id: number): Observable<ApiResponse<User>> {
    return this.http.patch<ApiResponse<User>>(`${this.url}/${id}/activate`, {});
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.url}/${id}`);
  }

  // ── Permissions (admin_user_permission + admin_permission) ────────────
  getUserPermissions(userId: number): Observable<ApiResponse<UserPermission[]>> {
    return this.http.get<ApiResponse<UserPermission[]>>(`${this.url}/${userId}/permissions`);
  }

  grantPermission(userId: number, permissionId: number, regionId?: number): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.url}/${userId}/permissions`,
      { permissionId, regionId: regionId ?? null }
    );
  }

  revokePermission(userId: number, permissionId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.url}/${userId}/permissions/${permissionId}`);
  }

  getAllPermissions(): Observable<ApiResponse<Permission[]>> {
    return this.http.get<ApiResponse<Permission[]>>(`${environment.apiUrl}/permissions`);
  }

  // ── Roles (kompatibilnost sa user-form i roles-permissions) ──────────────
  getRoles(): Observable<ApiResponse<Role[]>> {
    return this.http.get<ApiResponse<Role[]>>(`${environment.apiUrl}/roles`);
  }

  // ── Organizations ─────────────────────────────────────────────────────
  getOrganizations(): Observable<ApiResponse<Organization[]>> {
    return this.http.get<ApiResponse<Organization[]>>(`${environment.apiUrl}/organizations`);
  }

  // ── Registration Requests (admin_registration_request) ───────────────
  getRegistrationRequests(req: PageRequest & { status?: string }): Observable<PaginatedResponse<RegistrationRequest>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('pageSize', req.pageSize);
    if (req.status) params = params.set('status', req.status);
    return this.http.get<PaginatedResponse<RegistrationRequest>>(
      `${environment.apiUrl}/registrations`, { params }
    );
  }

  approveRegistration(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(
      `${environment.apiUrl}/registrations/${id}/approve`, {}
    );
  }

  rejectRegistration(id: number, payload: ApproveRegistrationRequest): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(
      `${environment.apiUrl}/registrations/${id}/reject`, payload
    );
  }

  // ── Admin Notifications (admin_notification) ──────────────────────────
  getNotifications(unreadOnly = false): Observable<ApiResponse<AdminNotification[]>> {
    const params = unreadOnly ? new HttpParams().set('unreadOnly', true) : undefined;
    return this.http.get<ApiResponse<AdminNotification[]>>(
      `${environment.apiUrl}/admin-notifications`, { params }
    );
  }

  markNotificationRead(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(
      `${environment.apiUrl}/admin-notifications/${id}/read`, {}
    );
  }

  markAllNotificationsRead(): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(
      `${environment.apiUrl}/admin-notifications/read-all`, {}
    );
  }
}
