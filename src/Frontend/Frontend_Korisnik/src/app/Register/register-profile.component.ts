import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SiteTranslateService, SiteLanguageCode } from '../services/site-translate.service';
import { TouristPreferencesService } from '../services/tourist-preferences.service';

@Component({
  selector: 'app-register-profile',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './register-profile.component.html',
  styleUrls: ['./register-profile.component.css']
})
export class RegisterProfileComponent implements OnInit {
  profileForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  registrationSuccess = false;
  registrationEmail = '';
  autoLoggedIn = false;
  profileImageUrl: string | null = null;
  isUploadingPhoto = false;
  passwordFocused = false;

  interests = [
    { id: 'nature', label: 'Nature', icon: 'forest' },
    { id: 'food', label: 'Food', icon: 'food' },
    { id: 'beaches', label: 'Beaches', icon: 'beach' },
    { id: 'history', label: 'History and Culture', icon: 'history' },
    { id: 'nightlife', label: 'Night Life', icon: 'nightlife' },
    { id: 'photography', label: 'Photography', icon: 'camera' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private translateService: SiteTranslateService,
    private preferences: TouristPreferencesService
  ) {}

  ngOnInit(): void {
    const currentLocationSharing = this.preferences.snapshot.locationSharing;
    this.profileForm = this.fb.group({
      fullName: ['', Validators.required],
      emailOrPhone: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, this.pwValidator()]],
      confirmPassword: ['', Validators.required],
      language: ['en'],
      selectedInterests: this.fb.array([], [this.minimumSelectionValidator(2)]),
      locationPermit: [currentLocationSharing],
      termsAccepted: [false, Validators.requiredTrue]
    }, {
      validators: this.matchValidator()
    });
    this.pw?.valueChanges.subscribe(() => this.syncConfirmPasswordState());
    this.syncConfirmPasswordState();
  }

  get pw(): AbstractControl | null {
    return this.profileForm.get('password');
  }

  get cpw(): AbstractControl | null {
    return this.profileForm.get('confirmPassword');
  }

  get hasPasswordInteracted(): boolean {
    const control = this.pw;
    return this.passwordFocused || (!!control && (control.touched || control.dirty));
  }

  get showPasswordRules(): boolean {
    const control = this.pw;
    return !!control && this.hasPasswordInteracted && !!String(control.value ?? '') && control.invalid;
  }

  get passwordMinLengthMet(): boolean {
    return String(this.pw?.value ?? '').length >= 8;
  }

  get passwordHasUppercase(): boolean {
    return /[A-Z]/.test(String(this.pw?.value ?? ''));
  }

  get passwordHasNumberOrSpecial(): boolean {
    const value = String(this.pw?.value ?? '');
    return /[0-9]/.test(value) || /[^A-Za-z0-9]/.test(value);
  }

  get passwordValidMessageVisible(): boolean {
    const control = this.pw;
    return !!control && this.hasPasswordInteracted && control.valid;
  }

  get passwordInputInvalid(): boolean {
    return !!this.pw && this.hasPasswordInteracted && this.pw.invalid;
  }

  get passwordInputValid(): boolean {
    return !!this.pw && this.hasPasswordInteracted && this.pw.valid;
  }

  get confirmPasswordEnabled(): boolean {
    return !!this.cpw && this.cpw.enabled;
  }

  get confirmPasswordValid(): boolean {
    return !!this.cpw
      && this.confirmPasswordEnabled
      && !!this.cpw.value
      && !this.profileForm.hasError('mismatch');
  }

  get confirmPasswordInvalid(): boolean {
    return !!this.cpw && (
      this.confirmPasswordMismatchVisible
      || (this.confirmPasswordEnabled && this.cpw.hasError('required') && (this.cpw.touched || this.cpw.dirty))
    );
  }

  get confirmPasswordMismatchVisible(): boolean {
    return !!this.cpw
      && this.confirmPasswordEnabled
      && !!this.cpw.value
      && this.profileForm.hasError('mismatch');
  }

  get selectedInterestsArray(): FormArray {
    return this.profileForm.get('selectedInterests') as FormArray;
  }

  toggleInterest(interestId: string): void {
    const arr = this.selectedInterestsArray;
    if (this.isInterestSelected(interestId)) {
      const idx = arr.controls.findIndex(c => c.value === interestId);
      arr.removeAt(idx);
    } else {
      arr.push(new FormControl(interestId));
    }
  }

  isInterestSelected(interestId: string): boolean {
    return this.selectedInterestsArray.controls.some(c => c.value === interestId);
  }

  minimumSelectionValidator(min: number): ValidatorFn {
    return (control: AbstractControl) => {
      const arr = control as FormArray;
      return arr && arr.length < min ? { requireAtLeast: min } : null;
    };
  }

  pwValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = String(control.value ?? '');

      if (value.length < 8) {
        return { short: true };
      }

      if (!/[A-Z]/.test(value)) {
        return { upper: true };
      }

      if (!(/[0-9]/.test(value) || /[^A-Za-z0-9]/.test(value))) {
        return { extra: true };
      }

      return null;
    };
  }

  matchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get('password')?.value;
      const confirmPassword = control.get('confirmPassword')?.value;

      return password && confirmPassword && password !== confirmPassword
        ? { mismatch: true }
        : null;
    };
  }

  get cpwMsg(): string {
    const control = this.cpw;
    if (!control || control.disabled || (!control.touched && !control.dirty && !control.value)) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Please confirm your password.';
    }

    if (this.profileForm.hasError('mismatch')) {
      return 'Passwords do not match.';
    }

    return '';
  }

  private syncConfirmPasswordState(): void {
    const confirmControl = this.cpw;
    if (!confirmControl) return;

    if (this.pw?.valid) {
      if (confirmControl.disabled) {
        confirmControl.enable({ emitEvent: false });
      }
      this.profileForm.updateValueAndValidity({ emitEvent: false });
      return;
    }

    if (confirmControl.enabled) {
      confirmControl.reset('', { emitEvent: false });
      confirmControl.disable({ emitEvent: false });
      confirmControl.markAsPristine();
      confirmControl.markAsUntouched();
    }

    this.profileForm.updateValueAndValidity({ emitEvent: false });
  }

  onLanguageChange(lang: string): void {
    const supported: SiteLanguageCode[] = ['en', 'sr', 'de', 'fr', 'it', 'es', 'ru', 'nl'];
    if (supported.includes(lang as SiteLanguageCode)) {
      void this.translateService.setLanguage(lang as SiteLanguageCode);
    }
  }

  onCreateAccount(): void {
    this.profileForm.markAllAsTouched();
    if (this.profileForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const { fullName, emailOrPhone, password, language } = this.profileForm.value;

    this.authService.register(fullName, emailOrPhone, password, {
      language,
      interests: this.selectedInterestsArray.value ?? [],
      profileImage: this.profileImageUrl,
    }).subscribe({
      next: res => {
        this.isLoading = false;
        this.autoLoggedIn = !res.requiresEmailVerification && !!res.session?.token;
        this.registrationEmail = res.email || emailOrPhone;
        this.registrationSuccess = true;
        this.cdr.detectChanges();
      },
      error: err => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Registration failed. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.isUploadingPhoto) return;

    this.isUploadingPhoto = true;
    this.errorMessage = '';
    this.authService.uploadProfileImage(file).subscribe({
      next: url => {
        this.profileImageUrl = url;
        this.isUploadingPhoto = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isUploadingPhoto = false;
        this.errorMessage = 'Profile photo upload failed. You can continue without it.';
        this.cdr.detectChanges();
      }
    });
  }

  goToLogin(): void {
    const queryParams = !this.autoLoggedIn && this.registrationEmail
      ? { registered: '1', email: this.registrationEmail }
      : undefined;

    this.router.navigate(['/login'], { queryParams });
  }

  goToMap(): void {
    this.router.navigate(['/map-home']);
  }

  toggleLocationPermit(): void {
    const current = this.profileForm.get('locationPermit')?.value;
    this.profileForm.patchValue({ locationPermit: !current });
    this.preferences.update({ locationSharing: !current });
  }

  onLocationPermitChange(): void {
    const value = this.profileForm.get('locationPermit')?.value;
    this.preferences.update({ locationSharing: value });
  }
}
