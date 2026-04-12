

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
    { id: 'nature', label: 'Nature', icon: '🌲' },
    { id: 'food', label: 'Food', icon: '🍴' },
    { id: 'beaches', label: 'Beaches', icon: '🏖️' },
    { id: 'culture', label: 'History and Culture', icon: '🏛️' },
    { id: 'nightlife', label: 'Night Life', icon: '🎶' },
    { id: 'photography', label: 'Photography', icon: '📷' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      fullName: ['', Validators.required],
      emailOrPhone: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      language: ['English'],
      selectedInterests: this.fb.array([], [this.minimumSelectionValidator(2)]),
      locationPermit: [false],
      termsAccepted: [false, Validators.requiredTrue]
    });
  }

  get selectedInterestsArray(): FormArray {
    return this.profileForm.get('selectedInterests') as FormArray;
  }

  toggleInterest(interestId: string): void {
    const interests = this.selectedInterestsArray;
    if (this.isInterestSelected(interestId)) {
      const index = interests.controls.findIndex(ctrl => ctrl.value === interestId);
      interests.removeAt(index);
    } else {
      interests.push(new FormControl(interestId));
    }
  }

  isInterestSelected(interestId: string): boolean {
    return this.selectedInterestsArray.controls.some(ctrl => ctrl.value === interestId);
  }

  minimumSelectionValidator(min: number): ValidatorFn {
    return (control: AbstractControl) => {
      const formArray = control as FormArray;
      return formArray && formArray.length < min ? { requireAtLeast: min } : null;
    };
  }

  onCreateAccount(): void {
    if (this.profileForm.invalid) {
      console.log('Forma nije validna.');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { fullName, emailOrPhone, password } = this.profileForm.value;

    this.authService.register(fullName, emailOrPhone, password).subscribe({
      next: () => {
        this.router.navigate(['/map-home']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Greška pri registraciji. Pokušajte ponovo.';
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
