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
    private translateService: SiteTranslateService
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      fullName: ['', Validators.required],
      emailOrPhone: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, this.pwValidator()]],
      confirmPassword: ['', Validators.required],
      language: ['en'],
      selectedInterests: this.fb.array([], [this.minimumSelectionValidator(2)]),
      locationPermit: [false],
      termsAccepted: [false, Validators.requiredTrue]
    }, {
      validators: this.matchValidator()
    });
  }

  get pw(): AbstractControl | null {
    return this.profileForm.get('password');
  }

  get cpw(): AbstractControl | null {
    return this.profileForm.get('confirmPassword');
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

  get pwMsg(): string {
    const control = this.pw;
    if (!control || (!control.touched && !control.dirty)) {
      return '';
    }

    if (control.hasError('short')) {
      return 'Lozinka mora imati najmanje 8 karaktera.';
    }

    if (control.hasError('upper')) {
      return 'Lozinka mora sadržati najmanje jedno veliko slovo.';
    }

    if (control.hasError('extra')) {
      return 'Lozinka mora sadržati najmanje jedan broj ili jedan specijalni karakter.';
    }

    if (control.valid) {
      return 'Lozinka je validna.';
    }

    return '';
  }

  get pwOk(): boolean {
    const control = this.pw;
    return !!control && (control.touched || control.dirty) && control.valid;
  }

  get cpwMsg(): string {
    const control = this.cpw;
    if (!control || (!control.touched && !control.dirty)) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Potvrdite lozinku.';
    }

    if (this.profileForm.hasError('mismatch')) {
      return 'Lozinke se ne poklapaju.';
    }

    return '';
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

  goToLogin(): void {
    const queryParams = !this.autoLoggedIn && this.registrationEmail
      ? { registered: '1', email: this.registrationEmail }
      : undefined;

    this.router.navigate(['/login'], { queryParams });
  }

  goToMap(): void {
    this.router.navigate(['/map-home']);
  }
}
