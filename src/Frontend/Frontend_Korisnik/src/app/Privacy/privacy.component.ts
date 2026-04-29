import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  showDeleteModal = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  goBack() { window.history.back(); }

  deleteAccount() {
    if (!this.authService.isLoggedIn) {
      this.deleteError = 'Not logged in.';
      return;
    }
    // Open styled modal instead of window.confirm
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.cdr.detectChanges();
  }

  confirmDelete() {
    if (!this.authService.isLoggedIn) return;

    this.showDeleteModal = false;
    this.isDeleting  = true;
    this.deleteError = '';
    this.cdr.detectChanges();

    this.authService.deleteAccount().subscribe({
      next: () => this.finishDelete(),
      error: (err) => {
        this.isDeleting  = false;
        this.deleteError = err?.error?.message || 'Could not delete account. Please try again or contact support.';
        this.cdr.detectChanges();
      }
    });
  }

  private finishDelete(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
