import { Component, Input } from '@angular/core';
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

  constructor(public auth: AuthService) {}

  // Visible to ALL authenticated users in the admin panel
  readonly mainItems: NavItem[] = [
    { label: 'Dashboard',  route: '/admin/dashboard',  icon: '📊' },
    { label: 'Lokacije',   route: '/admin/lokacije',   icon: '🏢' },
    { label: 'Aktivnosti', route: '/admin/aktivnosti', icon: '🎯' },
    { label: 'Dogadjaji',  route: '/admin/events',     icon: '🎟️' },
    { label: 'Recenzije',  route: '/admin/reviews',    icon: '⭐', badge: 12 },
  ];

  // Visible ONLY to superadmin (ADMIN role)
  readonly adminItems: NavItem[] = [
    { label: 'Admini',  route: '/admin/users',       icon: '👥' },
    { label: 'Dozvole', route: '/admin/permissions', icon: '🔐', badge: 3 },
  ];

  // Visible to all — data is scoped server-side
  readonly analyticsItems: NavItem[] = [
    { label: 'Analitika', route: '/admin/analytics', icon: '📈' },
    { label: 'Turisti',   route: '/admin/turisti',   icon: '👣' },
  ];

  get isSuperAdmin(): boolean {
    return this.auth.isRole('ADMIN');
  }

  get initials(): string {
    const name = this.auth.currentUser?.fullName ?? 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  get roleLabel(): string {
    const role = this.auth.currentUser?.role;
    return { ADMIN: 'Super Administrator', ORG: 'Administrator' }[role ?? ''] ?? (role ?? '');
  }
}
