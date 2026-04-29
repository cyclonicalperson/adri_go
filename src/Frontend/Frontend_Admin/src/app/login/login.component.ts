import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '@core/auth/auth.service';
import { environment } from '@env/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = false;
  readonly touristAppUrl = environment.touristAppUrl;

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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.auth.login(this.form.value).subscribe({
      next: res => {
        if (res.user.accountStatus === 'suspended') {
          this.auth.logout();
          this.loading.set(false);
          this.error.set('Vas nalog je suspendovan. Kontaktirajte administratora.');
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
          msg = 'Vas nalog je suspendovan. Kontaktirajte administratora.';
        } else if (httpStatus === 401 || httpStatus === 403) {
          msg = 'Pogresan email ili lozinka.';
        } else if (httpStatus === 0) {
          msg = 'Server nije dostupan. Proverite konekciju.';
        } else {
          msg = message || 'Greska pri prijavi. Pokusajte ponovo.';
        }

        this.loading.set(false);
        this.error.set(msg);
      },
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  goToTouristApp(): void {
    window.location.assign(this.touristAppUrl);
  }
}
