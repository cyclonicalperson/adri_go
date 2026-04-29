import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
  showRegisteredBanner = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      emailOrPhone: ['', [Validators.required]],
      password: ['', Validators.required]
    });

    // Show banner when redirected from registration with email-verification required
    this.route.queryParams.subscribe(params => {
      if (params['registered'] === '1') {
        this.showRegisteredBanner = true;
      }
    });
  }

  onLogin(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const { emailOrPhone, password } = this.loginForm.value;

    this.authService.loginWithToken(emailOrPhone, password).subscribe({
      next: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
        this.router.navigate(['/map-home']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Incorrect email or password. Please try again.';
        this.cdr.detectChanges();
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

  goToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }
}
