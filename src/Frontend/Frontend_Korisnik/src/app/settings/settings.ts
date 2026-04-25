import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { SiteTranslateService } from '../services/site-translate.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css']
})
export class SettingsComponent {

  settings = {
    locationSharing: true,
    anonymousAnalytics: false,
    personalizedRecs: true,
    pushNotifications: true,
    emailNotifications: false,
  };

  appVersion: string = 'v1.0.0';
  savedMessage = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    public translate: SiteTranslateService
  ) {
    const saved = localStorage.getItem('user_settings');
    if (saved) { try { this.settings = { ...this.settings, ...JSON.parse(saved) }; } catch {} }
  }

  get currentLanguageLabel(): string {
    return this.translate.currentLanguageOption.label;
  }

  goBack() { window.history.back(); }

  saveChanges() {
    localStorage.setItem('user_settings', JSON.stringify(this.settings));
    this.savedMessage = 'Settings saved!';
    setTimeout(() => (this.savedMessage = ''), 2500);
  }

  toggleLanguage() {
    const next = this.translate.currentLanguage === 'en' ? 'sr' : 'en';
    this.translate.setLanguage(next);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToEditProfile()  { this.router.navigate(['/account/personal-info']); }
  goToHelp()         { this.router.navigate(['/account/help']); }
  goToPrivacy()      { this.router.navigate(['/account/privacy']); }
}