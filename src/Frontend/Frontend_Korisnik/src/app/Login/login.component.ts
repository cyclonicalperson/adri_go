import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      emailOrPhone: ['', [Validators.required]],
      password: ['', Validators.required]
    });
  }

  onLogin(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const { emailOrPhone, password } = this.loginForm.value;

    // Try JWT-enabled endpoint first (tourist-auth), fall back to simple tourists endpoint
    this.authService.loginWithToken(emailOrPhone, password).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/map-home']);
      },
      error: () => {
        // Fallback to simple endpoint (no JWT)
        this.authService.login(emailOrPhone, password).subscribe({
          next: () => {
            this.isLoading = false;
            this.router.navigate(['/map-home']);
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = err?.error?.message || 'Pogrešan email ili lozinka.';
          }
        });
      }
    });
  }

  onGuestLogin(): void {
    this.router.navigate(['/map-home']);
  }

  onGoogleLogin(): void { console.log('Google login — nije implementiran'); }
  onAppleLogin(): void  { console.log('Apple login — nije implementiran'); }

  goToRegister(): void {
    this.router.navigate(['/choose-role']);
  }
}
