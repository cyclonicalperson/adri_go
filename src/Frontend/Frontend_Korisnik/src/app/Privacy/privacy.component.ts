import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.css']
})
export class PrivacyComponent {

  activeTab: 'privacy' | 'terms' = 'privacy';
  isDeleting = false;
  deleteError = '';

  private readonly apiUrl = 'http://localhost:5125/api';

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  goBack() { window.history.back(); }

  deleteAccount() {
    const touristId = this.authService.touristId;
    if (!touristId) {
      this.deleteError = 'Not logged in.';
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to permanently delete your account? This action cannot be undone.'
    );
    if (!confirmed) return;

    this.isDeleting  = true;
    this.deleteError = '';
    this.cdr.detectChanges();

    // Try the JWT-auth delete endpoint first, fall back to the simple tourists endpoint
    this.http.delete(`${this.apiUrl}/tourist-auth/account`).subscribe({
      next: () => this.finishDelete(),
      error: () => {
        // Fallback to tourists/{id}
        this.http.delete(`${this.apiUrl}/tourists/${touristId}`).subscribe({
          next:  () => this.finishDelete(),
          error: (err) => {
            this.isDeleting  = false;
            this.deleteError = err?.error?.message || 'Could not delete account. Please try again or contact support.';
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  private finishDelete(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
