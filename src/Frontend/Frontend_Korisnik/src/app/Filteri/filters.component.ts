import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // Uvezen Router za navigaciju

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filters.component.html',
  styleUrls: ['./filters.component.css']
})
export class FiltersComponent {
  // Output-i su ti i dalje korisni ako budeš hteo da vratiš komponente u "overlay" mod
  @Output() onClose = new EventEmitter<void>();
  @Output() onApply = new EventEmitter<any>();

  // Podaci za filtere
  categories = [
    { id: 'beaches', label: 'Beaches', icon: '🏖️', selected: true },
    { id: 'restaurants', label: 'Restaurants', icon: '🍴', selected: false },
    { id: 'culture', label: 'Culture', icon: '🏛️', selected: false },
    { id: 'nature', label: 'Nature', icon: '🌲', selected: false },
    { id: 'activities', label: 'Activities', icon: '🎡', selected: false },
    { id: 'events', label: 'Events', icon: '📅', selected: false }
  ];

  radius: number = 15;
  minRating: number = 4;
  openNow: boolean = true;
  fromDate: string = '';
  toDate: string = '';

  // Ubacujemo router u konstruktor
  constructor(private router: Router) {}

  toggleCategory(cat: any) {
    cat.selected = !cat.selected;
  }

  setRating(rating: number) {
    this.minRating = rating;
  }

  clearAll() {
    this.categories.forEach(c => c.selected = false);
    this.radius = 1;
    this.minRating = 0;
    this.openNow = false;
  }

  // Metoda za X dugme u HTML-u
  closeFilters() {
    this.router.navigate(['/map-home']);
  }

  applyFilters() {
    const activeFilters = {
      categories: this.categories.filter(c => c.selected).map(c => c.id),
      radius: this.radius,
      minRating: this.minRating,
      openNow: this.openNow,
      period: { from: this.fromDate, to: this.toDate }
    };
    
    console.log('Filteri primenjeni:', activeFilters);
    this.onApply.emit(activeFilters);

    // Nakon što "primeniš", vraćamo se na mapu
    this.router.navigate(['/map-home']);
  }
}