import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { inject } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { UserService } from '@core/services/user.service';
import { AdminNotification } from '@core/models/user.model';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  imports: [RouterModule, AsyncPipe],
})
export class TopbarComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();

  private router = inject(Router);
  auth = inject(AuthService);
  private userService = inject(UserService);

  // ── Notifikacije (admin_notification tabela) ──────────────────────────
  notifications: AdminNotification[] = [];
  notifOpen = false;
  notifLoading = false;

  get unreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.notifLoading = true;
    this.userService.getNotifications().subscribe({
      next: res => {
        this.notifications = res.data;
        this.notifLoading = false;
      },
      error: () => { this.notifLoading = false; },
    });
  }

  toggleNotifications(): void {
    this.notifOpen = !this.notifOpen;
    // Učitaj ponovo kad se otvori panel da prikaže sveže podatke
    if (this.notifOpen) this.loadNotifications();
  }

  markAllRead(): void {
    this.userService.markAllNotificationsRead().subscribe(() => {
      this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
    });
  }

  openNotification(n: AdminNotification): void {
    // Označi kao pročitanu
    if (!n.isRead) {
      this.userService.markNotificationRead(n.id).subscribe();
      n.isRead = true;
    }
    this.notifOpen = false;
    // Navigiraj na URL iz payload-a ako postoji
    const url = (n.payload as Record<string, string> | null)?.['url'];
    if (url) this.router.navigate([url]);
  }

  // ── Naslov stranice ───────────────────────────────────────────────────
  private readonly titleMap: Record<string, { title: string; sub: string }> = {
    '/admin/dashboard': { title: 'Dashboard', sub: 'Pregled platforme' },
    '/admin/lokacije': { title: 'Lokacije', sub: 'Upravljanje lokacijama' },
    '/admin/aktivnosti': { title: 'Aktivnosti', sub: 'Upravljanje aktivnostima' },
    '/admin/events': { title: 'Dogadjaji', sub: 'Upravljanje dogadjajima' },
    '/admin/reviews': { title: 'Recenzije', sub: 'Moderacija recenzija' },
    '/admin/users': { title: 'Admini', sub: 'Upravljanje administratorima' },
    '/admin/permissions': { title: 'Dozvole', sub: 'Upravljanje dozvolama' },
    '/admin/map-admin': { title: 'Mapa', sub: 'Interaktivna mapa lokacija' },
    '/admin/profile': { title: 'Moj profil', sub: 'Podaci o nalogu' },
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

  // ── Korisnik ──────────────────────────────────────────────────────────
  get initials(): string {
    return (this.auth.currentUser?.fullName ?? 'U')
      .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  get roleLabel(): string {
    const role = this.auth.currentUser?.role;
    // Mapira DB ENUM: 'superadmin' | 'admin'
    return { superadmin: 'Super Administrator', admin: 'Administrator' }[role ?? ''] ?? (role ?? '');
  }

  // ── Ikona za tip notifikacije ─────────────────────────────────────────
  notifIcon(type: string): string {
    return {
      pending_review: '⭐',
      new_registration: '👤',
      post_approved: '✅',
      post_rejected: '❌',
      system: '🔔',
    }[type] ?? '🔔';
  }

  notifIconBg(type: string): string {
    return {
      pending_review: '#fef2f2',
      new_registration: '#eff6ff',
      post_approved: '#f0fdf4',
      post_rejected: '#fef2f2',
      system: '#f5f3ff',
    }[type] ?? '#f9fafb';
  }
}
