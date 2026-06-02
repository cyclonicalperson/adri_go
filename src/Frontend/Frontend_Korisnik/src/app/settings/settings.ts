import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { SiteTranslateService, SiteLanguageCode } from '../services/site-translate.service';
import { TouristAppPreferences, TouristPreferencesService } from '../services/tourist-preferences.service';
import { UserService } from '../services/user.service';
import { TouristAnalyticsService } from '../services/tourist-analytics.service';
import {
  TouristNotificationPreference,
  TouristNotificationPreferenceUpdate,
  TouristNotificationService
} from '../services/tourist-notification.service';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';

type SettingsSheet = 'accounts' | 'content' | 'support' | 'language' | 'notifications' | null;

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderComponent],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css']
})
export class SettingsComponent implements OnInit {
  settings!: TouristAppPreferences;

  activeSheet: SettingsSheet = null;
  appVersion = 'v1.2.0';
  savedMessage = '';
  private savedMessageTimer: ReturnType<typeof setTimeout> | null = null;
  notifPermission: NotificationPermission = 'default';
  notificationPreferences: TouristNotificationPreference[] = [];
  notificationPreferencesLoading = false;
  notificationPreferencesError = '';

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
  ];

  showPasswordModal = false;
  changePasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
  passwordError = '';
  passwordSuccess = '';
  isSavingPassword = false;
  changePasswordSubmitted = false;
  newPasswordInteracted = false;
  currentPasswordTouched = false;
  newPasswordTouched = false;
  confirmPasswordTouched = false;

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
    private notifications: TouristNotificationService,
  ) {
    this.settings = this.preferences.useAccountScope(this.authService.touristId);

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
      // Guest can access settings but only see guest-relevant options
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

    this.loadNotificationPreferences();
  }

  get currentLanguageLabel(): string {
    return this.translate.currentLanguageOption.label;
  }

  get languages() {
    return this.translate.languages;
  }

  get connectedAccountsSummary(): string {
    if (this.authService.currentTourist?.authProvider === 'google') {
      return 'Connected';
    }

    const linked = this.accountOptions
      .filter(option => this.settings.connectedAccounts[option.id])
      .map(option => option.label);
    return linked.length > 0 ? linked.join(', ') : 'Not configured';
  }

  get isGoogleAccount(): boolean {
    return this.authService.currentTourist?.authProvider === 'google'
      || this.authService.isGoogleAccount;
  }

  get contentPreferencesSummary(): string {
    const enabled = this.contentOptions
      .filter(option => this.settings.contentPreferences.includes(option.id))
      .map(option => option.label);
    return enabled.length > 0 ? enabled.join(', ') : 'Use general discovery mode';
  }

  get passwordRulesVisible(): boolean {
    return this.newPasswordInteracted
      && this.changePasswordForm.newPassword.trim().length > 0
      && !this.isNewPasswordValid;
  }

  get passwordHasMinLength(): boolean {
    return this.changePasswordForm.newPassword.length >= 8;
  }

  get passwordHasUppercase(): boolean {
    return /[A-Z]/.test(this.changePasswordForm.newPassword);
  }

  get passwordHasNumberOrSpecial(): boolean {
    return /[\d\W_]/.test(this.changePasswordForm.newPassword);
  }

  get isNewPasswordValid(): boolean {
    return this.passwordHasMinLength && this.passwordHasUppercase && this.passwordHasNumberOrSpecial;
  }

  get showPasswordValidMessage(): boolean {
    return this.newPasswordInteracted
      && this.changePasswordForm.newPassword.length > 0
      && this.isNewPasswordValid;
  }

  get passwordInputInvalid(): boolean {
    return this.newPasswordInteracted && !this.isNewPasswordValid;
  }

  get passwordInputValid(): boolean {
    return this.newPasswordInteracted
      && this.changePasswordForm.newPassword.length > 0
      && this.isNewPasswordValid;
  }

  get hasCurrentPasswordError(): boolean {
    return (this.changePasswordSubmitted || this.currentPasswordTouched) && !this.changePasswordForm.currentPassword;
  }

  get hasNewPasswordRequiredError(): boolean {
    return (this.changePasswordSubmitted || this.newPasswordTouched) && !this.changePasswordForm.newPassword;
  }

  get hasConfirmPasswordRequiredError(): boolean {
    return this.confirmPasswordEnabled
      && (this.changePasswordSubmitted || this.confirmPasswordTouched)
      && !this.changePasswordForm.confirmPassword;
  }

  get hasConfirmPasswordMismatch(): boolean {
    return this.confirmPasswordEnabled
      && this.changePasswordForm.confirmPassword.length > 0
      && this.changePasswordForm.newPassword !== this.changePasswordForm.confirmPassword;
  }

  get confirmPasswordEnabled(): boolean {
    return this.isNewPasswordValid;
  }

  get confirmPasswordInvalid(): boolean {
    return this.hasConfirmPasswordMismatch || this.hasConfirmPasswordRequiredError;
  }

  get confirmPasswordValid(): boolean {
    return this.confirmPasswordEnabled
      && this.changePasswordForm.confirmPassword.length > 0
      && !this.hasConfirmPasswordMismatch;
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
        ? 'Trip digest preference saved for future emails'
        : 'Trip digest emails disabled'
    );
    this.saveNotificationPreferences([
      { notificationType: 'trip_digest', emailEnabled: this.settings.emailNotifications },
    ]);
  }

  get notificationPreferencesSummary(): string {
    if (this.notificationPreferences.length === 0) {
      return 'Default delivery';
    }

    const activePush = this.notificationPreferences
      .filter(pref => pref.pushEnabled && pref.notificationType !== 'trip_digest')
      .length;
    const digest = this.notificationPreferences.find(pref => pref.notificationType === 'trip_digest')?.emailEnabled;
    return digest ? `${activePush} push types, digest email` : `${activePush} push types`;
  }

  get activeSheetKicker(): string {
    switch (this.activeSheet) {
      case 'accounts': return 'Accounts';
      case 'content': return 'Content';
      case 'language': return 'Language';
      case 'notifications': return 'Notifications';
      default: return 'Support';
    }
  }

  get activeSheetTitle(): string {
    switch (this.activeSheet) {
      case 'accounts': return 'Connected Accounts';
      case 'content': return 'Content Preferences';
      case 'language': return 'App Language';
      case 'notifications': return 'Notification Preferences';
      default: return 'Help & Support Center';
    }
  }

  onPushNotificationsToggle(): void {
    if (!('Notification' in window)) {
      this.settings.pushNotifications = false;
      this.saveChanges('Push notifications are not supported in this browser.');
      return;
    }

    if (this.settings.pushNotifications) {
      if (Notification.permission === 'granted') {
        this.saveChanges('Push notifications enabled');
        this.syncPushPreferenceToServer();
        return;
      }

      if (Notification.permission === 'denied') {
        this.settings.pushNotifications = false;
        this.saveChanges('Notifications are blocked. Please allow them in browser settings.');
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
        if (permission === 'granted') {
          this.syncPushPreferenceToServer();
        }
      }).catch(() => {
        this.settings.pushNotifications = false;
        this.saveChanges('Notification permission was not granted');
      });
      return;
    }

    this.saveChanges('Push notifications disabled');
    this.syncPushPreferenceToServer();
  }

  onLocationSharingToggle(): void {
    if (this.settings.locationSharing) {
      if (!navigator.geolocation) {
        this.settings.locationSharing = false;
        this.saveChanges('Geolocation is not supported in this browser.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => this.saveChanges('Location sharing enabled'),
        () => {
          this.settings.locationSharing = false;
          this.saveChanges('Location permission denied. Please allow it in browser settings.');
        }
      );
      return;
    }

    this.saveChanges('Location sharing disabled. Nearby route features will be limited.');
  }

  openSheet(sheet: Exclude<SettingsSheet, null>): void {
    this.activeSheet = sheet;
    if (sheet === 'notifications' && this.notificationPreferences.length === 0) {
      this.loadNotificationPreferences();
    }
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
    this.saveChanges('Connected account preferences updated');
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

    if (this.authService.isGoogleAccount) {
      window.location.href = 'https://myaccount.google.com/';
      return;
    }

    this.showPasswordModal = true;
    this.changePasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
    this.passwordError = '';
    this.passwordSuccess = '';
    this.changePasswordSubmitted = false;
    this.newPasswordInteracted = false;
    this.currentPasswordTouched = false;
    this.newPasswordTouched = false;
    this.confirmPasswordTouched = false;
  }

  openGoogleAccount(): void {
    window.open('https://myaccount.google.com/', '_blank', 'noopener,noreferrer');
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
  }

  onNewPasswordInteract(): void {
    this.newPasswordInteracted = true;
  }

  onCurrentPasswordBlur(): void {
    this.currentPasswordTouched = true;
  }

  onNewPasswordBlur(): void {
    this.newPasswordTouched = true;
  }

  onConfirmPasswordBlur(): void {
    this.confirmPasswordTouched = true;
  }

  onNewPasswordChange(value: string): void {
    this.changePasswordForm.newPassword = value;
    this.newPasswordInteracted = true;

    if (!this.isNewPasswordValid && this.changePasswordForm.confirmPassword) {
      this.changePasswordForm.confirmPassword = '';
      this.confirmPasswordTouched = false;
    }
  }

  submitChangePassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';
    this.changePasswordSubmitted = true;

    if (
      !this.changePasswordForm.newPassword
      || !this.changePasswordForm.currentPassword
      || !this.changePasswordForm.confirmPassword
      || !this.isNewPasswordValid
      || this.hasConfirmPasswordMismatch
    ) {
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

  notificationPreferenceStatus(pref: TouristNotificationPreference): string {
    const channels = [
      pref.inAppEnabled ? 'In-app' : '',
      pref.pushEnabled ? 'Push' : '',
      pref.emailEnabled ? 'Email' : '',
    ].filter(Boolean);

    return channels.length > 0 ? channels.join(' + ') : 'Muted';
  }

  toggleNotificationPreference(
    pref: TouristNotificationPreference,
    channel: 'inAppEnabled' | 'pushEnabled' | 'emailEnabled',
  ): void {
    if (channel === 'inAppEnabled' && !pref.canMute) {
      return;
    }

    if (channel === 'emailEnabled' && !pref.emailAvailable) {
      return;
    }

    const nextValue = !pref[channel];
    const update: TouristNotificationPreferenceUpdate = {
      notificationType: pref.notificationType,
    };
    update[channel] = nextValue;

    this.notificationPreferences = this.notificationPreferences.map(item =>
      item.notificationType === pref.notificationType
        ? { ...item, [channel]: nextValue }
        : item,
    );

    if (pref.notificationType === 'trip_digest' && channel === 'emailEnabled') {
      this.settings = { ...this.settings, emailNotifications: nextValue };
      this.preferences.update(this.settings);
    }

    this.saveNotificationPreferences([update]);
  }

  private loadNotificationPreferences(): void {
    if (!this.authService.isLoggedIn) {
      this.notificationPreferences = this.getDefaultNotificationPreferences();
      this.notificationPreferencesError = 'Log in to sync notification preferences.';
      return;
    }

    this.notificationPreferencesLoading = true;
    this.notificationPreferencesError = '';
    this.notifications.getPreferences().subscribe({
      next: preferences => {
        this.notificationPreferences = preferences.length > 0
          ? preferences
          : this.getDefaultNotificationPreferences();
        const digest = preferences.find(pref => pref.notificationType === 'trip_digest');
        if (digest) {
          this.settings = {
            ...this.settings,
            emailNotifications: digest.emailEnabled,
          };
          this.preferences.update(this.settings);
        }
        this.notificationPreferencesLoading = false;
      },
      error: () => {
        this.notificationPreferences = this.getDefaultNotificationPreferences();
        this.notificationPreferencesError = 'Could not sync preferences right now. Local defaults are shown.';
        this.notificationPreferencesLoading = false;
      }
    });
  }

  private syncPushPreferenceToServer(): void {
    if (!this.authService.isLoggedIn || this.notificationPreferences.length === 0) {
      return;
    }

    const updates = this.notificationPreferences
      .filter(pref => pref.notificationType !== 'trip_digest')
      .map(pref => ({
        notificationType: pref.notificationType,
        pushEnabled: this.settings.pushNotifications,
      }));

    this.saveNotificationPreferences(updates);
  }

  private saveNotificationPreferences(updates: TouristNotificationPreferenceUpdate[]): void {
    if (!this.authService.isLoggedIn || updates.length === 0) {
      return;
    }

    this.notifications.updatePreferences(updates).subscribe({
      next: preferences => {
        this.notificationPreferences = preferences;
      },
      error: () => {}
    });
  }

  private toggleArrayValue(values: string[], id: string): string[] {
    return values.includes(id)
      ? values.filter(value => value !== id)
      : [...values, id];
  }

  private showSavedMessage(message: string): void {
    if (this.savedMessageTimer) {
      clearTimeout(this.savedMessageTimer);
    }

    this.savedMessage = message;
    this.savedMessageTimer = setTimeout(() => {
      this.savedMessage = '';
      this.savedMessageTimer = null;
    }, 2600);
  }

  private getDefaultNotificationPreferences(): TouristNotificationPreference[] {
    const pushEnabled = this.settings.pushNotifications;
    const emailEnabled = this.settings.emailNotifications;
    return [
      { notificationType: 'calendar', label: 'Calendar', inAppEnabled: true, pushEnabled, emailEnabled: false, emailAvailable: false, canMute: true },
      { notificationType: 'review_status', label: 'Review status', inAppEnabled: true, pushEnabled, emailEnabled: false, emailAvailable: false, canMute: true },
      { notificationType: 'personalized_recommendation', label: 'Personalized recommendations', inAppEnabled: true, pushEnabled, emailEnabled: false, emailAvailable: false, canMute: true },
      { notificationType: 'important_alert', label: 'Important alerts', inAppEnabled: true, pushEnabled, emailEnabled: false, emailAvailable: false, canMute: false },
      { notificationType: 'trip_digest', label: 'Trip digest', inAppEnabled: false, pushEnabled: false, emailEnabled, emailAvailable: true, canMute: true },
    ];
  }
}
