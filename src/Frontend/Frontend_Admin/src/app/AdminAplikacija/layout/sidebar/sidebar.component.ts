import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

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
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();
  @Output() navClick = new EventEmitter<void>();

  constructor(public auth: AuthService) { }

  readonly mainItems: NavItem[] = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: '📊' },
    { label: 'Lokacije', route: '/admin/lokacije', icon: '🏢' },
    { label: 'Aktivnosti', route: '/admin/aktivnosti', icon: '🎯' },
    { label: 'Dogadjaji', route: '/admin/events', icon: '🎟️' },
    { label: 'Recenzije', route: '/admin/reviews', icon: '⭐', badge: 12 },
  ];

  readonly adminItems: NavItem[] = [
    { label: 'Admini', route: '/admin/users', icon: '👥' },
    { label: 'Dozvole', route: '/admin/permissions', icon: '🔐', badge: 3 },
  ];

  // Analytics items removed — analytics is now embedded in the Dashboard.
  readonly analyticsItems: NavItem[] = [];

  get isSuperAdmin(): boolean { return this.auth.isRole('superadmin'); }

  get initials(): string {
    return (this.auth.currentUser?.fullName ?? 'U')
      .split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  }

  get roleLabel(): string {
    return { superadmin: 'Super Administrator', admin: 'Administrator' }[this.auth.currentUser?.role ?? '']
      ?? (this.auth.currentUser?.role ?? '');
  }
}
