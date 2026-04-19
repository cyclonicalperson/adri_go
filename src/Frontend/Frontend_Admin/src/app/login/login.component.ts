import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
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
        // Provjeri accountStatus - suspended admin ne smije ući
        if (res.user.accountStatus === 'suspended') {
          this.error = 'Vaš nalog je suspendovan. Kontaktirajte administratora.';
          this.auth.logout();
          return;
        }
        this.router.navigate(['/admin/dashboard']);
      },
      error: err => {
        this.loading = false;
        // Backend vraća status field za suspended
        const status = err.error?.status;
        if (status === 'suspended') {
          this.error = 'Vaš nalog je suspendovan. Kontaktirajte administratora.';
        } else {
          this.error = err.error?.message ?? 'Pogrešan email ili lozinka.';
        }
      },
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
