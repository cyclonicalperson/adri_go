import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account.html', // Promeni ovo
  styleUrls: ['./account.css']   // Proveri i ovde da li treba da se obriše .component
})
export class AccountComponent {
  
  // Mock podaci o korisniku
  userData = {
    name: 'Jovan Dizdarević',
    email: 'jovan@email.com',
    profilePic: 'assets/profile.jpg', // Postavi neku sliku u assets folder
    stats: {
      saved: 12,
      tickets: 4,
      upcoming: 2
    }
  };

  constructor(private router: Router) {}

  goBack() {
    // Vraća korisnika na prethodnu stranu (npr. mapu ili listu)
    window.history.back();
  }

  logout() {
    console.log('Odjavljivanje korisnika...');
    // Preusmeravanje na Login ekran
    this.router.navigate(['/login']);
  }

  // Funkcije za navigaciju (dodaj rute kasnije)
  goToPersonalInfo() { console.log('Navigacija na lične podatke'); }
  goToHelp() { console.log('Navigacija na pomoć'); }
  goToPrivacy() { console.log('Navigacija na privatnost'); }
}