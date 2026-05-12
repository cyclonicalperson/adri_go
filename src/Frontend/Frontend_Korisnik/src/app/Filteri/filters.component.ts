import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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

  // Non-linear radius steps: fine-grained at short distances
  readonly radiusSteps = [0, 1, 2, 3, 5, 7, 10, 15, 20, 30, 50, 75, 100, 150, 200];
  radiusIndex: number = 0; // index into radiusSteps

  get radius(): number { return this.radiusSteps[this.radiusIndex]; }
  set radius(val: number) {
    const idx = this.radiusSteps.indexOf(val);
    this.radiusIndex = idx >= 0 ? idx : 0;
  }

  minRating: number = 0;
  openNow: boolean = false;
  showOnlySaved: boolean = false;
  savedPostIds: number[] = [];
  fromDate: string = '';
  toDate: string = '';

  private returnTo: string = 'map-home';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private filterState: FilterStateService
  ) {}

  ngOnInit(): void {
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo') || 'map-home';

    // Restore previously saved state
    const state = this.filterState.get();
    this.minRating      = state.minRating;
    this.openNow        = state.openNow;
    this.showOnlySaved  = state.showOnlySaved ?? false;
    this.savedPostIds   = state.savedPostIds ?? [];
    // Find the nearest step to the stored radius value
    const storedRadius = state.radius ?? 0;
    const nearest = this.radiusSteps.reduce((prev, cur) =>
      Math.abs(cur - storedRadius) < Math.abs(prev - storedRadius) ? cur : prev, 0);
    this.radiusIndex = this.radiusSteps.indexOf(nearest);
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
    this.radiusIndex   = 0;
    this.minRating     = 0;
    this.openNow       = false;
    this.showOnlySaved = false;
    this.savedPostIds  = [];
    this.fromDate      = '';
    this.toDate        = '';
    this.filterState.clear();
  }

  closeFilters() {
    this.router.navigate(['/' + this.returnTo]);
  }

  applyFilters() {
    const selected = this.categories.filter(c => c.selected).map(c => c.id);

    const state: FilterState = {
      minRating:        this.minRating,
      openNow:          this.openNow,
      radius:           this.radius,
      activeCategories: selected,
      showOnlySaved:    this.showOnlySaved,
      savedPostIds:     this.savedPostIds
    };

    this.filterState.set(state);
    this.router.navigate(['/' + this.returnTo]);
  }
}
