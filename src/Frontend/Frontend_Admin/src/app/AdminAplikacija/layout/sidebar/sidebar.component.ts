import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { UserService } from '@core/services/user.service';

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
export class SidebarComponent implements OnInit {
  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();
  @Output() navClick = new EventEmitter<void>();

  // Dynamic badge counts
  pendingReviewsBadge: number | null = null;
  pendingZahteviNadge: number | null = null;
  pendingPermissionsBadge: number | null = null;

  constructor(public auth: AuthService, private userService: UserService) { }

  ngOnInit(): void {
    this.loadBadges();
  }

  private loadBadges(): void {
    // Pending reviews — visible to all
    // (loaded via ReviewService in a real app; using analytics stats here)
    // For now keep static badge until ReviewService is injected
    this.pendingReviewsBadge = null;

    if (this.isSuperAdmin) {
      // Pending registration requests
      this.userService.getRegistrationRequests({ page: 1, pageSize: 1, status: 'pending' })
        .subscribe({
          next: res => { this.pendingZahteviNadge = res.total > 0 ? res.total : null; },
          error: () => { this.pendingZahteviNadge = null; },
        });
    }
  }

  get mainItems(): NavItem[] {
    return [
      { label: 'Dashboard', route: '/admin/dashboard', icon: '📊' },
      { label: 'Lokacije', route: '/admin/lokacije', icon: '🏢' },
      { label: 'Aktivnosti', route: '/admin/aktivnosti', icon: '🎯' },
      { label: 'Dogadjaji', route: '/admin/events', icon: '🎟️' },
      { label: 'Recenzije', route: '/admin/reviews', icon: '⭐', badge: this.pendingReviewsBadge },
    ];
  }

  get adminItems(): NavItem[] {
    return [
      { label: 'Admini', route: '/admin/users', icon: '👥' },
      { label: 'Zahtevi', route: '/admin/zahtevi', icon: '📋', badge: this.pendingZahteviNadge },
      { label: 'Dozvole', route: '/admin/permissions', icon: '🔐', badge: this.pendingPermissionsBadge },
    ];
  }

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
