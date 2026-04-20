import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
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
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
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
    if (this.loading) return; // Sprečava dupli klik

    this.loading = true;
    this.error = null;

    this.auth.login(this.form.value).subscribe({
      next: res => {
        this.ngZone.run(() => {
          this.loading = false;
          if (res.user.accountStatus === 'suspended') {
            this.error = 'Vaš nalog je suspendovan. Kontaktirajte administratora.';
            this.auth.logout();
            this.cdr.markForCheck();
            return;
          }
          this.router.navigate(['/admin/dashboard']);
        });
      },
      error: (err: HttpErrorResponse | Error) => {
        this.ngZone.run(() => {
          this.loading = false;
          // err može biti HttpErrorResponse (sa interceptora) ili Error
          const httpErr = err as HttpErrorResponse;
          const status = httpErr.error?.status ?? (err as any).status;
          const message = httpErr.error?.message ?? err.message ?? '';

          if (status === 'suspended' || message.toLowerCase().includes('suspendovan') || message.toLowerCase().includes('aktivan')) {
            this.error = 'Vaš nalog je suspendovan. Kontaktirajte administratora.';
          } else if (status === 401 || httpErr.status === 401) {
            this.error = 'Pogrešan email ili lozinka.';
          } else {
            this.error = message || 'Greška pri prijavi. Pokušajte ponovo.';
          }
          this.cdr.markForCheck();
        });
      },
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
