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
  submitted = false;
  newPasswordFocused = false;
  newPasswordInteracted = false;
  newPasswordTouched = false;
  confirmPasswordInteracted = false;
  confirmPasswordTouched = false;

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

  get showPasswordRules(): boolean {
    return (this.newPasswordInteracted || this.newPasswordFocused)
      && !!this.newPassword.trim()
      && !this.isNewPasswordFormatValid;
  }

  get newPasswordMinLengthMet(): boolean {
    return this.newPassword.length >= 8;
  }

  get newPasswordHasUppercase(): boolean {
    return /[A-Z]/.test(this.newPassword);
  }

  get newPasswordHasNumberOrSpecialCharacter(): boolean {
    return /[0-9]/.test(this.newPassword) || /[^A-Za-z0-9]/.test(this.newPassword);
  }

  get isNewPasswordFormatValid(): boolean {
    return this.newPasswordMinLengthMet
      && this.newPasswordHasUppercase
      && this.newPasswordHasNumberOrSpecialCharacter;
  }

  get showValidPasswordMessage(): boolean {
    return (this.newPasswordInteracted || this.newPasswordFocused) && this.isNewPasswordFormatValid;
  }

  get newPasswordInputInvalid(): boolean {
    return (this.newPasswordInteracted || this.newPasswordFocused) && !this.isNewPasswordFormatValid;
  }

  get newPasswordInputValid(): boolean {
    return (this.newPasswordInteracted || this.newPasswordFocused) && !!this.newPassword && this.isNewPasswordFormatValid;
  }

  get confirmPasswordEnabled(): boolean {
    return this.isNewPasswordFormatValid;
  }

  get showNewPasswordRequiredError(): boolean {
    return (this.submitted || this.newPasswordTouched) && !this.newPassword.trim();
  }

  get showConfirmPasswordRequiredError(): boolean {
    return this.confirmPasswordEnabled
      && (this.submitted || this.confirmPasswordTouched)
      && !this.confirmPassword.trim();
  }

  get showConfirmPasswordMismatchError(): boolean {
    return this.confirmPasswordEnabled
      && (this.confirmPasswordInteracted || this.submitted)
      && !!this.confirmPassword.trim()
      && this.newPassword !== this.confirmPassword;
  }

  get confirmPasswordInputInvalid(): boolean {
    return this.showConfirmPasswordMismatchError
      || (this.confirmPasswordEnabled && this.showConfirmPasswordRequiredError);
  }

  get confirmPasswordInputValid(): boolean {
    return this.confirmPasswordEnabled
      && !!this.confirmPassword.trim()
      && this.newPassword === this.confirmPassword;
  }

  onNewPasswordChange(value: string): void {
    this.newPassword = value;
    this.newPasswordInteracted = true;

    if (!this.isNewPasswordFormatValid && this.confirmPassword) {
      this.confirmPassword = '';
      this.confirmPasswordInteracted = false;
      this.confirmPasswordTouched = false;
    }
  }

  onConfirmPasswordChange(value: string): void {
    this.confirmPassword = value;
    this.confirmPasswordInteracted = true;
  }

  submit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (!this.newPassword.trim()) return;
    if (!this.isNewPasswordFormatValid) return;
    if (!this.confirmPassword.trim()) return;
    if (this.newPassword !== this.confirmPassword) return;

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
