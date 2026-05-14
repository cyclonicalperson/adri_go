import {
  Component,
  OnInit,
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
export class LoginComponent implements OnInit {

  loginForm!: FormGroup;
  isLoading          = false;
  isSocialLoading    = false;
  errorMessage       = '';
  socialError        = '';
  showRegisteredBanner       = false;
  verificationPendingEmail   = '';
  resendMessage      = '';
  resendError        = '';
  isResendingVerification    = false;

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
      password:     ['', Validators.required],
    });

    this.route.queryParams.subscribe(params => {
      const registeredEmail = params['email'];
      this.showRegisteredBanner = params['registered'] === '1';
      if (registeredEmail) {
        this.loginForm.patchValue({ emailOrPhone: registeredEmail });
      }
    });
  }

  // ─── Google sign-in ───────────────────────────────────────────────────────

  onGoogleLogin(): void {
    this.socialError = '';
    this.isSocialLoading = true;
    this.cdr.detectChanges();

    this.socialAuth.triggerGooglePopup(
      credential => this.handleSocialLogin('google', credential),
      message    => {
        this.isSocialLoading = false;
        this.socialError     = message;
        this.cdr.detectChanges();
      },
    );
  }

  // ─── Email / password ─────────────────────────────────────────────────────

  onLogin(): void {
    if (this.loginForm.invalid) return;

    this.isLoading    = true;
    this.errorMessage = '';
    this.resendMessage = '';
    this.resendError  = '';
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
    this.resendError   = '';

    this.authService.resendVerification(this.verificationPendingEmail).subscribe({
      next: res => {
        this.isResendingVerification = false;
        this.resendMessage = this.localizedResendMessage('success');
        this.cdr.detectChanges();
      },
      error: err => {
        this.isResendingVerification = false;
        this.resendError = this.localizedResendMessage('error');
        this.cdr.detectChanges();
      },
    });
  }

  private localizedResendMessage(kind: 'success' | 'error'): string {
    const lang = (
      localStorage.getItem('adrigo_user_language')
      || localStorage.getItem('site_language')
      || navigator.language
      || 'en'
    ).slice(0, 2).toLowerCase();
    const messages: Record<string, Record<'success' | 'error', string>> = {
      en: {
        success: 'A new verification email has been sent.',
        error: 'Could not resend the verification email.',
      },
      sr: {
        success: 'Novi verifikacioni mejl je poslat.',
        error: 'Verifikacioni mejl nije mogao biti poslat.',
      },
      de: {
        success: 'Eine neue Bestatigungs-E-Mail wurde gesendet.',
        error: 'Die Bestatigungs-E-Mail konnte nicht erneut gesendet werden.',
      },
      fr: {
        success: 'Un nouvel e-mail de verification a ete envoye.',
        error: "Impossible de renvoyer l'e-mail de verification.",
      },
      it: {
        success: 'Una nuova email di verifica e stata inviata.',
        error: "Impossibile inviare di nuovo l'email di verifica.",
      },
      es: {
        success: 'Se ha enviado un nuevo correo de verificacion.',
        error: 'No se pudo reenviar el correo de verificacion.',
      },
      nl: {
        success: 'Er is een nieuwe verificatie-e-mail verzonden.',
        error: 'De verificatie-e-mail kon niet opnieuw worden verzonden.',
      },
      ru: {
        success: 'Новое письмо для подтверждения отправлено.',
        error: 'Не удалось повторно отправить письмо для подтверждения.',
      },
    };
    return (messages[lang] ?? messages['en'])[kind];
  }

  // ─── Social login (shared) ────────────────────────────────────────────────

  /** Called after Google returns a credential ID token. */
  private handleSocialLogin(
    provider: 'google' | 'apple',
    credential: string,
    displayName?: string,
  ): void {
    this.isSocialLoading = true;
    this.socialError     = '';
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
