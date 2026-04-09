import { Component } from '@angular/core';
import {
  FormBuilder, FormGroup, Validators,
  AbstractControl, ValidationErrors, ReactiveFormsModule,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

function passwordMatch(g: AbstractControl): ValidationErrors | null {
  const pw = g.get('password')?.value;
  const cpw = g.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  imports: [ReactiveFormsModule, RouterLink],
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  showPassword = false;
  error: string | null = null;
  successMsg: string | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.form = this.fb.group(
      {
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        orgName: ['', Validators.required],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordMatch },
    );
  }

  get firstName() { return this.form.get('firstName')!; }
  get lastName() { return this.form.get('lastName')!; }
  get email() { return this.form.get('email')!; }
  get orgName() { return this.form.get('orgName')!; }
  get password() { return this.form.get('password')!; }
  get confirmPassword() { return this.form.get('confirmPassword')!; }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading = true;
    this.error = null;

    const payload = {
      fullName: `${this.firstName.value} ${this.lastName.value}`,
      email: this.email.value,
      password: this.password.value,
      orgName: this.orgName.value,
      role: 'ORG',
    };

    this.http.post(`${environment.apiUrl}/auth/register`, payload).subscribe({
      next: () => {
        this.loading = false;
        this.successMsg = `Email za verifikaciju je poslat na ${this.email.value}. Proverite sanduče i kliknite na link da aktivirate nalog.`;
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.message ?? 'Došlo je do greške. Pokušajte ponovo.';
      },
    });
  }
}
