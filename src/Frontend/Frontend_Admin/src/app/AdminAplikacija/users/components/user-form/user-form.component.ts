import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '@core/services/user.service';
import { Role, Organization } from '@core/models/user.model';
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
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      roleId: [null, Validators.required],
      organizationId: [null],
      isActive: [true],
    });

    this.service.getRoles().subscribe((res: { data: Role[]; }) => { this.roles = res.data; });
    this.service.getOrganizations().subscribe((res: { data: Organization[]; }) => { this.organizations = res.data; });

    this.id = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isEdit = !!this.id;

    if (this.isEdit) {
      this.service.getById(this.id!).subscribe((res: { data: any; }) => {
        const u = res.data;
        this.form.patchValue({
          fullName: u.fullName,
          email: u.email,
          roleId: u.roleId,
          organizationId: u.organizationId,
          isActive: u.isActive,
        });
      });
    } else {
      this.form.get('password')!.setValidators(Validators.required);
      this.form.get('password')!.updateValueAndValidity();
    }
  }

  onRoleSelected(roleId: number): void {
    this.form.patchValue({ roleId });
    const selectedRole = this.roles.find(r => r.roleId === roleId);
    if (selectedRole?.roleName !== 'ORG') {
      this.form.patchValue({ organizationId: null });
    }
  }

  get selectedRole(): string | undefined {
    const id = this.form.get('roleId')?.value;
    return this.roles.find(r => r.roleId === id)?.roleName;
  }

  f(name: string) { return this.form.get(name)!; }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.error = null;

    const raw = this.form.value;
    const payload = {
      ...raw,
      organizationId: raw.organizationId || undefined,
      password: raw.password || undefined,
    };

    const req$ = this.isEdit
      ? this.service.update(this.id!, payload)
      : this.service.create(payload);

    req$.subscribe({
      next: () => this.router.navigate(['/admin/users']),
      error: (err: { message: string | null; }) => { this.error = err.message; this.saving = false; },
    });
  }

  cancel(): void { this.router.navigate(['/admin/users']); }
}
