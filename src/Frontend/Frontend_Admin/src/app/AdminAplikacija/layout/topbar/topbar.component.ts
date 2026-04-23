import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { Subscription } from 'rxjs';
import { AsyncPipe, DatePipe } from '@angular/common';
import { inject } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { BadgeService } from '@core/services/badge.service';
import { UserService } from '@core/services/user.service';
import { AdminNotification } from '@core/models/user.model';
import { NotificationHubService } from '@core/services/notification-hub.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  imports: [RouterModule, AsyncPipe, DatePipe],
})
export class TopbarComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();

  private router = inject(Router);
  auth = inject(AuthService);
  private userService = inject(UserService);
  private badgeService = inject(BadgeService);
  readonly notifHub = inject(NotificationHubService);

  notifications: AdminNotification[] = [];
  notifOpen = false;
  notifLoading = false;

  private subs: Subscription[] = [];

  // Unread count dolazi iz SignalR streama
  get unreadCount(): number {
    return this.notifHub.unreadCount$.value;
  }

  ngOnInit(): void {
    // Pokeni SignalR konekciju
    this.notifHub.connect();

    // Prati listu notifikacija iz huba
    this.subs.push(
      this.notifHub.notifications$.subscribe(list => {
        this.notifications = list as any;
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadNotifications(): void {
    // Refresh iz baze (backup uz SignalR)
    this.notifLoading = true;
    this.userService.getNotifications().subscribe({
      next: res => { this.notifications = res.data; this.notifLoading = false; },
      error: () => { this.notifLoading = false; },
    });
  }

  toggleNotifications(): void {
    this.notifOpen = !this.notifOpen;
    if (this.notifOpen) this.loadNotifications();
  }

  markAllRead(): void {
    this.notifHub.markAllAsRead().subscribe(() => {
      this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
      this.notifHub.unreadCount$.next(0);
      this.badgeService.refresh();
    });
  }

  openNotification(n: AdminNotification): void {
    if (!n.isRead) {
      this.notifHub.markAsRead(n.id).subscribe();
      n.isRead = true;
      const newCount = Math.max(0, this.notifHub.unreadCount$.value - 1);
      this.notifHub.unreadCount$.next(newCount);
    }
    this.notifOpen = false;
    const url = (n.payload as Record<string, string> | null)?.['url'];
    if (url) this.router.navigate([url]);
  }

  deleteNotification(n: AdminNotification, event: Event): void {
    event.stopPropagation();
    this.userService.deleteNotification(n.id).subscribe({
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
    const ids = this.notifications.map(n => n.id);
    if (ids.length === 0) return;
    let completed = 0;
    ids.forEach(id => {
      this.userService.deleteNotification(id).subscribe({
        next: () => {
          completed++;
          if (completed === ids.length) {
            this.notifications = [];
            this.notifHub.unreadCount$.next(0);
          }
        },
      });
    });
  }

  // ── Naslov stranice ───────────────────────────────────────────────────
  private readonly titleMap: Record<string, { title: string; sub: string }> = {
    '/admin/dashboard': { title: 'Dashboard', sub: 'Pregled platforme' },
    '/admin/lokacije': { title: 'Destinacije', sub: 'Upravljanje destinacijama' },
    '/admin/aktivnosti': { title: 'Aktivnosti', sub: 'Upravljanje aktivnostima' },
    '/admin/events': { title: 'Dogadjaji', sub: 'Upravljanje dogadjajima' },
    '/admin/reviews': { title: 'Recenzije', sub: 'Moderacija recenzija' },
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

  get pageSubtitle(): string { return this.resolveEntry()?.sub ?? ''; }

  private resolveEntry() {
    const url = this.router.url.split('?')[0];
    for (const key of Object.keys(this.titleMap)) {
      if (url.startsWith(key)) return this.titleMap[key];
    }
    return null;
  }

  get initials(): string {
    return (this.auth.currentUser?.fullName ?? 'U')
      .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  get roleLabel(): string {
    const role = this.auth.currentUser?.role;
    return { superadmin: 'Super Administrator', admin: 'Administrator' }[role ?? ''] ?? (role ?? '');
  }

  notifIcon(type: string): string {
    return ({ pending_review: '⭐', new_registration: '👤', post_approved: '✅', post_rejected: '❌', system: '🔔' } as any)[type] ?? '🔔';
  }

  notifIconBg(type: string): string {
    return ({ pending_review: '#fef2f2', new_registration: '#eff6ff', post_approved: '#f0fdf4', post_rejected: '#fef2f2', system: '#f5f3ff' } as any)[type] ?? '#f9fafb';
  }
}
