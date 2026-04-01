import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; // Potrebno za prekidače

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css']
})
export class SettingsComponent {
  
  // Stanja za prekidače
  settings = {
    locationSharing: true,
    anonymousAnalytics: false,
    personalizedRecs: true,
    pushNotifications: true,
    emailNotifications: false,
    language: 'English (US)'
  };

  appVersion: string = 'v2.4.12-build.06';

  constructor(private router: Router) {}

  goBack() {
    window.history.back();
  }

  saveChanges() {
    console.log('Sačuvana podešavanja:', this.settings);
    // Ovde bi išao poziv ka serveru
    this.goBack();
  }

  logout() {
    this.router.navigate(['/login']);
  }
}