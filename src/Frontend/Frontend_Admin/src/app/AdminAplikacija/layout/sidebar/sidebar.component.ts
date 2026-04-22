import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '@core/auth/auth.service';
import { BadgeService } from '@core/services/badge.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: number | null;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  imports: [RouterLink, RouterLinkActive],
})
export class SidebarComponent implements OnInit, OnDestroy {
  private routerSub?: Subscription;
  private badgeSubs: Subscription[] = [];

  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();
  @Output() navClick = new EventEmitter<void>();

  reviewBadge: number | null = null;
  requestsBadge: number | null = null;

  constructor(
    public auth: AuthService,
    private router: Router,
    private badgeService: BadgeService,
  ) { }

  ngOnInit(): void {
    this.badgeService.startPolling();

    this.badgeSubs.push(
      this.badgeService.pendingReviews$.subscribe(n => {
        this.reviewBadge = n > 0 ? n : null;
      }),
      this.badgeService.pendingRequests$.subscribe(n => {
        this.requestsBadge = n > 0 ? n : null;
      }),
    );

    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
    ).subscribe(() => this.badgeService.refresh());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.badgeSubs.forEach(s => s.unsubscribe());
    this.badgeService.stopPolling();
  }

  get mainItems(): NavItem[] {
    return [
      { label: 'Dashboard', route: '/admin/dashboard', icon: '📊' },
      ...(this.canManageContent ? [{ label: 'Destinacije', route: '/admin/lokacije', icon: '🏢' }] : []),
      ...(this.canManageActivities ? [{ label: 'Aktivnosti', route: '/admin/aktivnosti', icon: '🎯' }] : []),
      ...(this.canManageContent ? [{ label: 'Dogadjaji', route: '/admin/events', icon: '🎟️' }] : []),
      ...(this.canManageReviews ? [{ label: 'Recenzije', route: '/admin/reviews', icon: '⭐', badge: this.reviewBadge }] : []),
    ];
  }

  get adminItems(): NavItem[] {
    return [
      { label: 'Admini', route: '/admin/users', icon: '👥' },
      { label: 'Zahtevi', route: '/admin/zahtevi', icon: '📋', badge: this.requestsBadge },
      { label: 'Dozvole', route: '/admin/permissions', icon: '🔐' },
    ];
  }

  get isSuperAdmin(): boolean { return this.auth.isRole('superadmin'); }
  get canManageContent(): boolean { return this.auth.hasPermission('manage_own_posts'); }
  get canManageActivities(): boolean { return this.auth.hasPermission('manage_tags'); }
  get canManageReviews(): boolean { return this.auth.hasPermission('manage_reviews'); }
  get canAccessMap(): boolean { return this.canManageContent || this.auth.hasPermission('view_analytics'); }

  get initials(): string {
    return (this.auth.currentUser?.fullName ?? 'U')
      .split(' ')
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  get roleLabel(): string {
    return { superadmin: 'Super Administrator', admin: 'Administrator' }[this.auth.currentUser?.role ?? '']
      ?? (this.auth.currentUser?.role ?? '');
  }
}
