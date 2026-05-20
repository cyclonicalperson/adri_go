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
  ) {}

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
      { label: 'Dashboard', route: '/admin/dashboard', icon: '\u{1F4CA}' },
      ...(this.canManageContent ? [{ label: 'Destinacije', route: '/admin/lokacije', icon: '\u{1F3E2}' }] : []),
      ...(this.canManageContent ? [{ label: 'Rute', route: '/admin/routes-management', icon: '\u{1F5FA}\uFE0F' }] : []),
      ...(this.canManageActivities ? [{ label: 'Aktivnosti', route: '/admin/aktivnosti', icon: '\u{1F3AF}' }] : []),
      ...(this.canManageContent ? [{ label: 'Dogadjaji', route: '/admin/events', icon: '\u{1F39F}\uFE0F' }] : []),
      ...(this.canManageReviews ? [{ label: 'Recenzije', route: '/admin/reviews', icon: '\u2B50', badge: this.reviewBadge }] : []),
    ];
  }

  get adminItems(): NavItem[] {
    return [
      { label: 'Admini', route: '/admin/users', icon: '\u{1F465}' },
      { label: 'Turisti', route: '/admin/turisti', icon: '\u{1F9CD}' },
      { label: 'Zahtevi', route: '/admin/zahtevi', icon: '\u{1F4CB}', badge: this.requestsBadge },
      { label: 'Dozvole', route: '/admin/permissions', icon: '\u{1F510}' },
    ];
  }

  get isSuperAdmin(): boolean { return this.auth.isRole('superadmin'); }
  get canManageContent(): boolean { return this.auth.hasPermission('manage_own_posts'); }
  get canManageActivities(): boolean { return this.auth.hasGlobalPermission('manage_tags'); }
  get canManageReviews(): boolean { return this.auth.hasGlobalPermission('manage_reviews'); }
  get canAccessMap(): boolean { return this.canManageContent || this.auth.hasGlobalPermission('view_analytics'); }

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
