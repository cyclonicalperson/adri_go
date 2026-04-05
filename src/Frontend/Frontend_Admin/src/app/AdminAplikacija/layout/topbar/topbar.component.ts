import { Component, Output, EventEmitter } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { inject } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';

interface AppNotification {
  id: number;
  icon: string;
  iconBg: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  route?: string;
}

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  imports: [RouterModule, AsyncPipe],
})
export class TopbarComponent {
  @Output() toggleSidebar = new EventEmitter<void>();

  private router = inject(Router);
  auth = inject(AuthService);

  notifOpen = false;

  notifications: AppNotification[] = [
    { id: 1, icon: '⏳', iconBg: '#fffbeb', title: 'Zahtev na čekanju', description: 'Hotel "Kopaonik Star" čeka odobrenje.', time: '12 min', read: false, route: '/admin/permissions' },
    { id: 2, icon: '⭐', iconBg: '#fef2f2', title: 'Nova recenzija', description: 'Negativna recenzija — Hotel Zlatibor.', time: '1 sat', read: false, route: '/admin/reviews' },
    { id: 3, icon: '✅', iconBg: '#f0fdf4', title: 'Lokacija odobrena', description: 'Restoran "Šumadija" je aktiviran.', time: '2 sata', read: true, route: '/admin/lokacije' },
    { id: 4, icon: '👤', iconBg: '#eff6ff', title: 'Novi admin registrovan', description: 'Jelena Marić se registrovala.', time: '5 sati', read: true, route: '/admin/users' },
  ];

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  toggleNotifications(): void {
    this.notifOpen = !this.notifOpen;
  }

  markAllRead(): void {
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
  }

  openNotification(n: AppNotification): void {
    n.read = true;
    this.notifOpen = false;
    if (n.route) this.router.navigate([n.route]);
  }

  // ── Page title resolution ─────────────────────────────────────────────
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
    '/admin/register': { title: 'Registracija', sub: '' },
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
    return { ADMIN: 'Super Administrator', ORG: 'Administrator' }[role ?? ''] ?? (role ?? '');
  }
}
