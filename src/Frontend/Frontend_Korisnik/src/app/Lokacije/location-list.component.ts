import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
// Importuj SideMenu komponentu
import { SideMenuComponent } from '../SideMenu/side-menu.component'; 

@Component({
  selector: 'app-location-list',
  standalone: true,
  // OBAVEZNO dodaj SideMenuComponent u imports niz
  imports: [CommonModule, SideMenuComponent], 
  templateUrl: './location-list.component.html',
  styleUrls: ['./location-list.component.css']
})
export class LocationListComponent {
  
  // Varijabla koja kontroliše da li je bočni meni vidljiv
  isMenuOpen = false;

  locations = [
    {
      id: 1,
      title: 'Beach Morgen',
      category: 'Beach',
      rating: 4.8,
      reviews: 1240,
      distance: 1.2,
      status: 'Open now',
      isOpen: true,
      imageUrl: 'assets/Budva.jpg' // Koristim sliku koju već imaš u assets
    },
    {
      id: 2,
      title: 'Old Town Budva',
      category: 'Culture',
      rating: 4.9,
      reviews: 3502,
      distance: 0.8,
      status: 'Open now',
      isOpen: true,
      imageUrl: 'assets/Budva.jpg'
    },
    {
      id: 3,
      title: 'Lovćen - Njegošev Mauzolej',
      category: 'Nature',
      rating: 4.7,
      reviews: 890,
      distance: 42.5,
      status: 'Closed',
      isOpen: false,
      imageUrl: 'assets/Durmitor.jpg' // Koristim tvoju sliku planine
    }
  ];

  constructor(private router: Router) {}

  // Funkcija za otvaranje/zatvaranje menija
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  goToMap() {
    this.router.navigate(['/map-home']);
  }

  openFilters() {
    this.router.navigate(['/filters']);
  }

  viewDetails(id: number) {
  this.router.navigate(['/location-details', id]);
}
}