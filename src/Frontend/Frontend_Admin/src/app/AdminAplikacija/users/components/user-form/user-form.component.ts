import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '@core/services/user.service';
import { Role, Organization } from '@core/models/user.model';
import { AdminRole } from '@core/auth/auth.service';
import { RolesPermissionsComponent } from '../role-permissions/roles-permissions.component';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule, RolesPermissionsComponent],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss',
})
export class UserFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  id: number | null = null;
  saving = false;
  error: string | null = null;

  roles: Role[] = [];
  organizations: Organization[] = [];
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private service: UserService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fullName:       ['', Validators.required],
      email:          ['', [Validators.required, Validators.email]],
      password:       [''],
      role:           ['admin', Validators.required],  // Backend koristi role string ('admin'|'superadmin')
      organizationId: [null],
      isIndividual:   [true],
      accountStatus:  ['active'],
    });

    this.service.getRoles().subscribe(res => { this.roles = res.data; });
    this.service.getOrganizations().subscribe(res => { this.organizations = res.data; });

    this.id = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isEdit = !!this.id;

    if (this.isEdit) {
      this.service.getById(this.id!).subscribe(res => {
        const u = res.data;
        if (!u) return;
        this.form.patchValue({
          fullName:       u.fullName,
          email:          u.email,
          // Backend vraća role kao string enum: 'admin' | 'superadmin'
          role:           u.role ?? 'admin',
          organizationId: u.organizationId,
          isIndividual:   u.isIndividual ?? true,
          accountStatus:  u.accountStatus ?? 'active',
        });
      });
    } else {
      // Lozinka obavezna samo pri kreiranju
      this.form.get('password')!.setValidators(Validators.required);
      this.form.get('password')!.updateValueAndValidity();
    }
  }

  onRoleSelected(roleId: number): void {
    // Iz RolesPermissionsComponent dobijamo roleId, konvertujemo u role string
    const found = this.roles.find(r => r.roleId === roleId);
    if (found) this.form.patchValue({ role: found.roleName });
  }

  get selectedRole(): string | undefined {
    return this.form.get('role')?.value;
  }

  // Virtuelni roleId za kompatibilnost sa RolesPermissionsComponent
  get selectedRoleId(): number | null {
    const roleName = this.form.get('role')?.value;
    return this.roles.find(r => r.roleName === roleName)?.roleId ?? null;
  }

  f(name: string) { return this.form.get(name)!; }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.error = null;

    const raw = this.form.value;

    // Backend AdminUsersController prihvata: fullName, email, password, role, organizationId, isIndividual
    const payload: any = {
      fullName:       raw.fullName,
      email:          raw.email,
      role:           raw.role as AdminRole,
      organizationId: raw.organizationId || null,
      isIndividual:   raw.isIndividual,
    };

    if (raw.password) payload['password'] = raw.password;
    if (raw.accountStatus && this.isEdit) payload['accountStatus'] = raw.accountStatus;

    const req$ = this.isEdit
      ? this.service.update(this.id!, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: () => {
        // Navigiramo na listu — users-list.load() će se pozvati na ngOnInit
        this.router.navigate(['/admin/users']);
      },
      error: (err: any) => {
        this.error = err?.error?.message ?? err?.message ?? 'Greška pri čuvanju.';
        this.saving = false;
      },
    });
  }

  cancel(): void { this.router.navigate(['/admin/users']); }
}
