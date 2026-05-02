import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--gray-50,#f8fafc);padding:24px;font-family:var(--font-sans,'Inter',sans-serif);">

      <div *ngIf="state === 'loading'" style="text-align:center;">
        <div style="width:48px;height:48px;border:4px solid #dcfce7;border-top-color:#22c55e;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 20px;"></div>
        <p style="color:#64748b;font-size:15px;font-weight:500;">Verifying your email...</p>
      </div>

      <div *ngIf="state === 'success'" style="text-align:center;max-width:400px;">
        <div style="width:80px;height:80px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
          <svg viewBox="0 0 24 24" style="width:40px;height:40px;fill:#22c55e;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        </div>
        <h1 style="font-size:24px;font-weight:800;color:#0f172a;margin:0 0 12px;">Email Verified!</h1>
        <p style="font-size:15px;color:#64748b;line-height:1.6;margin-bottom:28px;">Your email address has been confirmed. You can now log in to your account.</p>
        <button (click)="goToLogin()"
          style="background:#22c55e;color:#fff;border:none;padding:14px 32px;border-radius:100px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(34,197,94,0.35);">
          Go to Login
        </button>
      </div>

      <div *ngIf="state === 'already'" style="text-align:center;max-width:400px;">
        <div style="width:80px;height:80px;background:#eff6ff;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
          <svg viewBox="0 0 24 24" style="width:40px;height:40px;fill:#3b82f6;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        </div>
        <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 12px;">Already Verified</h1>
        <p style="font-size:15px;color:#64748b;line-height:1.6;margin-bottom:28px;">This email address has already been confirmed. You can log in now.</p>
        <button (click)="goToLogin()"
          style="background:#3b82f6;color:#fff;border:none;padding:14px 32px;border-radius:100px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;">
          Go to Login
        </button>
      </div>

      <div *ngIf="state === 'error'" style="text-align:center;max-width:400px;">
        <div style="width:80px;height:80px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
          <svg viewBox="0 0 24 24" style="width:40px;height:40px;fill:#ef4444;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        </div>
        <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 12px;">
          {{ isExpired ? 'Link Expired' : 'Invalid Link' }}
        </h1>
        <p style="font-size:15px;color:#64748b;line-height:1.6;margin-bottom:28px;">
          {{ isExpired
            ? 'This verification link has expired. Please request a new one.'
            : 'This verification link is not valid. Please register again or contact support.' }}
        </p>
        <button (click)="goToLogin()"
          style="background:#0f172a;color:#fff;border:none;padding:14px 32px;border-radius:100px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;">
          Back to Login
        </button>
      </div>

      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>
  `
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  state: 'loading' | 'success' | 'already' | 'error' = 'loading';
  isExpired = false;
  private redirectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state = 'error';
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: res => {
        this.state = res?.alreadyVerified ? 'already' : 'success';
        this.cdr.detectChanges();
        this.redirectTimer = setTimeout(() => this.goToLogin(), 1800);
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

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
