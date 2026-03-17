import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username = '';
  password = '';
  loading = signal(false);
  error = signal('');

  constructor(private auth: AuthService, private router: Router) {}

 onSubmit() {
    console.log('Pokušaj logina za:', this.username); // DEBUG
    
    this.auth.login({ username: this.username, password: this.password }).subscribe({
      next: (res) => {
        console.log('Uspešan login, odgovor servera:', res); // DEBUG
        this.router.navigate(['/dashboard']).then(nav => {
            console.log('Navigacija uspešna?', nav); // DEBUG: Da li je router uopšte krenuo?
        });
      },
      error: (err) => {
        console.error('Greška koja se desila:', err); // OVO ĆE TI REĆI SVE
        this.loading.set(false);
        this.error.set(err.error?.message || 'Greška pri prijavi.');
      }
    });
}
}
