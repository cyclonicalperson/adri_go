import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  imports: [ReactiveFormsModule],
})
export class LoginComponent {
  form: FormGroup;
  error: string | null = null;
  loading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  get email() { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading = true;
    this.error = null;

    this.auth.login(this.form.value).subscribe({
      next: res => {
        this.loading = false;
        // Both ADMIN (superadmin) and ORG (regular admin) use the admin panel
        if (res.user.role === 'ADMIN' || res.user.role === 'ORG') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          // TOURIST role — redirect to tourist app (future)
          this.router.navigate(['/app']);
        }
      },
      error: err => {
        this.loading = false;
        this.error = err.message ?? 'Pogrešan email ili lozinka.';
      },
    });
  }
}
