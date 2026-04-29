import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  tokenInvalid = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.tokenInvalid = true;
      this.errorMessage = 'Invalid or missing reset token. Please request a new password reset.';
    }
  }

  submit(): void {
    this.errorMessage = '';
    if (this.newPassword.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters.'; return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.'; return;
    }

    this.isLoading = true;
    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Your password has been reset successfully! You can now log in.';
      },
      error: (err) => {
        this.isLoading = false;
        const expired = err?.error?.expired;
        if (expired) {
          this.errorMessage = 'This reset link has expired. Please request a new one.';
          this.tokenInvalid = true;
        } else {
          this.errorMessage = err?.error?.message || 'Something went wrong. Please try again.';
        }
      }
    });
  }

  goToLogin(): void { this.router.navigate(['/login']); }
  goToForgotPassword(): void { this.router.navigate(['/forgot-password']); }
}
