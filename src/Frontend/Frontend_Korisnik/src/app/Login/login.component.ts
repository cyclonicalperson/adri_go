import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html', // Povezuje HTML fajl
  styleUrls: ['./login.component.scss']  // Povezuje SCSS fajl
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';

  constructor(private fb: FormBuilder, private router: Router) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      
      // Privremena provera (dok ne povežemo .NET API)
      if (email === 'admin@globecode.com' && password === 'password123') {
        this.router.navigate(['/admin']);
      } else {
        this.errorMessage = 'Pogrešan email ili lozinka.';
        this.loginForm.get('password')?.reset();
      }
    }
  }
}