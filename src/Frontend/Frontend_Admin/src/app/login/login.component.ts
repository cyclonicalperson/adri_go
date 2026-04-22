import { Component, signal } from '@angular/core';
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
  // Signals garantuju reaktivnost bez potrebe za ChangeDetectorRef ili ApplicationRef
  loading = signal(false);
  error = signal<string | null>(null);
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
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    this.auth.login(this.form.value).subscribe({
      next: res => {
        if (res.user.accountStatus === 'suspended') {
          this.auth.logout();
          this.loading.set(false);
          this.error.set('Vaš nalog je suspendovan. Kontaktirajte administratora.');
          return;
        }
        this.loading.set(false);
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err: HttpErrorResponse | Error) => {
        const httpErr = err as HttpErrorResponse;
        const errStatus = httpErr.error?.status ?? '';
        const httpStatus = httpErr.status ?? 0;
        const message = httpErr.error?.message ?? err.message ?? '';

        let msg: string;
        if (errStatus === 'suspended' || message.toLowerCase().includes('aktivan')) {
          msg = 'Vaš nalog je suspendovan. Kontaktirajte administratora.';
        } else if (httpStatus === 401 || httpStatus === 403) {
          msg = 'Pogrešan email ili lozinka.';
        } else if (httpStatus === 0) {
          msg = 'Server nije dostupan. Proverite konekciju.';
        } else {
          msg = message || 'Greška pri prijavi. Pokušajte ponovo.';
        }

        this.loading.set(false);
        this.error.set(msg);
      },
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
