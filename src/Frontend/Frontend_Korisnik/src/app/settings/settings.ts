import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { SiteTranslateService, SiteLanguageCode } from '../services/site-translate.service';
import { TouristAppPreferences, TouristPreferencesService } from '../services/tourist-preferences.service';
import { UserService } from '../services/user.service';
import { TouristAnalyticsService } from '../services/tourist-analytics.service';

type SettingsSheet = 'accounts' | 'content' | 'booking' | 'payment' | 'support' | 'language' | null;

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css']
})
export class SettingsComponent implements OnInit {
  settings!: TouristAppPreferences;

  activeSheet: SettingsSheet = null;
  appVersion = 'v1.2.0';
  savedMessage = '';
  notifPermission: NotificationPermission = 'default';

  contentOptions = [
    { id: 'nature', label: 'Nature', icon: '🌲' },
    { id: 'food', label: 'Food', icon: '🍽️' },
    { id: 'beaches', label: 'Beaches', icon: '🏖️' },
    { id: 'history', label: 'History & Culture', icon: '🏛️' },
    { id: 'nightlife', label: 'Nightlife', icon: '🎶' },
    { id: 'photography', label: 'Photography', icon: '📷' },
  ];

  accountOptions = [
    { id: 'google' as const, label: 'Google', desc: 'Use Google as your preferred sign-in method.' },
    { id: 'apple' as const, label: 'Apple', desc: 'Keep Apple ready as a private sign-in option.' },
  ];

  bookingOptions = [
    { id: 'booking', label: 'Booking.com' },
    { id: 'airbnb', label: 'Airbnb' },
    { id: 'tripadvisor', label: 'Tripadvisor' },
    { id: 'getyourguide', label: 'GetYourGuide' },
  ];

  paymentOptions = [
    { id: 'card', label: 'Card' },
    { id: 'paypal', label: 'PayPal' },
    { id: 'cash', label: 'Pay on arrival' },
  ];

  showPasswordModal = false;
  changePasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
  passwordError = '';
  passwordSuccess = '';
  isSavingPassword = false;

  showDeleteModal = false;
  deleteError = '';
  isDeletingAccount = false;

  constructor(
    public router: Router,
    public authService: AuthService,
    public translate: SiteTranslateService,
    private preferences: TouristPreferencesService,
    private userService: UserService,
    private analytics: TouristAnalyticsService,
  ) {
    this.settings = this.preferences.snapshot;

    if ('Notification' in window) {
      this.notifPermission = Notification.permission;
      if (Notification.permission === 'granted') {
        this.settings.pushNotifications = true;
      } else if (Notification.permission === 'denied') {
        this.settings.pushNotifications = false;
      }
    }
  }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn) {
      return;
    }

    this.userService.getUserProfile().subscribe({
      next: profile => {
        if (this.settings.contentPreferences.length === 0 && profile.interests.length > 0) {
          this.settings = {
            ...this.settings,
            contentPreferences: [...profile.interests],
          };
        }
      },
      error: () => {}
    });
  }

  get currentLanguageLabel(): string {
    return this.translate.currentLanguageOption.label;
  }

  get languages() {
    return this.translate.languages;
  }

  get connectedAccountsSummary(): string {
    const linked = this.accountOptions
      .filter(option => this.settings.connectedAccounts[option.id])
      .map(option => option.label);
    return linked.length > 0 ? linked.join(', ') : 'Not configured';
  }

  get bookingServicesSummary(): string {
    const enabled = this.bookingOptions
      .filter(option => this.settings.bookingServices.includes(option.id))
      .map(option => option.label);
    return enabled.length > 0 ? enabled.join(', ') : 'No preferred services';
  }

  get paymentMethodsSummary(): string {
    const enabled = this.paymentOptions
      .filter(option => this.settings.paymentMethods.includes(option.id))
      .map(option => option.label);
    return enabled.length > 0 ? enabled.join(', ') : 'No saved preferences';
  }

  get contentPreferencesSummary(): string {
    const enabled = this.contentOptions
      .filter(option => this.settings.contentPreferences.includes(option.id))
      .map(option => option.label);
    return enabled.length > 0 ? enabled.join(', ') : 'Use general discovery mode';
  }

  goBack(): void {
    window.history.back();
  }

  saveChanges(message = '✓ Settings saved'): void {
    this.settings = this.preferences.update(this.settings);
    this.showSavedMessage(message);
  }

  toggleLanguage(): void {
    this.openSheet('language');
  }

  async setLanguage(code: SiteLanguageCode): Promise<void> {
    await this.translate.setLanguage(code);
    this.authService.updateCurrentTourist({ language: code });

    if (this.authService.isLoggedIn) {
      this.userService.updateProfile({ language: code }).subscribe({
        next: () => {},
        error: () => {}
      });
    }

    this.closeSheet();
    this.showSavedMessage(`Language: ${this.translate.currentLanguageOption.label}`);
  }

  onAnalyticsToggle(): void {
    this.saveChanges('Analytics preference updated');
  }

  onPersonalizedRecommendationsToggle(): void {
    this.saveChanges(
      this.settings.personalizedRecs
        ? 'Personalized recommendations enabled'
        : 'Showing global recommendations only'
    );
  }

  onEmailNotificationsToggle(): void {
    this.saveChanges(
      this.settings.emailNotifications
        ? 'Trip email summaries enabled'
        : 'Trip email summaries disabled'
    );
  }

  onPushNotificationsToggle(): void {
    if (!('Notification' in window)) {
      this.settings.pushNotifications = false;
      this.showSavedMessage('Push notifications are not supported in this browser.');
      return;
    }

    if (this.settings.pushNotifications) {
      if (Notification.permission === 'granted') {
        this.saveChanges('Push notifications enabled');
        return;
      }

      if (Notification.permission === 'denied') {
        this.settings.pushNotifications = false;
        this.showSavedMessage('Notifications are blocked. Please allow them in browser settings.');
        return;
      }

      Notification.requestPermission().then(permission => {
        this.notifPermission = permission;
        this.settings.pushNotifications = permission === 'granted';
        this.saveChanges(
          permission === 'granted'
            ? 'Push notifications enabled'
            : 'Notification permission was not granted'
        );
      });
      return;
    }

    this.saveChanges('Push notifications disabled');
  }

  onLocationSharingToggle(): void {
    if (this.settings.locationSharing) {
      if (!navigator.geolocation) {
        this.settings.locationSharing = false;
        this.showSavedMessage('Geolocation is not supported in this browser.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => this.saveChanges('Location sharing enabled'),
        () => {
          this.settings.locationSharing = false;
          this.showSavedMessage('Location permission denied. Please allow it in browser settings.');
        }
      );
      return;
    }

    this.saveChanges('Location sharing disabled. Nearby route features will be limited.');
  }

  openSheet(sheet: Exclude<SettingsSheet, null>): void {
    this.activeSheet = sheet;
  }

  closeSheet(): void {
    this.activeSheet = null;
  }

  isContentPreferenceSelected(id: string): boolean {
    return this.settings.contentPreferences.includes(id);
  }

  toggleContentPreference(id: string): void {
    this.settings = {
      ...this.settings,
      contentPreferences: this.toggleArrayValue(this.settings.contentPreferences, id),
    };
  }

  toggleConnectedAccount(provider: 'google' | 'apple'): void {
    this.settings = {
      ...this.settings,
      connectedAccounts: {
        ...this.settings.connectedAccounts,
        [provider]: !this.settings.connectedAccounts[provider],
      }
    };
  }

  isBookingServiceEnabled(id: string): boolean {
    return this.settings.bookingServices.includes(id);
  }

  toggleBookingService(id: string): void {
    this.settings = {
      ...this.settings,
      bookingServices: this.toggleArrayValue(this.settings.bookingServices, id),
    };
  }

  isPaymentMethodEnabled(id: string): boolean {
    return this.settings.paymentMethods.includes(id);
  }

  togglePaymentMethod(id: string): void {
    this.settings = {
      ...this.settings,
      paymentMethods: this.toggleArrayValue(this.settings.paymentMethods, id),
    };
  }

  saveSheet(): void {
    if (this.activeSheet === 'content' && this.authService.isLoggedIn) {
      this.userService.updateProfile({
        interests: [...this.settings.contentPreferences],
      }).subscribe({
        next: () => {
          this.saveChanges('Content preferences updated');
          this.closeSheet();
        },
        error: () => {
          this.saveChanges('Content preferences saved locally');
          this.closeSheet();
        }
      });
      return;
    }

    if (this.activeSheet === 'support' || this.activeSheet === 'language') {
      this.closeSheet();
      return;
    }

    const label = this.activeSheet === 'accounts'
      ? 'Connected account preferences updated'
      : this.activeSheet === 'booking'
        ? 'Booking service preferences updated'
        : this.activeSheet === 'payment'
          ? 'Payment preferences updated'
          : 'Settings saved';

    this.saveChanges(label);
    this.closeSheet();
  }

  resetPersonalization(): void {
    this.analytics.clearHistory();
    this.settings = {
      ...this.settings,
      contentPreferences: [],
      personalizedRecs: false,
    };
    this.saveChanges('Personalization history reset');
    this.closeSheet();
  }

  openSupportEmail(): void {
    window.location.href = 'mailto:support@adrigo.app?subject=AdriGo%20Support';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToEditProfile(): void {
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate(['/account/personal-info']);
  }

  openChangePassword(): void {
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    this.showPasswordModal = true;
    this.changePasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
    this.passwordError = '';
    this.passwordSuccess = '';
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
  }

  submitChangePassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';

    if (!this.changePasswordForm.currentPassword) {
      this.passwordError = 'Please enter your current password.';
      return;
    }
    if (this.changePasswordForm.newPassword.length < 6) {
      this.passwordError = 'New password must be at least 6 characters.';
      return;
    }
    if (this.changePasswordForm.newPassword !== this.changePasswordForm.confirmPassword) {
      this.passwordError = 'New passwords do not match.';
      return;
    }

    this.isSavingPassword = true;
    this.authService.changePassword(
      this.changePasswordForm.currentPassword,
      this.changePasswordForm.newPassword,
    ).subscribe({
      next: () => {
        this.passwordSuccess = '✓ Password changed successfully!';
        this.isSavingPassword = false;
        setTimeout(() => { this.showPasswordModal = false; }, 2000);
      },
      error: (err) => {
        this.passwordError = err?.error?.message || 'Failed to change password.';
        this.isSavingPassword = false;
      }
    });
  }

  goToHelp(): void {
    this.router.navigate(['/account/help']);
  }

  openDeleteAccount(): void {
    this.showDeleteModal = true;
    this.deleteError = '';
  }

  closeDeleteAccount(): void {
    this.showDeleteModal = false;
  }

  confirmDeleteAccount(): void {
    this.isDeletingAccount = true;
    this.deleteError = '';
    this.authService.deleteAccount().subscribe({
      next: () => {
        this.authService.logout();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.deleteError = err?.error?.message || 'Failed to delete account. Please try again.';
        this.isDeletingAccount = false;
      }
    });
  }

  private toggleArrayValue(values: string[], id: string): string[] {
    return values.includes(id)
      ? values.filter(value => value !== id)
      : [...values, id];
  }

  private showSavedMessage(message: string): void {
    this.savedMessage = message;
    setTimeout(() => (this.savedMessage = ''), 2600);
  }
}
