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
    pushNotifications: false,
    emailNotifications: false,
  };

  appVersion: string = 'v1.0.0';
  savedMessage = '';
  notifPermission: NotificationPermission = 'default';

  constructor(
    public router: Router,
    private authService: AuthService,
    public translate: SiteTranslateService
  ) {
    const saved = localStorage.getItem('user_settings');
    if (saved) { try { this.settings = { ...this.settings, ...JSON.parse(saved) }; } catch {} }

    // Sync push notification state with actual browser permission
    if ('Notification' in window) {
      this.notifPermission = Notification.permission;
      // If permission was previously granted, reflect that in settings
      if (Notification.permission === 'granted') {
        this.settings.pushNotifications = true;
      } else if (Notification.permission === 'denied') {
        this.settings.pushNotifications = false;
      }
    }
  }

  get currentLanguageLabel(): string {
    return this.translate.currentLanguageOption.label;
  }

  /** The label of the language you will switch TO (not the current one). */
  get switchToLanguageLabel(): string {
    return this.translate.currentLanguage === 'en' ? 'Srpski' : 'English';
  }

  goBack() { window.history.back(); }

  saveChanges() {
    localStorage.setItem('user_settings', JSON.stringify(this.settings));
    this.savedMessage = '✓ Settings saved';
    setTimeout(() => (this.savedMessage = ''), 2500);
  }

  toggleLanguage() {
    const next = this.translate.currentLanguage === 'en' ? 'sr' : 'en';
    this.translate.setLanguage(next);
  }

  onPushNotificationsToggle(): void {
    if (!('Notification' in window)) {
      this.savedMessage = 'Push notifications are not supported in this browser.';
      setTimeout(() => (this.savedMessage = ''), 3000);
      this.settings.pushNotifications = false;
      return;
    }

    if (this.settings.pushNotifications) {
      // User just turned it ON → request permission
      if (Notification.permission === 'granted') {
        this.savedMessage = '🔔 Push notifications enabled';
        setTimeout(() => (this.savedMessage = ''), 2500);
      } else if (Notification.permission === 'denied') {
        this.savedMessage = 'Notifications are blocked. Please allow them in browser settings.';
        setTimeout(() => (this.savedMessage = ''), 4000);
        this.settings.pushNotifications = false;
      } else {
        Notification.requestPermission().then(perm => {
          this.notifPermission = perm;
          if (perm === 'granted') {
            this.settings.pushNotifications = true;
            this.savedMessage = '🔔 Push notifications enabled';
          } else {
            this.settings.pushNotifications = false;
            this.savedMessage = 'Notification permission was not granted.';
          }
          setTimeout(() => (this.savedMessage = ''), 3000);
          this.saveChanges();
        });
      }
    } else {
      // Turned OFF — we can't programmatically revoke permission, just save the preference
      this.savedMessage = 'Push notifications disabled.';
      setTimeout(() => (this.savedMessage = ''), 2500);
    }
    this.saveChanges();
  }

  onLocationSharingToggle(): void {
    if (this.settings.locationSharing) {
      // User just turned location ON → request permission now
      if (!navigator.geolocation) {
        this.savedMessage = 'Geolocation is not supported in this browser.';
        setTimeout(() => (this.savedMessage = ''), 3000);
        this.settings.locationSharing = false;
        return;
      }
      navigator.geolocation.getCurrentPosition(
        () => {
          this.savedMessage = '📍 Location sharing enabled';
          setTimeout(() => (this.savedMessage = ''), 2500);
          this.saveChanges();
        },
        () => {
          this.savedMessage = 'Location permission denied. Please allow it in browser settings.';
          setTimeout(() => (this.savedMessage = ''), 4000);
          this.settings.locationSharing = false;
          this.saveChanges();
        }
      );
    } else {
      this.savedMessage = 'Location sharing disabled. Nearby features will be limited.';
      setTimeout(() => (this.savedMessage = ''), 3000);
      this.saveChanges();
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToEditProfile()  { this.router.navigate(['/account/personal-info']); }
  goToHelp()         { this.router.navigate(['/account/help']); }
  goToPrivacy()      { this.router.navigate(['/account/privacy']); }
}