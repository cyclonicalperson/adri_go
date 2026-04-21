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
    // Direktan lagan poziv - samo 1 recenzija za count, ne 1000
    const reviewParams = new HttpParams().set('status', 'PENDING').set('page', 1).set('pageSize', 1);
    this.http.get<any>(`${environment.apiUrl}/reviews`, {
      params: reviewParams,
      context: new HttpContext().set(SILENT_REQUEST, true),
    }).subscribe({
      next: res => this._pendingReviews$.next(res.total ?? 0),
      error: () => { },
    });

    if (this.auth.isRole('superadmin')) {
      this.userService.getRegistrationRequests({ page: 1, pageSize: 1, status: 'pending' }, SILENT).subscribe({
        next: res => this._pendingRequests$.next(res.total),
        error: () => { },
      });
    }

    this.userService.getNotifications(SILENT).subscribe({
      next: res => {
        const unread = (res.data ?? []).filter((n: any) => !n.isRead).length;
        this._unreadNotifications$.next(unread);
      },
      error: () => { },
    });
  }
}
