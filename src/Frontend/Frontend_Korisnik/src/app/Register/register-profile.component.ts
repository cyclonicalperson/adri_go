import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl, ValidatorFn, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register-profile',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './register-profile.component.html',
  styleUrls: ['./register-profile.component.css']
})
export class RegisterProfileComponent implements OnInit {
  profileForm!: FormGroup;
  isLoading = false;
  errorMessage = '';

  interests = [
    { id: 'nature',      label: 'Nature',             icon: '🌲' },
    { id: 'food',        label: 'Food',               icon: '🍴' },
    { id: 'beaches',     label: 'Beaches',            icon: '🏖️' },
    { id: 'history',     label: 'History and Culture',icon: '🏛️' },
    { id: 'nightlife',   label: 'Night Life',         icon: '🎶' },
    { id: 'photography', label: 'Photography',        icon: '📷' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      fullName:          ['', Validators.required],
      emailOrPhone:      ['', [Validators.required, Validators.email]],
      password:          ['', [Validators.required, Validators.minLength(8)]],
      language:          ['English'],
      selectedInterests: this.fb.array([], [this.minimumSelectionValidator(2)]),
      locationPermit:    [false],
      termsAccepted:     [false, Validators.requiredTrue]
    });
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

  onCreateAccount(): void {
    if (this.profileForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const { fullName, emailOrPhone, password } = this.profileForm.value;

    // Try JWT endpoint first
    this.authService.registerWithToken(fullName, emailOrPhone, password).subscribe({
      next: () => { this.isLoading = false; this.router.navigate(['/map-home']); },
      error: () => {
        // Fallback to simple endpoint
        this.authService.register(fullName, emailOrPhone, password).subscribe({
          next: () => { this.isLoading = false; this.router.navigate(['/map-home']); },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = err?.error?.message || 'Greška pri registraciji.';
          }
        });
      }
    });
  }

  goToLogin(): void { this.router.navigate(['/login']); }
}
