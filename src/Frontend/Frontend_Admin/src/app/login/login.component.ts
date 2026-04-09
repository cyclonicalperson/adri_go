import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  imports: [ReactiveFormsModule],   // No RouterLink needed — we navigate imperatively
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
        if (res.user.role === 'ADMIN' || res.user.role === 'ORG') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/app']);
        }
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.message ?? 'Pogrešan email ili lozinka.';
      },
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
