import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';

// Tip za jednu stavku u navigaciji
interface NavItem {
  icon: string; // Ime ikone (npr. 'home', 'heart')
  path: string; // URL putanja na koju vodi
  label: string; // Oznaka za pristupačnost
}

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule], // Uvozimo RouterModule za ruter linkove
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent {
  // Lista stavki navigacije tačno prema tvom dizajnu
  navItems: NavItem[] = [
    { icon: 'home', path: '/pocetni', label: 'Početna' },
    { icon: 'heart', path: '/omiljeno', label: 'Omiljeno' },
    { icon: 'user', path: '/profil', label: 'Profil' },
    { icon: 'settings', path: '/podesavanja', label: 'Podešavanja' }
  ];
}