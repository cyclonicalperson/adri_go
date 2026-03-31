import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { inject } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  imports: [RouterModule, AsyncPipe],
})
export class TopbarComponent {
  @Input() sidebarCollapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  private router = inject(Router);
  auth = inject(AuthService);

  private readonly titleMap: Record<string, { title: string; sub: string }> = {
    '/admin/dashboard': { title: 'Dashboard', sub: 'Pregled platforme' },
    '/admin/lokacije': { title: 'Lokacije', sub: 'Upravljanje lokacijama' },
    '/admin/aktivnosti': { title: 'Aktivnosti', sub: 'Upravljanje aktivnostima' },
    '/admin/events': { title: 'Dogadjaji', sub: 'Upravljanje dogadjajima' },
    '/admin/reviews': { title: 'Recenzije', sub: 'Moderacija recenzija' },
    '/admin/users': { title: 'Admini', sub: 'Upravljanje administratorima' },
    '/admin/permissions': { title: 'Dozvole', sub: 'Upravljanje dozvolama' },
    '/admin/analytics': { title: 'Analitika', sub: 'Statistike i grafikoni' },
    '/admin/turisti': { title: 'Turisti', sub: 'Kretanje i sklonosti turista' },
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
    const name = this.auth.currentUser?.fullName ?? 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  get roleLabel(): string {
    const role = this.auth.currentUser?.role;
    const map: Record<string, string> = {
      ADMIN: 'Super Administrator',
      ORG: 'Administrator',
    };
    return map[role ?? ''] ?? role ?? '';
  }
}
