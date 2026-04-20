/**
 * badge.service.ts
 * Centralizovana reaktivna usluga za badge-ove u sidebaru i topbaru.
 * Komponente pozivaju refresh() kada promene podatke koji utiču na badge.
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { ReviewService } from './review.service';
import { UserService } from './user.service';
import { AuthService } from '../auth/auth.service';

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
    private reviewService: ReviewService,
    private userService: UserService,
    private auth: AuthService,
  ) { }

  /** Pokrenuti polling — poziva se iz AppComponent ili layout-a */
  startPolling(): void {
    this.refresh();
    // Osveži svakih 30 sekundi
    this.pollSub = interval(30_000).subscribe(() => this.refresh());
  }

  stopPolling(): void {
    this.pollSub?.unsubscribe();
  }

  /** Manuelni refresh — poziva se nakon akcija koje mijenjaju stanje */
  refresh(): void {
    this.reviewService.getAll({ page: 1, pageSize: 1, status: 'PENDING' }).subscribe({
      next: res => this._pendingReviews$.next(res.total),
      error: () => { },
    });

    if (this.auth.isRole('superadmin')) {
      this.userService.getRegistrationRequests({ page: 1, pageSize: 1, status: 'pending' }).subscribe({
        next: res => this._pendingRequests$.next(res.total),
        error: () => { },
      });
    }

    this.userService.getNotifications().subscribe({
      next: res => {
        const unread = (res.data ?? []).filter((n: any) => !n.isRead).length;
        this._unreadNotifications$.next(unread);
      },
      error: () => { },
    });
  }
}
