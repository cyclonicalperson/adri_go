import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { DateLocalPipe } from '@shared/pipes/date-local.pipe';

// Extend the base user type with optional fields that the token storage
// may persist but that AuthResponse['user'] doesn't declare.
interface ExtendedUser {
  userId: number;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'ORG' | 'TOURIST';
  organizationId: number | null;
  // Fields populated from mock data / full API profile endpoint:
  organization?: { organizationId: number; name: string } | null;
  createdAt?: string | null;
}

interface PermGroup {
  entityName: string;
  entityType: string;
  icon: string;
  permissions: string[];
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  imports: [ReactiveFormsModule, DateLocalPipe],
})
export class ProfileComponent implements OnInit {
  // Declare auth before user so the field initializer can reference it
  private readonly authService: AuthService;

  user: ExtendedUser | null = null;
  editMode = false;
  saving = false;
  editForm!: FormGroup;

  readonly permissionGroups: PermGroup[] = [
    {
      entityName: 'Hotel Kopaonik Star',
      entityType: 'Lokacija · Kopaonik',
      icon: '🏔️',
      permissions: ['manage_place', 'create_event', 'view_analytics'],
    },
    {
      entityName: 'Spa & Wellness Vrnjci',
      entityType: 'Lokacija · Vrnjačka Banja',
      icon: '💆',
      permissions: ['manage_place', 'view_analytics'],
    },
  ];

  readonly platformStats = { admins: 5, locations: 248, events: 37, pending: 12 };

  constructor(
    auth: AuthService,
    private fb: FormBuilder,
    private router: Router,
  ) {
    // Assign to the field AFTER constructor parameter is available
    this.authService = auth;
    this.user = auth.currentUser as ExtendedUser | null;
  }

  ngOnInit(): void {
    this.editForm = this.fb.group({
      fullName: [this.user?.fullName ?? '', Validators.required],
      email: [this.user?.email ?? '', [Validators.required, Validators.email]],
    });
  }

  get isSuperAdmin(): boolean { return this.authService.isRole('ADMIN'); }

  get initials(): string {
    return (this.user?.fullName ?? 'U')
      .split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  }

  get roleLabel(): string {
    return { ADMIN: 'Super Administrator', ORG: 'Admin' }[this.user?.role ?? '']
      ?? (this.user?.role ?? '');
  }

  get roleBadgeClass(): string {
    return this.isSuperAdmin ? 'badge-red' : 'badge-blue';
  }

  // Organization name — falls back to organizationId hint when full object not loaded
  get orgName(): string | null {
    if (this.user?.organization?.name) return this.user.organization.name;
    if (this.user?.organizationId) return `Admin #${this.user.organizationId}`;
    return null;
  }

  saveProfile(): void {
    if (this.editForm.invalid) return;
    this.saving = true;
    // TODO: call API to PATCH /profile
    setTimeout(() => { this.saving = false; this.editMode = false; }, 600);
  }

  changePassword(): void {
    alert('Promena lozinke — u razvoju.');
  }

  logout(): void { this.authService.logout(); }
}
