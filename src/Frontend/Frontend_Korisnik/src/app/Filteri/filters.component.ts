import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FilterStateService, FilterState } from '../services/filter-state.service';

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filters.component.html',
  styleUrls: ['./filters.component.css']
})
export class FiltersComponent implements OnInit {

  // Categories use actual DB postType keys so the map can filter correctly
  categories = [
    { id: 'attraction',      label: 'Attractions',   icon: '🏖️', selected: false },
    { id: 'restaurant',      label: 'Restaurants',   icon: '🍴', selected: false },
    { id: 'cultural_site',   label: 'Culture',       icon: '🏛️', selected: false },
    { id: 'monument',        label: 'Monuments',     icon: '🗿', selected: false },
    { id: 'club',            label: 'Nightlife',     icon: '🎉', selected: false },
    { id: 'sports_facility', label: 'Activities',    icon: '🎡', selected: false },
    { id: 'event',           label: 'Events',        icon: '📅', selected: false },
    { id: 'accommodation',   label: 'Accommodation', icon: '🏨', selected: false },
    { id: 'shop',            label: 'Shopping',      icon: '🛍️', selected: false },
  ];

  radius: number = 0; // 0 = unlimited
  minRating: number = 0;
  openNow: boolean = false;
  fromDate: string = '';
  toDate: string = '';

  constructor(
    private router: Router,
    private filterState: FilterStateService
  ) {}

  ngOnInit(): void {
    // Restore previously saved state
    const state = this.filterState.get();
    this.minRating = state.minRating;
    this.openNow   = state.openNow;
    this.radius    = state.radius;
    if (state.activeCategories.length > 0) {
      this.categories.forEach(c => {
        c.selected = state.activeCategories.includes(c.id);
      });
    }
  }

  toggleCategory(cat: any) {
    cat.selected = !cat.selected;
  }

  setRating(rating: number) {
    this.minRating = this.minRating === rating ? 0 : rating;
  }

  clearAll() {
    this.categories.forEach(c => c.selected = false);
    this.radius    = 0;
    this.minRating = 0;
    this.openNow   = false;
    this.fromDate  = '';
    this.toDate    = '';
    this.filterState.clear();
  }

  closeFilters() {
    this.router.navigate(['/map-home']);
  }

  applyFilters() {
    const selected = this.categories.filter(c => c.selected).map(c => c.id);

    const state: FilterState = {
      minRating:        this.minRating,
      openNow:          this.openNow,
      radius:           this.radius,
      activeCategories: selected
    };

    this.filterState.set(state);
    this.router.navigate(['/map-home']);
  }
}
