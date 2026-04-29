import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  email = '';
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  private readonly apiUrl = 'http://localhost:5125/api/tourist-auth';

  constructor(private router: Router, private http: HttpClient) {}

  submit(): void {
    if (!this.email.trim()) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }
    this.isLoading   = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.http.post(`${this.apiUrl}/forgot-password`, { email: this.email }).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'If an account with that email exists, a password reset link has been sent.';
      },
      error: (err) => {
        this.isLoading    = false;
        this.errorMessage = err?.error?.message || 'Something went wrong. Please try again.';
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
