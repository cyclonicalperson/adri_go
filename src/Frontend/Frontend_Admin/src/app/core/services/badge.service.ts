import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { SILENT_REQUEST } from '../interceptors/loading.interceptor';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { UserService } from './user.service';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

const SILENT = { context: new HttpContext().set(SILENT_REQUEST, true) };

@Injectable({ providedIn: 'root' })
export class BadgeService {
  private readonly _pendingReviews$ = new BehaviorSubject<number>(0);
  private readonly _pendingRequests$ = new BehaviorSubject<number>(0);
  private readonly _unreadNotifications$ = new BehaviorSubject<number>(0);

  readonly pendingReviews$ = this._pendingReviews$.asObservable();
  readonly pendingRequests$ = this._pendingRequests$.asObservable();
  readonly unreadNotifications$ = this._unreadNotifications$.asObservable();

  private pollSub?: Subscription;

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private auth: AuthService,
  ) { }

  startPolling(): void {
    if (this.pollSub) return; // Sprečava višestruko pokretanje
    this.refresh();
    this.pollSub = interval(30_000).subscribe(() => this.refresh());
  }

  stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }

  refresh(): void {
    if (this.auth.hasPermission('manage_reviews')) {
      const reviewParams = new HttpParams().set('status', 'PENDING').set('page', 1).set('pageSize', 1);
      this.http.get<any>(`${environment.apiUrl}/reviews`, {
        params: reviewParams,
        context: new HttpContext().set(SILENT_REQUEST, true),
      }).subscribe({
        next: res => this._pendingReviews$.next(res.total ?? 0),
        error: () => { },
      });
    } else {
      this._pendingReviews$.next(0);
    }

    if (this.auth.isRole('superadmin')) {
      this.userService.getRegistrationRequests({ page: 1, pageSize: 1, status: 'pending' }, SILENT).subscribe({
        next: res => this._pendingRequests$.next(res.total),
        error: () => { },
      });
    } else {
      this._pendingRequests$.next(0);
    }

    this.http.get<{ data?: { count?: number } }>(`${environment.apiUrl}/notifications/unread-count`, SILENT).subscribe({
      next: res => {
        this._unreadNotifications$.next(res.data?.count ?? 0);
      },
      error: () => { },
    });
  }
}
