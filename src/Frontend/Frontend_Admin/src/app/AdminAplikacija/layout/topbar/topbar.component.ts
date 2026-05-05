import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { Subscription } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { AdminNotification } from '@core/models/user.model';
import { BadgeService } from '@core/services/badge.service';
import { NotificationHubService } from '@core/services/notification-hub.service';
import { SiteLanguageCode, SiteTranslateService } from '@core/services/site-translate.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  imports: [RouterModule, AsyncPipe],
})
export class TopbarComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();

  private router = inject(Router);
  auth = inject(AuthService);
  private badgeService = inject(BadgeService);
  readonly notifHub = inject(NotificationHubService);
  readonly i18n = inject(SiteTranslateService);

  notifications: AdminNotification[] = [];
  notifOpen = false;
  notifLoading = false;
  languageMenuOpen = false;
  showUnreadOnly = false;
  unreadCount = 0;
  readonly languages = this.i18n.languages;

  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.notifHub.connect();

    this.subs.push(
      this.notifHub.notifications$.subscribe(list => {
        this.notifications = list;
      }),
      this.notifHub.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadNotifications(): void {
    this.notifLoading = true;
    this.notifHub.list().subscribe({
      next: list => {
        this.notifications = list;
        this.notifLoading = false;
      },
      error: () => {
        this.notifLoading = false;
      },
    });
  }

  get visibleNotifications(): AdminNotification[] {
    return this.showUnreadOnly ? this.notifications.filter(n => !n.isRead) : this.notifications;
  }

  toggleNotifications(): void {
    this.languageMenuOpen = false;
    this.notifOpen = !this.notifOpen;
    if (this.notifOpen) {
      this.loadNotifications();
    }
  }

  toggleLanguageMenu(): void {
    this.notifOpen = false;
    this.languageMenuOpen = !this.languageMenuOpen;
  }

  changeLanguage(language: SiteLanguageCode): void {
    void this.i18n.setLanguage(language);
    this.languageMenuOpen = false;
  }

  markAllRead(): void {
    this.notifHub.markAllAsRead().subscribe(() => {
      this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
      this.notifHub.unreadCount$.next(0);
      this.badgeService.refresh();
    });
  }

  markRead(n: AdminNotification, event: Event): void {
    event.stopPropagation();
    if (n.isRead) return;
    this.notifHub.markAsRead(n.id).subscribe();
    n.isRead = true;
    this.notifHub.unreadCount$.next(Math.max(0, this.notifHub.unreadCount$.value - 1));
  }

  openNotification(n: AdminNotification): void {
    if (!n.isRead) {
      this.notifHub.markAsRead(n.id).subscribe();
      n.isRead = true;
      this.notifHub.unreadCount$.next(Math.max(0, this.notifHub.unreadCount$.value - 1));
    }

    this.notifOpen = false;
    const url = this.resolveNotificationUrl(n);
    if (url) {
      void this.router.navigateByUrl(url);
    }
  }

  relativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return 'Upravo';
    if (mins < 60) return `Prije ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Prije ${hrs} h`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Juče';
    if (days < 7) return `Prije ${days} dana`;
    return new Date(dateStr).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  deleteNotification(n: AdminNotification, event: Event): void {
    event.stopPropagation();
    this.notifHub.delete(n.id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(x => x.id !== n.id);
        if (!n.isRead) {
          this.notifHub.unreadCount$.next(Math.max(0, this.notifHub.unreadCount$.value - 1));
        }
      },
    });
  }

  clearAllNotifications(event: Event): void {
    event.stopPropagation();
    if (this.notifications.length === 0) return;

    this.notifHub.deleteAll().subscribe({
      next: () => {
        this.notifications = [];
        this.notifHub.unreadCount$.next(0);
      },
    });
  }

  private readonly titleMap: Record<string, { title: string; sub: string }> = {
    '/admin/dashboard': { title: 'Dashboard', sub: 'Pregled platforme' },
    '/admin/lokacije': { title: 'Destinacije', sub: 'Upravljanje destinacijama' },
    '/admin/aktivnosti': { title: 'Aktivnosti', sub: 'Upravljanje aktivnostima' },
    '/admin/events': { title: 'Dogadjaji', sub: 'Upravljanje dogadjajima' },
    '/admin/reviews': { title: 'Recenzije', sub: 'Moderacija recenzija' },
    '/admin/routes-management': { title: 'Rute', sub: 'Upravljanje rutama' },
    '/admin/users': { title: 'Admini', sub: 'Upravljanje administratorima' },
    '/admin/permissions': { title: 'Dozvole', sub: 'Upravljanje dozvolama' },
    '/admin/map-admin': { title: 'Mapa', sub: 'Interaktivna mapa destinacija' },
    '/admin/profile': { title: 'Moj profil', sub: 'Podaci o nalogu' },
    '/admin/zahtevi': { title: 'Zahtevi za registraciju', sub: 'Pregled i odobravanje zahteva' },
  };

  pageTitle$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    startWith(null),
    map(() => this.resolveEntry()?.title ?? 'Admin'),
  );

  get pageSubtitle(): string {
    return this.resolveEntry()?.sub ?? '';
  }

  private resolveEntry() {
    const url = this.router.url.split('?')[0];
    for (const key of Object.keys(this.titleMap)) {
      if (url.startsWith(key)) {
        return this.titleMap[key];
      }
    }
    return null;
  }

  get initials(): string {
    return (this.auth.currentUser?.fullName ?? 'U')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  get roleLabel(): string {
    const role = this.auth.currentUser?.role;
    return { superadmin: 'Super Administrator', admin: 'Administrator' }[role ?? ''] ?? (role ?? '');
  }

  get currentLanguageCode(): string {
    return this.i18n.currentLanguageOption.shortLabel;
  }

  notifIcon(type: string): string {
    return ({
      pending_review: '\u2B50',
      route_pending: '\u{1F5FA}\uFE0F',
      new_registration: '\u{1F464}',
      post_approved: '\u2705',
      post_rejected: '\u274C',
      system: '\u{1F514}',
    } as Record<string, string>)[type] ?? '\u{1F514}';
  }

  notifIconBg(type: string): string {
    return ({
      pending_review: '#fef2f2',
      route_pending: '#eff6ff',
      new_registration: '#eff6ff',
      post_approved: '#f0fdf4',
      post_rejected: '#fef2f2',
      system: '#f5f3ff',
    } as Record<string, string>)[type] ?? '#f9fafb';
  }

  private resolveNotificationUrl(notification: AdminNotification): string | null {
    const payload = notification.payload ?? {};
    const url = this.payloadString(payload, 'url');
    const postId = this.payloadNumber(payload, 'postId', 'post_id');
    const routeId = this.payloadNumber(payload, 'routeId', 'route_id');

    if (notification.type === 'new_registration') {
      return '/admin/zahtevi';
    }

    if (notification.type === 'pending_review') {
      return '/admin/reviews';
    }

    if ((notification.type === 'post_approved' || notification.type === 'post_rejected') && routeId) {
      return `/admin/routes-management/${routeId}`;
    }

    if ((notification.type === 'post_approved' || notification.type === 'post_rejected') && postId) {
      return `/admin/lokacije/${postId}`;
    }

    if (routeId) {
      return `/admin/routes-management/${routeId}`;
    }

    if (postId) {
      return `/admin/lokacije/${postId}`;
    }

    return url ?? this.fallbackNotificationUrl(notification.type);
  }

  private payloadString(payload: Record<string, unknown>, ...keys: string[]): string | null {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return null;
  }

  private payloadNumber(payload: Record<string, unknown>, ...keys: string[]): number | null {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
        return Number(value);
      }
    }

    return null;
  }

  private fallbackNotificationUrl(type: string): string | null {
    switch (type) {
      case 'new_registration':
        return '/admin/zahtevi';
      case 'pending_review':
        return '/admin/reviews';
      default:
        return null;
    }
  }
}
