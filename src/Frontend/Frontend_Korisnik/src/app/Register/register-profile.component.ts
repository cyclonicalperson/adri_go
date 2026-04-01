import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl, ValidatorFn, ReactiveFormsModule } from '@angular/forms'; // <-- Dodaj ReactiveFormsModule
import { CommonModule } from '@angular/common'; // <-- Dodaj CommonModule
import { Router } from '@angular/router';// Dodat import za rute

@Component({
  selector: 'app-register-profile',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule], // <-- DODAJ OVO DA BI RADILI formGroup, *ngIf i *ngFor
  templateUrl: './register-profile.component.html',
  styleUrls: ['./register-profile.component.css']
})
export class RegisterProfileComponent implements OnInit {
  profileForm!: FormGroup;

  // Lista dostupnih interesovanja sa tvoje slike
  interests = [
    { id: 'nature', label: 'Nature', icon: '🌲' },
    { id: 'food', label: 'Food', icon: '🍴' },
    { id: 'beaches', label: 'Beaches', icon: '🏖️' },
    { id: 'culture', label: 'History and Culture', icon: '🏛️' },
    { id: 'nightlife', label: 'Night Life', icon: '🎶' },
    { id: 'photography', label: 'Photography', icon: '📷' }
  ];

  // Ubačen Router pored FormBuilder-a
  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    // Inicijalizacija forme sa svim poljima
    this.profileForm = this.fb.group({
      fullName: ['', Validators.required],
      emailOrPhone: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      language: ['English'], // Podrazumevani jezik
      selectedInterests: this.fb.array([], [this.minimumSelectionValidator(2)]), // Bar 2 interesovanja
      locationPermit: [false], // Početna vrednost
      termsAccepted: [false, Validators.requiredTrue] // Moraju prihvatiti uslove
    });
  }

  // Pomoćna funkcija za lakši pristup nizu interesovanja u HTML-u
  get selectedInterestsArray(): FormArray {
    return this.profileForm.get('selectedInterests') as FormArray;
  }

  // Funkcija za izbor/odabir interesovanja na klik
  toggleInterest(interestId: string): void {
    const interests = this.selectedInterestsArray;
    if (this.isInterestSelected(interestId)) {
      // Ako je već izabrano, ukloni ga
      const index = interests.controls.findIndex(ctrl => ctrl.value === interestId);
      interests.removeAt(index);
    } else {
      // Ako nije izabrano, dodaj ga
      interests.push(new FormControl(interestId));
    }
  }

  // Provera da li je određeno interesovanje izabrano
  isInterestSelected(interestId: string): boolean {
    return this.selectedInterestsArray.controls.some(ctrl => ctrl.value === interestId);
  }

  // Custom validator za minimalan broj izabranih interesovanja
  minimumSelectionValidator(min: number): ValidatorFn {
    return (control: AbstractControl) => {
      const formArray = control as FormArray;
      if (formArray && formArray.length < min) {
        return { requireAtLeast: min };
      }
      return null;
    };
  }

  // Funkcija koja se poziva na klik "Create account"
  onCreateAccount(): void {
    if (this.profileForm.valid) {
      console.log('Podaci za registraciju:', this.profileForm.value);
      // Nakon uspešne registracije, šaljemo korisnika pravo na mapu
      this.router.navigate(['/map-home']);
    } else {
      console.log('Forma nije validna. Proverite polja, interesovanja i uslove.');
    }
  }

  // Funkcija za prelazak na Login (ako korisnik već ima nalog)
  goToLogin(): void {
    console.log('Preusmeravanje na Login ekran');
    // Vraćamo korisnika na login
    this.router.navigate(['/login']);
  }
}