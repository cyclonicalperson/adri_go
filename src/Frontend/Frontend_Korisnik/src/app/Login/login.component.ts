import {
  Component,
  OnInit,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SocialAuthService } from '../services/social-auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, AfterViewInit {

  loginForm!: FormGroup;
  isLoading = false;
  isSocialLoading = false;
  googleReady = false;
  errorMessage = '';
  socialError = '';
  showRegisteredBanner = false;
  verificationPendingEmail = '';
  resendMessage = '';
  resendError = '';
  isResendingVerification = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private socialAuth: SocialAuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      emailOrPhone: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });

    this.route.queryParams.subscribe(params => {
      const registeredEmail = params['email'];
      this.showRegisteredBanner = params['registered'] === '1';
      if (registeredEmail) {
        this.loginForm.patchValue({ emailOrPhone: registeredEmail });
      }
    });
  }

  ngAfterViewInit(): void {
    // Initialise the Google GSI SDK. Once ready, enable the sign-in button.
    // The credential callback fires when the user completes Google sign-in.
    this.socialAuth.initGoogleSignIn(
      credential => this.handleSocialLogin('google', credential),
      () => { this.googleReady = true; this.cdr.detectChanges(); },
    );
  }

  onGoogleLogin(): void {
    if (!this.googleReady) {
      this.socialError = 'Google sign-in is still loading — please try again in a moment.';
      return;
    }
    this.socialAuth.promptGoogle();
  }

  // ─── Email / password ─────────────────────────────────────────────────────

  onLogin(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.resendMessage = '';
    this.resendError = '';
    this.verificationPendingEmail = '';

    const { emailOrPhone, password } = this.loginForm.value;

    this.authService.login(emailOrPhone, password).subscribe({
      next: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
        this.router.navigate(['/map-home']);
      },
      error: err => {
        this.isLoading = false;
        if (err?.error?.emailNotVerified) {
          this.verificationPendingEmail = emailOrPhone;
          this.errorMessage =
            err?.error?.message || 'Please verify your email address before logging in.';
        } else {
          this.errorMessage =
            err?.error?.message || 'Incorrect email or password. Please try again.';
        }
        this.cdr.detectChanges();
      },
    });
  }

  resendVerification(): void {
    if (!this.verificationPendingEmail || this.isResendingVerification) return;

    this.isResendingVerification = true;
    this.resendMessage = '';
    this.resendError = '';

    this.authService.resendVerification(this.verificationPendingEmail).subscribe({
      next: res => {
        this.isResendingVerification = false;
        this.resendMessage = res.message || 'A new verification email has been sent.';
        this.cdr.detectChanges();
      },
      error: err => {
        this.isResendingVerification = false;
        this.resendError = err?.error?.message || 'Could not resend the verification email.';
        this.cdr.detectChanges();
      },
    });
  }

  // ─── Social login ─────────────────────────────────────────────────────────

  /** Called after Google (via SDK callback) or Apple returns a credential. */
  private handleSocialLogin(
    provider: 'google' | 'apple',
    credential: string,
    displayName?: string,
  ): void {
    this.isSocialLoading = true;
    this.socialError = '';
    this.cdr.detectChanges();

    this.authService.socialLogin(provider, credential, displayName).subscribe({
      next: () => {
        this.isSocialLoading = false;
        this.router.navigate(['/map-home']);
      },
      error: err => {
        this.isSocialLoading = false;
        this.socialError =
          err?.error?.message ||
          `${provider === 'google' ? 'Google' : 'Apple'} sign-in failed. Please try again.`;
        this.cdr.detectChanges();
      },
    });
  }

  // ─── Navigation helpers ───────────────────────────────────────────────────

  onGuestLogin(): void {
    this.router.navigate(['/map-home']);
  }

  goToRegister(): void {
    this.router.navigate(['/choose-role']);
  }

  goToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }
}
