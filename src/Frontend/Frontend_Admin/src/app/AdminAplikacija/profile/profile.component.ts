import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { UserService } from '@core/services/user.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { UserPermission } from '@core/models/user.model';
import { DateLocalPipe } from '@shared/pipes/date-local.pipe';
import { DecimalPipe } from '@angular/common';

/** Proširena verzija AuthUser-a sa opcionim poljima koja možda postoje u localStorage-u */
interface ExtendedUser {
  userId: number;
  fullName: string;
  email: string;
  role: 'superadmin' | 'admin';   // DB ENUM vrednosti
  organizationId: number | null;
  isIndividual: boolean;
  accountStatus: 'active' | 'suspended' | 'pending';
  organization?: { name: string } | null;
  createdAt?: string | null;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  imports: [ReactiveFormsModule, DateLocalPipe, DecimalPipe],
})
export class ProfileComponent implements OnInit {

  user: ExtendedUser | null = null;

  editMode = false;
  saving = false;
  editForm!: FormGroup;

  // Dozvole koje je superadmin dodelio ovom adminu
  userPermissions: UserPermission[] = [];
  permsLoading = false;

  // Statistike platforme za superadmin prikaz — punjene iz API-ja
  platformStats = { admins: 0, posts: 0, routes: 0, pending: 0 };
  statsLoading = false;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private analytics: AnalyticsService,
    private fb: FormBuilder,
    private router: Router,
  ) {
    // Postavi user u konstruktoru — auth je dostupan pre field initializera
    this.user = this.authService.currentUser as ExtendedUser | null;
  }

  ngOnInit(): void {
    this.editForm = this.fb.group({
      fullName: [this.user?.fullName ?? '', Validators.required],
      email: [this.user?.email ?? '', [Validators.required, Validators.email]],
    });

    // Učitaj dozvole samo za admin (ne superadmin — superadmin ima sve)
    if (!this.isSuperAdmin && this.user?.userId) {
      this.loadPermissions(this.user.userId);
    }

    // Učitaj statistike platforme za superadmin
    if (this.isSuperAdmin) {
      this.statsLoading = true;
      this.analytics.getDashboardStats().subscribe({
        next: res => {
          this.platformStats = {
            admins: res.data.totalAdmins,
            posts: res.data.totalPosts,
            routes: res.data.totalRoutes,
            pending: res.data.pendingRegistrations,
          };
          this.statsLoading = false;
        },
        error: () => { this.statsLoading = false; },
      });
    }
  }

  private loadPermissions(userId: number): void {
    this.permsLoading = true;
    this.userService.getUserPermissions(userId).subscribe({
      next: res => {
        this.userPermissions = res.data;
        this.permsLoading = false;
      },
      error: () => { this.permsLoading = false; },
    });
  }

  get isSuperAdmin(): boolean { return this.authService.isRole('superadmin'); }

  get initials(): string {
    return (this.user?.fullName ?? 'U')
      .split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  }

  get roleLabel(): string {
    const map: Record<string, string> = {
      superadmin: 'Super Administrator',
      admin: 'Administrator',
    };
    return map[this.user?.role ?? ''] ?? (this.user?.role ?? '');
  }

  get roleBadgeClass(): string {
    return this.isSuperAdmin ? 'badge-red' : 'badge-blue';
  }

  /** Naziv organizacije — iz punog objekta ili fallback na ID */
  get orgName(): string | null {
    if (this.user?.organization?.name) return this.user.organization.name;
    if (this.user?.organizationId) return `Org #${this.user.organizationId}`;
    return null;
  }

  /** Grupiši dozvole po kategoriji za lepši prikaz */
  get permsByCategory(): { category: string; label: string; icon: string; perms: UserPermission[] }[] {
    const categoryMeta: Record<string, { label: string; icon: string }> = {
      content: { label: 'Sadržaj', icon: '📝' },
      analytics: { label: 'Analitika', icon: '📊' },
      users: { label: 'Korisnici', icon: '👥' },
    };

    const grouped = new Map<string, UserPermission[]>();
    for (const up of this.userPermissions) {
      const cat = up.permission.category;
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(up);
    }

    return Array.from(grouped.entries()).map(([cat, perms]) => ({
      category: cat,
      label: categoryMeta[cat]?.label ?? cat,
      icon: categoryMeta[cat]?.icon ?? '🔑',
      perms,
    }));
  }

  saveProfile(): void {
    if (this.editForm.invalid) return;
    this.saving = true;
    // TODO: Poziv API PATCH /admin-users/:id
    setTimeout(() => {
      this.saving = false;
      this.editMode = false;
    }, 600);
  }

  changePassword(): void {
    alert('Promena lozinke — u razvoju.');
  }

  logout(): void { this.authService.logout(); }
}
