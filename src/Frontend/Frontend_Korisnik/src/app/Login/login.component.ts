import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'; // <-- 1. Dodaj ReactiveFormsModule
import { Router } from '@angular/router';// Dodat import za rute

@Component({
  selector: 'app-login',
  standalone: true, // Ovo verovatno već imaš
  imports: [ReactiveFormsModule], // <-- 2. DODAJ OVO DA BI FORMA RADILA
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;

  // Ubačen Router u konstruktor
  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    // Inicijalizacija forme sa osnovnim poljima
    this.loginForm = this.fb.group({
      emailOrPhone: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  // Funkcija koja će se pozvati na klik dugmeta "Log In"
  onLogin(): void {
    if (this.loginForm.valid) {
      console.log('Podaci sa forme:', this.loginForm.value);
      // Preusmeravanje na mapu kada je forma popunjena
      this.router.navigate(['/map-home']);
    } else {
      console.log('Forma nije validna.');
    }
  }

  onGuestLogin(): void {
    console.log('Nastavi kao gost');
    // Gosta takođe šaljemo na mapu da istraži lokacije
    this.router.navigate(['/map-home']);
  }

  onGoogleLogin(): void {
    console.log('Google login pokrenut');
  }

  onAppleLogin(): void {
    console.log('Apple login pokrenut');
  }

  // Nova funkcija za prelazak na ekran za izbor uloge/registraciju
  goToRegister(): void {
    console.log('Preusmeravanje na izbor uloge');
    this.router.navigate(['/choose-role']);
  }
}