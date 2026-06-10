import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { UniversalPasswordStatus, UserService } from '@core/services/user.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { UserPermission } from '@core/models/user.model';
import { DateLocalPipe } from '@shared/pipes/date-local.pipe';
import { DecimalPipe } from '@angular/common';
import { SiteTranslateService } from '@core/services/site-translate.service';
import { adminPermissionDescription, adminPermissionLabel } from '@core/utils/admin-permission-i18n';

function passwordMatchValidator(g: AbstractControl): ValidationErrors | null {
  const pw = g.get('newPassword')?.value;
  const cpw = g.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { mismatch: true } : null;
}

function passwordUppercaseValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string | null;
  if (!value) return null;
  return /[A-Z]/.test(value) ? null : { uppercase: true };
}

function passwordNumberOrSpecialValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string | null;
  if (!value) return null;
  return /[\d\W_]/.test(value) ? null : { numberOrSpecial: true };
}

interface ExtendedUser {
  userId: number;
  fullName: string;
  email: string;
  role: 'superadmin' | 'admin';
  organizationId: number | null;
  isIndividual: boolean;
  accountStatus: 'active' | 'suspended' | 'pending';
  profileImage?: string | null;
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
  photoUploading = false;
  saveError: string | null = null;
  editForm!: FormGroup;

  // Password change
  pwMode = false;
  pwSaving = false;
  pwError: string | null = null;
  pwSuccess: string | null = null;
  pwForm!: FormGroup;
  pwNewPasswordInteracted = false;

  universalLoading = false;
  universalSaving = false;
  universalVisible = false;
  universalError: string | null = null;
  universalSuccess: string | null = null;
  universalStatus: UniversalPasswordStatus | null = null;
  universalForm!: FormGroup;
  universalNewPasswordInteracted = false;

  userPermissions: UserPermission[] = [];
  permsLoading = false;

  platformStats = {
    admins: 0,
    posts: 0,
    routes: 0,
    pending: 0,
    tourists: 0,
    regions: 0,
    pendingReviews: 0,
    unreadNotifications: 0,
  };
  statsLoading = false;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private analytics: AnalyticsService,
    private fb: FormBuilder,
    private router: Router,
    private translate: SiteTranslateService,
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
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        passwordUppercaseValidator,
        passwordNumberOrSpecialValidator,
      ]],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordMatchValidator });
    this.pw('newPassword').valueChanges.subscribe(() => this.syncPwConfirmState());
    this.syncPwConfirmState();

    this.universalForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        passwordUppercaseValidator,
        passwordNumberOrSpecialValidator,
      ]],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordMatchValidator });
    this.uw('newPassword').valueChanges.subscribe(() => this.syncUniversalConfirmState());
    this.syncUniversalConfirmState();

    if (!this.isSuperAdmin && this.user?.userId) {
      this.loadPermissions(this.user.userId);
    }

    if (this.isSuperAdmin) {
      this.loadUniversalPassword();
      this.statsLoading = true;
      this.analytics.getDashboardStats().subscribe({
        next: res => {
          this.platformStats = {
            admins: res.data.totalAdmins,
            posts: res.data.totalLocations ?? res.data.totalPosts,
            routes: res.data.totalRoutes,
            pending: res.data.pendingRegistrations,
            tourists: res.data.totalTourists,
            regions: res.data.totalRegions,
            pendingReviews: res.data.pendingReviews,
            unreadNotifications: res.data.unreadNotifications,
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

  get pwRulesVisible(): boolean {
    return this.pwNewPasswordInteracted && this.pw('newPassword').invalid;
  }

  get pwHasMinLength(): boolean {
    return !this.pw('newPassword').hasError('minlength');
  }

  get pwHasUppercase(): boolean {
    return !this.pw('newPassword').hasError('uppercase');
  }

  get pwHasNumberOrSpecial(): boolean {
    return !this.pw('newPassword').hasError('numberOrSpecial');
  }

  get pwIsValid(): boolean {
    return this.pw('newPassword').valid;
  }

  get showPwValidMessage(): boolean {
    return this.pwNewPasswordInteracted && !!this.pw('newPassword').value && this.pwIsValid;
  }

  get pwInputInvalid(): boolean {
    return this.pwNewPasswordInteracted && this.pw('newPassword').invalid;
  }

  get pwInputValid(): boolean {
    return this.pwNewPasswordInteracted && !!this.pw('newPassword').value && this.pw('newPassword').valid;
  }

  get pwConfirmEnabled(): boolean {
    return this.pw('confirmPassword').enabled;
  }

  get pwConfirmMismatchVisible(): boolean {
    return this.pwConfirmEnabled && !!this.pw('confirmPassword').value && this.pwForm.hasError('mismatch');
  }

  get pwConfirmValid(): boolean {
    return this.pwConfirmEnabled && !!this.pw('confirmPassword').value && !this.pwForm.hasError('mismatch');
  }

  get universalRulesVisible(): boolean {
    return this.universalNewPasswordInteracted && this.uw('newPassword').invalid;
  }

  get universalHasMinLength(): boolean {
    return !this.uw('newPassword').hasError('minlength');
  }

  get universalHasUppercase(): boolean {
    return !this.uw('newPassword').hasError('uppercase');
  }

  get universalHasNumberOrSpecial(): boolean {
    return !this.uw('newPassword').hasError('numberOrSpecial');
  }

  get universalInputInvalid(): boolean {
    return this.universalNewPasswordInteracted && this.uw('newPassword').invalid;
  }

  get universalInputValid(): boolean {
    return this.universalNewPasswordInteracted && !!this.uw('newPassword').value && this.uw('newPassword').valid;
  }

  get universalValidMessageVisible(): boolean {
    return this.universalInputValid;
  }

  get universalConfirmEnabled(): boolean {
    return this.uw('confirmPassword').enabled;
  }

  get universalConfirmMismatchVisible(): boolean {
    return this.universalConfirmEnabled && !!this.uw('confirmPassword').value && this.universalForm.hasError('mismatch');
  }

  get universalConfirmValid(): boolean {
    return this.universalConfirmEnabled && !!this.uw('confirmPassword').value && !this.universalForm.hasError('mismatch');
  }

  get universalPasswordValue(): string {
    return this.universalStatus?.password ?? '';
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

  permissionLabel(permission: UserPermission['permission']): string {
    return this.translate.instant(adminPermissionLabel(permission));
  }

  permissionDescription(permission: UserPermission['permission']): string {
    return this.translate.instant(adminPermissionDescription(permission));
  }

  // ── Profile edit ──────────────────────────────────────────────────────
  saveProfile(): void {
    if (this.editForm.invalid) return;
    this.saving = true;
    this.saveError = null;

    const payload = {
      fullName: this.editForm.value.fullName,
      email: this.editForm.value.email,
      profileImage: this.user?.profileImage ?? null,
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

  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.photoUploading) return;

    this.photoUploading = true;
    this.saveError = null;
    this.userService.uploadProfileImage(file).subscribe({
      next: url => {
        if (this.user) this.user = { ...this.user, profileImage: url };
        this.userService.updateSelf({ profileImage: url }).subscribe({
          next: () => {
            const current = this.authService.currentUser;
            if (current) {
              const updated = { ...current, profileImage: url };
              (this.authService as any)['_currentUser$']?.next(updated);
              try { localStorage.setItem('tg_user', JSON.stringify(updated)); } catch { /* ignore */ }
            }
            this.photoUploading = false;
          },
          error: () => {
            this.photoUploading = false;
            this.saveError = 'Slika je uploadovana, ali profil nije azuriran.';
          },
        });
      },
      error: () => {
        this.photoUploading = false;
        this.saveError = 'Greška pri uploadu slike profila.';
      }
    });
  }

  removeProfileImage(): void {
    if (this.photoUploading) return;
    this.photoUploading = true;
    this.saveError = null;

    this.userService.updateSelf({ profileImage: null }).subscribe({
      next: () => {
        if (this.user) this.user = { ...this.user, profileImage: null };
        const current = this.authService.currentUser;
        if (current) {
          const updated = { ...current, profileImage: null };
          (this.authService as any)['_currentUser$']?.next(updated);
          try { localStorage.setItem('tg_user', JSON.stringify(updated)); } catch { /* ignore */ }
        }
        this.photoUploading = false;
      },
      error: () => {
        this.photoUploading = false;
        this.saveError = 'Greška pri uklanjanju slike profila.';
      },
    });
  }

  get hasCustomProfileImage(): boolean {
    return !!this.user?.profileImage;
  }

  // ── Password change ───────────────────────────────────────────────────
  openPwMode(): void {
    this.pwMode = true;
    this.pwError = null;
    this.pwSuccess = null;
    this.pwNewPasswordInteracted = false;
    this.pwForm.reset();
    this.syncPwConfirmState();
  }
  cancelPw(): void { this.pwMode = false; this.pwError = null; this.pwSuccess = null; }

  onPwNewPasswordInteract(): void {
    this.pwNewPasswordInteracted = true;
  }

  private syncPwConfirmState(): void {
    const confirmControl = this.pw('confirmPassword');
    if (this.pw('newPassword').valid) {
      if (confirmControl.disabled) {
        confirmControl.enable({ emitEvent: false });
      }
      this.pwForm.updateValueAndValidity({ emitEvent: false });
      return;
    }

    if (confirmControl.enabled) {
      confirmControl.reset('', { emitEvent: false });
      confirmControl.disable({ emitEvent: false });
      confirmControl.markAsPristine();
      confirmControl.markAsUntouched();
    }

    this.pwForm.updateValueAndValidity({ emitEvent: false });
  }

  changePassword(): void {
    if (this.pwForm.invalid) { this.pwForm.markAllAsTouched(); return; }

    this.pwSaving = true;
    this.pwError = null;
    this.pwSuccess = null;

    const { currentPassword, newPassword } = this.pwForm.value;
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

  loadUniversalPassword(): void {
    this.universalLoading = true;
    this.universalError = null;
    this.userService.getUniversalPassword().subscribe({
      next: res => {
        this.universalStatus = res.data;
        this.universalLoading = false;
      },
      error: (err: any) => {
        this.universalError = err?.error?.message ?? 'Greška pri učitavanju univerzalne lozinke.';
        this.universalLoading = false;
      },
    });
  }

  onUniversalNewPasswordInteract(): void {
    this.universalNewPasswordInteracted = true;
  }

  private syncUniversalConfirmState(): void {
    const confirmControl = this.uw('confirmPassword');
    if (this.uw('newPassword').valid) {
      if (confirmControl.disabled) {
        confirmControl.enable({ emitEvent: false });
      }
      this.universalForm.updateValueAndValidity({ emitEvent: false });
      return;
    }

    if (confirmControl.enabled) {
      confirmControl.reset('', { emitEvent: false });
      confirmControl.disable({ emitEvent: false });
      confirmControl.markAsPristine();
      confirmControl.markAsUntouched();
    }

    this.universalForm.updateValueAndValidity({ emitEvent: false });
  }

  saveUniversalPassword(): void {
    if (this.universalForm.invalid) {
      this.universalForm.markAllAsTouched();
      return;
    }

    this.universalSaving = true;
    this.universalError = null;
    this.universalSuccess = null;

    const { currentPassword, newPassword } = this.universalForm.value;
    this.userService.updateUniversalPassword(currentPassword, newPassword).subscribe({
      next: res => {
        this.universalStatus = res.data;
        this.universalSaving = false;
        this.universalSuccess = 'Univerzalna lozinka je promenjena.';
        this.universalNewPasswordInteracted = false;
        this.universalForm.reset();
        this.syncUniversalConfirmState();
      },
      error: (err: any) => {
        this.universalSaving = false;
        this.universalError = err?.error?.message ?? 'Greška pri promeni univerzalne lozinke.';
      },
    });
  }

  f(name: string) { return this.editForm.get(name)!; }
  pw(name: string) { return this.pwForm.get(name)!; }
  uw(name: string) { return this.universalForm.get(name)!; }

  logout(): void { this.authService.logout(); }
}
