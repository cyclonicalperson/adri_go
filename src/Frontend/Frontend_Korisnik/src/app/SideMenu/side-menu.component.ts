import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SiteTranslateService } from '../services/site-translate.service';

@Component({
  selector: 'app-side-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './side-menu.component.html',
  styleUrls: ['./side-menu.component.css']
})
export class SideMenuComponent {
  @Output() onClose = new EventEmitter<void>();

  constructor(
    private router: Router,
    public authService: AuthService,
    public translate: SiteTranslateService
  ) {}

  logout() {
    this.authService.logout();
    this.onClose.emit();
    this.router.navigate(['/login']);
  }

  goToLogin() {
    this.onClose.emit();
    this.router.navigate(['/login']);
  }

  goToAccount() {
    this.onClose.emit();
    if (!this.authService.isLoggedIn) { this.router.navigate(['/login']); return; }
    this.router.navigate(['/account']);
  }
  goToSaved() {
    this.onClose.emit();
    if (!this.authService.isLoggedIn) { this.router.navigate(['/login']); return; }
    this.router.navigate(['/saved']);
  }
  goToCalendar() { this.router.navigate(['/calendar']); }
  goToNotifications() { this.router.navigate(['/notifications']); }
  goToSettings() { this.router.navigate(['/settings']); }

  toggleLanguage() {
    const next = this.translate.currentLanguage === 'en' ? 'sr' : 'en';
    this.translate.setLanguage(next);
  }
}