import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SiteTranslateService, SiteLanguageCode } from '../services/site-translate.service';

@Component({
  selector: 'app-side-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './side-menu.component.html',
  styleUrls: ['./side-menu.component.css']
})
export class SideMenuComponent {
  @Output() onClose = new EventEmitter<void>();

  langMenuOpen = false;

  constructor(
    private router: Router,
    public authService: AuthService,
    public translate: SiteTranslateService
  ) {}

  get languages() {
    return this.translate.languages;
  }

  toggleLangMenu(): void {
    this.langMenuOpen = !this.langMenuOpen;
  }

  setLang(code: SiteLanguageCode): void {
    void this.translate.setLanguage(code);
    this.langMenuOpen = false;
  }

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
  goToRoutes() { this.onClose.emit(); this.router.navigate(['/routes']); }
  goToActivities() { this.onClose.emit(); this.router.navigate(['/activities']); }
  goToChat()       { this.onClose.emit(); this.router.navigate(['/chat']); }
  goToCalendar() { this.onClose.emit(); this.router.navigate(['/calendar']); }
  goToNotifications() { this.onClose.emit(); this.router.navigate(['/notifications']); }
  goToSettings() { this.onClose.emit(); this.router.navigate(['/settings']); }
}
