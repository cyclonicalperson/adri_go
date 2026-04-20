import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { UserService } from '@core/services/user.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { UserPermission } from '@core/models/user.model';
import { DateLocalPipe } from '@shared/pipes/date-local.pipe';
import { DecimalPipe } from '@angular/common';

function passwordMatchValidator(g: AbstractControl): ValidationErrors | null {
  const pw = g.get('newPassword')?.value;
  const cpw = g.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { mismatch: true } : null;
}

interface ExtendedUser {
  userId: number;
  fullName: string;
  email: string;
  role: 'superadmin' | 'admin';
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
  saveError: string | null = null;
  editForm!: FormGroup;

  // Password change
  pwMode = false;
  pwSaving = false;
  pwError: string | null = null;
  pwSuccess: string | null = null;
  pwForm!: FormGroup;

  userPermissions: UserPermission[] = [];
  permsLoading = false;

  platformStats = { admins: 0, posts: 0, routes: 0, pending: 0 };
  statsLoading = false;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private analytics: AnalyticsService,
    private fb: FormBuilder,
    private router: Router,
  ) {
    this.user = this.authService.currentUser as ExtendedUser | null;
  }

  ngOnInit(): void {
    this.editForm = this.fb.group({
      fullName: [this.user?.fullName ?? '', Validators.required],
      email: [this.user?.email ?? '', [Validators.required, Validators.email]],
    });

    this.pwForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordMatchValidator });

    if (!this.isSuperAdmin && this.user?.userId) {
      this.loadPermissions(this.user.userId);
    }

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
      next: res => { this.userPermissions = res.data; this.permsLoading = false; },
      error: () => { this.permsLoading = false; },
    });
  }

  get isSuperAdmin(): boolean { return this.authService.isRole('superadmin'); }

  get initials(): string {
    return (this.user?.fullName ?? 'U')
      .split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  }

  get roleLabel(): string {
    const map: Record<string, string> = { superadmin: 'Super Administrator', admin: 'Administrator' };
    return map[this.user?.role ?? ''] ?? (this.user?.role ?? '');
  }

  get roleBadgeClass(): string { return this.isSuperAdmin ? 'badge-red' : 'badge-blue'; }

  get orgName(): string | null {
    if (this.user?.organization?.name) return this.user.organization.name;
    if (this.user?.organizationId) return `Org #${this.user.organizationId}`;
    return null;
  }

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

  // ── Profile edit ──────────────────────────────────────────────────────
  saveProfile(): void {
    if (this.editForm.invalid) return;
    this.saving = true;
    this.saveError = null;

    const payload = {
      fullName: this.editForm.value.fullName,
      email: this.editForm.value.email,
    };

    // Use PATCH /admin-users/me — works for any role (no superadmin required)
    this.userService.updateSelf(payload).subscribe({
      next: res => {
        this.saving = false;
        this.editMode = false;
        if (this.user) this.user = { ...this.user, ...payload };
        const current = this.authService.currentUser;
        if (current) {
          const updated = { ...current, ...payload };
          (this.authService as any)['_currentUser$']?.next(updated);
          try { localStorage.setItem('tg_user', JSON.stringify(updated)); } catch { /* ignore */ }
        }
      },
      error: (err: any) => {
        this.saveError = err?.error?.message ?? 'Greška pri čuvanju podataka.';
        this.saving = false;
      },
    });
  }

  cancelEdit(): void { this.editMode = false; this.saveError = null; this.editForm.reset({ fullName: this.user?.fullName, email: this.user?.email }); }

  // ── Password change ───────────────────────────────────────────────────
  openPwMode(): void { this.pwMode = true; this.pwError = null; this.pwSuccess = null; this.pwForm.reset(); }
  cancelPw(): void { this.pwMode = false; this.pwError = null; this.pwSuccess = null; }

  changePassword(): void {
    if (this.pwForm.invalid) { this.pwForm.markAllAsTouched(); return; }

    const { newPassword } = this.pwForm.value;
    if (newPassword && newPassword.length < 8) {
      this.pwError = 'Nova lozinka mora imati najmanje 8 karaktera.';
      return;
    }

    if (this.pwForm.hasError('mismatch')) {
      this.pwError = 'Lozinke se ne podudaraju.';
      return;
    }

    this.pwSaving = true;
    this.pwError = null;
    this.pwSuccess = null;

    const { currentPassword } = this.pwForm.value;
    this.userService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.pwSaving = false;
        this.pwSuccess = 'Lozinka je uspešno promenjena.';
        this.pwForm.reset();
        setTimeout(() => { this.pwMode = false; this.pwSuccess = null; }, 2500);
      },
      error: (err: any) => {
        this.pwSaving = false;
        const msg = err?.error?.message ?? '';
        // Backend vraća specifičnu poruku za pogrešnu lozinku
        if (msg.toLowerCase().includes('ispravna') || msg.toLowerCase().includes('incorrect') || err?.status === 400) {
          this.pwError = msg || 'Trenutna lozinka nije ispravna.';
        } else {
          this.pwError = msg || 'Greška pri promeni lozinke. Pokušajte ponovo.';
        }
      },
    });
  }

  f(name: string) { return this.editForm.get(name)!; }
  pw(name: string) { return this.pwForm.get(name)!; }

  logout(): void { this.authService.logout(); }
}
