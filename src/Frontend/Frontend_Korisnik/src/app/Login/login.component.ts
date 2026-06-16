import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectorRef,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { SocialAuthService } from '../services/social-auth.service';
import { SiteTranslateService, SiteLanguageCode, SiteLanguageOption } from '../services/site-translate.service';
import { environment } from '../../environments/environment';

interface SlideConfig {
  caption: string;
}

interface HeroStats {
  locations: string;
  regions: string;
  rating: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {

  loginForm!: FormGroup;
  isLoading                = false;
  isSocialLoading          = false;
  errorMessage             = '';
  socialError              = '';
  verificationPendingEmail = '';
  resendMessage            = '';
  resendError              = '';
  isResendingVerification  = false;

  // ── Slideshow ────────────────────────────────────────────────────────────
  activeSlide = 0;
  private slideInterval: ReturnType<typeof setInterval> | null = null;

  readonly slides: SlideConfig[] = [
    { caption: 'Kotor Bay, Montenegro' },
    { caption: 'Santorini, Greece' },
    { caption: 'Durmitor, Montenegro' },
    { caption: 'Rome, Italy' },
    { caption: 'Budva, Montenegro' },
    { caption: 'Colmar, France' },
    { caption: 'Beach, Montenegro' },
    { caption: 'Santorini, Greece' },
    { caption: 'Barcelona, Spain' },
  ];

  // ── Hero stats (loaded from API) ─────────────────────────────────────────
  heroStats: HeroStats = { locations: '...', regions: '...', rating: '...' };

  // ── Language switcher ────────────────────────────────────────────────────
  langMenuOpen = false;
  languages: SiteLanguageOption[] = [];
  currentLang!: SiteLanguageOption;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private authService: AuthService,
    private socialAuth: SocialAuthService,
    private translate: SiteTranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      emailOrPhone: ['', [Validators.required, Validators.email]],
      password:     ['', Validators.required],
    });

    this.route.queryParams.subscribe(params => {
      const registeredEmail = params['email'];
      if (registeredEmail) {
        this.loginForm.patchValue({ emailOrPhone: registeredEmail });
      }

      if (params['reason'] === 'session_expired') {
        this.errorMessage = 'Your session has expired. Please log in again.';
      }
    });

    // Language switcher setup
    this.languages = this.translate.languages;
    this.currentLang = this.translate.currentLanguageOption;
    this.translate.language$.subscribe(code => {
      this.currentLang = this.translate.languages.find(l => l.code === code) ?? this.languages[0];
      this.cdr.detectChanges();
    });

    // Start slideshow (8 seconds per slide)
    this.startSlideshow();

    // Load real stats from API
    this.loadHeroStats();
  }

  ngOnDestroy(): void {
    this.stopSlideshow();
  }

  // ── Slideshow ────────────────────────────────────────────────────────────

  private startSlideshow(): void {
    this.slideInterval = setInterval(() => {
      this.activeSlide = (this.activeSlide + 1) % this.slides.length;
      this.cdr.detectChanges();
    }, 8000);
  }

  private stopSlideshow(): void {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
      this.slideInterval = null;
    }
  }

  setSlide(index: number): void {
    this.activeSlide = index;
    this.stopSlideshow();
    this.startSlideshow();
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  private loadHeroStats(): void {
    this.http.get<any>(`${environment.apiUrl}/public-stats`).subscribe({
      next: res => {
        const total = res?.totalLocations ?? res?.data?.totalLocations;
        const regions = res?.totalRegions ?? res?.data?.totalRegions;
        const avg = res?.avgRating ?? res?.data?.avgRating;

        this.heroStats = {
          locations: total != null
            ? (total >= 1000 ? (total / 1000).toFixed(1) + 'k+' : total + '+')
            : '—',
          regions: regions != null ? regions + '+' : '—',
          rating: avg != null ? parseFloat(avg).toFixed(1) : '—',
        };
        this.cdr.detectChanges();
      },
      error: () => {
        // Fallback if API not reachable
        this.heroStats = { locations: '—', regions: '—', rating: '—' };
        this.cdr.detectChanges();
      },
    });
  }

  // ── Language switcher ────────────────────────────────────────────────────

  toggleLangMenu(): void {
    this.langMenuOpen = !this.langMenuOpen;
  }

  selectLang(lang: SiteLanguageOption): void {
    this.translate.setLanguage(lang.code as SiteLanguageCode);
    this.langMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.lang-switcher')) {
      this.langMenuOpen = false;
    }
  }

  // ── Google sign-in ───────────────────────────────────────────────────────

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

  // ── Email / password ─────────────────────────────────────────────────────

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
          this.errorMessage = this.localizedEmailNotVerifiedMessage();
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
      next: () => {
        this.isResendingVerification = false;
        this.resendMessage = this.localizedResendMessage('success');
        this.cdr.detectChanges();
      },
      error: () => {
        this.isResendingVerification = false;
        this.resendError = this.localizedResendMessage('error');
        this.cdr.detectChanges();
      },
    });
  }

  private localizedResendMessage(kind: 'success' | 'error'): string {
    const lang = this.currentLanguageCode();
    const messages: Record<string, Record<'success' | 'error', string>> = {
      en: { success: 'A new verification email has been sent.', error: 'Could not resend the verification email.' },
      sr: { success: 'Novi verifikacioni mejl je poslat.', error: 'Verifikacioni mejl nije mogao biti poslat.' },
      de: { success: 'Eine neue Bestatigungs-E-Mail wurde gesendet.', error: 'Die Bestatigungs-E-Mail konnte nicht erneut gesendet werden.' },
      fr: { success: 'Un nouvel e-mail de verification a ete envoye.', error: "Impossible de renvoyer l'e-mail de verification." },
      it: { success: 'Una nuova email di verifica e stata inviata.', error: "Impossibile inviare di nuovo l'email di verifica." },
      es: { success: 'Se ha enviado un nuevo correo de verificacion.', error: 'No se pudo reenviar el correo de verificacion.' },
      nl: { success: 'Er is een nieuwe verificatie-e-mail verzonden.', error: 'De verificatie-e-mail kon niet opnieuw worden verzonden.' },
      ru: { success: 'Новое письмо для подтверждения отправлено.', error: 'Не удалось повторно отправить письмо для подтверждения.' },
    };
    return (messages[lang] ?? messages['en'])[kind];
  }

  private localizedEmailNotVerifiedMessage(): string {
    const lang = this.currentLanguageCode();
    const messages: Record<string, string> = {
      en: 'Your email address is not verified. Please check your inbox and click the verification link.',
      sr: 'Email adresa nije potvrdjena. Proverite inbox i kliknite na link za verifikaciju.',
      de: 'Ihre E-Mail-Adresse ist nicht bestatigt. Bitte prufen Sie Ihren Posteingang.',
      fr: "Votre adresse e-mail n'est pas verifiee. Consultez votre boite de reception.",
      it: "Il tuo indirizzo email non e verificato. Controlla la posta in arrivo.",
      es: 'Tu direccion de correo no esta verificada. Revisa tu bandeja de entrada.',
      nl: 'Je e-mailadres is niet geverifieerd. Controleer je inbox.',
      ru: 'Email-адрес не подтверждён. Проверьте входящие и кликните по ссылке.',
    };
    return messages[lang] ?? messages['en'];
  }

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

  private currentLanguageCode(): string {
    return this.translate.currentLanguage ?? 'en';
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  onGuestLogin(): void {
    this.router.navigate(['/map-home']);
  }

  goHome(): void {
    this.router.navigate(['/map-home']);
  }

  goToRegister(): void {
    this.router.navigate(['/choose-role']);
  }

  goToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }
}
