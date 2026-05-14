import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '@core/services/user.service';
import { Role, Organization } from '@core/models/user.model';
import { AdminRole } from '@core/auth/auth.service';
import { RolesPermissionsComponent } from '../role-permissions/roles-permissions.component';

function passwordMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword ? { mismatch: true } : null;
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
  passwordInteracted = false;

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
      confirmPassword:[''],
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
      this.form.get('confirmPassword')!.disable({ emitEvent: false });
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
      this.form.get('password')!.setValidators([
        Validators.required,
        Validators.minLength(8),
        passwordUppercaseValidator,
        passwordNumberOrSpecialValidator,
      ]);
      this.form.get('confirmPassword')!.setValidators(Validators.required);
      this.form.get('password')!.updateValueAndValidity();
      this.form.get('confirmPassword')!.updateValueAndValidity();
      this.form.setValidators(passwordMatch);
      this.form.updateValueAndValidity();
      this.f('password').valueChanges.subscribe(() => this.syncConfirmPasswordState());
      this.syncConfirmPasswordState();
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

  get passwordRulesVisible(): boolean {
    return !this.isEdit && this.passwordInteracted && this.f('password').invalid;
  }

  get passwordHasMinLength(): boolean {
    return !this.f('password').hasError('minlength');
  }

  get passwordHasUppercase(): boolean {
    return !this.f('password').hasError('uppercase');
  }

  get passwordHasNumberOrSpecial(): boolean {
    return !this.f('password').hasError('numberOrSpecial');
  }

  get passwordIsValid(): boolean {
    return this.f('password').valid;
  }

  get showPasswordValidMessage(): boolean {
    return !this.isEdit && this.passwordInteracted && !!this.f('password').value && this.passwordIsValid;
  }

  get passwordInputInvalid(): boolean {
    return !this.isEdit && this.passwordInteracted && this.f('password').invalid;
  }

  get passwordInputValid(): boolean {
    return !this.isEdit && this.passwordInteracted && !!this.f('password').value && this.f('password').valid;
  }

  get confirmPasswordEnabled(): boolean {
    return !this.isEdit && this.f('confirmPassword').enabled;
  }

  get confirmPasswordMismatchVisible(): boolean {
    return this.confirmPasswordEnabled && !!this.f('confirmPassword').value && this.form.hasError('mismatch');
  }

  get confirmPasswordValid(): boolean {
    return this.confirmPasswordEnabled && !!this.f('confirmPassword').value && !this.form.hasError('mismatch');
  }

  f(name: string) { return this.form.get(name)!; }

  onPasswordInteract(): void {
    this.passwordInteracted = true;
  }

  private syncConfirmPasswordState(): void {
    if (this.isEdit) return;

    const confirmControl = this.f('confirmPassword');
    if (this.f('password').valid) {
      if (confirmControl.disabled) {
        confirmControl.enable({ emitEvent: false });
      }
      this.form.updateValueAndValidity({ emitEvent: false });
      return;
    }

    if (confirmControl.enabled) {
      confirmControl.reset('', { emitEvent: false });
      confirmControl.disable({ emitEvent: false });
      confirmControl.markAsPristine();
      confirmControl.markAsUntouched();
    }

    this.form.updateValueAndValidity({ emitEvent: false });
  }

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
