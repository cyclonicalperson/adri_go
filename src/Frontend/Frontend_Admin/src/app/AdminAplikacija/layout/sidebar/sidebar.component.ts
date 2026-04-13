import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { UserService } from '@core/services/user.service';
import { ReviewService } from '@core/services/review.service';

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

  pendingReviewsBadge: number | null = null;
  pendingZahteviNadge: number | null = null;

  constructor(
    public auth: AuthService,
    private userService: UserService,
    private reviewService: ReviewService,
  ) { }

  ngOnInit(): void {
    this.loadBadges();
  }

  private loadBadges(): void {
    // Pending reviews — vidljivo svim adminima
    this.reviewService.getAll({ page: 1, pageSize: 1, status: 'PENDING' }).subscribe({
      next: res => { this.pendingReviewsBadge = res.total > 0 ? res.total : null; },
      error: () => { this.pendingReviewsBadge = null; },
    });

    // Pending zahtevi — samo superadmin
    if (this.isSuperAdmin) {
      this.userService.getRegistrationRequests({ page: 1, pageSize: 1, status: 'pending' }).subscribe({
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
      { label: 'Dozvole', route: '/admin/permissions', icon: '🔐' },
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
