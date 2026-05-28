import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="verify-shell" style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--gray-50,#f8fafc);padding:24px;font-family:var(--font-sans,'Inter',sans-serif);">

      <div *ngIf="state === 'loading'" style="text-align:center;">
        <div style="width:48px;height:48px;border:4px solid #dcfce7;border-top-color:#22c55e;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 20px;"></div>
        <p class="verify-copy" style="color:#64748b;font-size:15px;font-weight:500;">Verifying your email...</p>
      </div>

      <div *ngIf="state === 'success'" style="text-align:center;max-width:400px;">
        <div class="verify-icon verify-icon-success" style="width:80px;height:80px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
          <svg viewBox="0 0 24 24" style="width:40px;height:40px;fill:#22c55e;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        </div>
        <h1 class="verify-title" style="font-size:24px;font-weight:800;color:#0f172a;margin:0 0 12px;">Email Verified!</h1>
        <p class="verify-copy" style="font-size:15px;color:#64748b;line-height:1.6;margin-bottom:28px;">{{ successCopy }}</p>
        <button (click)="goToDestination()"
          style="background:#22c55e;color:#fff;border:none;padding:14px 32px;border-radius:100px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(34,197,94,0.35);">
          {{ successButtonLabel }}
        </button>
      </div>

      <div *ngIf="state === 'already'" style="text-align:center;max-width:400px;">
        <div class="verify-icon verify-icon-info" style="width:80px;height:80px;background:#eff6ff;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
          <svg viewBox="0 0 24 24" style="width:40px;height:40px;fill:#3b82f6;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        </div>
        <h1 class="verify-title" style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 12px;">Already Verified</h1>
        <p class="verify-copy" style="font-size:15px;color:#64748b;line-height:1.6;margin-bottom:28px;">This email address has already been confirmed. You can log in now.</p>
        <button (click)="goToDestination()"
          style="background:#3b82f6;color:#fff;border:none;padding:14px 32px;border-radius:100px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;">
          {{ successButtonLabel }}
        </button>
      </div>

      <div *ngIf="state === 'error'" style="text-align:center;max-width:400px;">
        <div class="verify-icon verify-icon-error" style="width:80px;height:80px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
          <svg viewBox="0 0 24 24" style="width:40px;height:40px;fill:#ef4444;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        </div>
        <h1 class="verify-title" style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 12px;">
          {{ isExpired ? 'Link Expired' : 'Invalid Link' }}
        </h1>
        <p class="verify-copy" style="font-size:15px;color:#64748b;line-height:1.6;margin-bottom:28px;">
          {{ isExpired
            ? 'This verification link has expired. Please request a new one.'
            : 'This verification link is not valid. Please register again or contact support.' }}
        </p>
        <button (click)="goToDestination()"
          style="background:#0f172a;color:#fff;border:none;padding:14px 32px;border-radius:100px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;">
          {{ successButtonLabel }}
        </button>
      </div>

      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>
  `,
  styles: [`
    :host-context(html[data-theme='dark']) .verify-shell {
      color-scheme: dark;
      background: #111827 !important;
      color: #f8fafc;
    }
    :host-context(html[data-theme='dark']) .verify-title {
      color: #f8fafc !important;
    }
    :host-context(html[data-theme='dark']) .verify-copy {
      color: #94a3b8 !important;
    }
    :host-context(html[data-theme='dark']) .verify-icon-success {
      background: #123222 !important;
    }
    :host-context(html[data-theme='dark']) .verify-icon-info {
      background: #10233f !important;
    }
    :host-context(html[data-theme='dark']) .verify-icon-error {
      background: #2d1515 !important;
    }
  `]
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  state: 'loading' | 'success' | 'already' | 'error' = 'loading';
  isExpired = false;
  isEmailChange = false;
  private redirectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    const lang = this.route.snapshot.queryParamMap.get('lang');
    this.isEmailChange = this.route.snapshot.queryParamMap.get('purpose') === 'email-change';
    if (lang) {
      localStorage.setItem('adrigo_user_language', lang);
      localStorage.setItem('site_language', lang);
    }
    if (!token) {
      this.state = 'error';
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: res => {
        this.isEmailChange = !!res?.emailChange || this.isEmailChange;
        if (this.isEmailChange && res?.email) {
          this.authService.updateCurrentTourist({ email: res.email, isEmailVerified: true });
        }
        this.state = res?.alreadyVerified ? 'already' : 'success';
        this.cdr.detectChanges();
        this.redirectTimer = setTimeout(() => this.goToDestination(), 1800);
      },
      error: err => {
        this.isExpired = err?.error?.expired === true;
        this.state = 'error';
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
    }
  }

  get successCopy(): string {
    return this.isEmailChange
      ? 'Your new email address has been confirmed. You can return to your account settings.'
      : 'Your email address has been confirmed. You can now log in to your account.';
  }

  get successButtonLabel(): string {
    return this.isEmailChange ? 'Go to Account' : 'Go to Login';
  }

  goToDestination(): void {
    this.router.navigate([this.isEmailChange ? '/account' : '/login']);
  }
}
