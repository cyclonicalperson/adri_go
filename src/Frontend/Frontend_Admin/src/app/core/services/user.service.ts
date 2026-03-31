import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  User,
  Role,
  Organization,
  CreateUserRequest,
  UpdateUserRequest,
} from '../models/user.model';
import {
  ApiResponse,
  PaginatedResponse,
  PageRequest,
} from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly url = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) { }

  getAll(req: PageRequest & { roleId?: number; isActive?: boolean }): Observable<PaginatedResponse<User>> {
    let params = new HttpParams()
      .set('page', req.page)
      .set('pageSize', req.pageSize);

    if (req.sortBy) params = params.set('sortBy', req.sortBy);
    if (req.sortDir) params = params.set('sortDir', req.sortDir);
    if (req.search) params = params.set('search', req.search);
    if (req.roleId !== undefined) params = params.set('roleId', req.roleId);
    if (req.isActive !== undefined) params = params.set('isActive', req.isActive);

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

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.url}/${id}`);
  }

  getRoles(): Observable<ApiResponse<Role[]>> {
    return this.http.get<ApiResponse<Role[]>>(`${environment.apiUrl}/roles`);
  }

  getOrganizations(): Observable<ApiResponse<Organization[]>> {
    return this.http.get<ApiResponse<Organization[]>>(`${environment.apiUrl}/organizations`);
  }
}
