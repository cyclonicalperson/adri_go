import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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

  /**
   * 'map'     → sidebar panel s leve strane (desktop), fullscreen (mobile)
   * 'explore' → modal centriran sa dimovanom pozadinom
   */
  @Input() context: 'map' | 'explore' = 'map';

  /** Legacy inlineMode support — ignored, use context instead */
  @Input() inlineMode = false;

  @Output() closed  = new EventEmitter<void>();
  @Output() applied = new EventEmitter<FilterState>();

  readonly categoryColors: Record<string, string> = {
    accommodation:   '#3b82f6',
    restaurant:      '#ef4444',
    club:            '#8b5cf6',
    cultural_site:   '#f59e0b',
    monument:        '#d97706',
    sports_facility: '#22c55e',
    event:           '#ec4899',
    attraction:      '#10b981',
    shop:            '#f97316',
    other:           '#6b7280',
  };

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
    { id: 'other',           label: 'Ostalo',        icon: '\u{1F4CD}', selected: false },
  ];

  readonly radiusSteps = [0, 1, 2, 3, 5, 7, 10, 15, 20, 30, 50, 75, 100, 150, 200];
  radiusIndex: number = 0;

  get radius(): number { return this.radiusSteps[this.radiusIndex]; }

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
    // Samo citamo returnTo ako smo otvoreni kao ruta (ne inline)
    try {
      this.returnTo = this.route.snapshot.queryParamMap.get('returnTo') || 'map-home';
    } catch {
      this.returnTo = 'map-home';
    }

    // context @Input ima prednost — ne overrideujemo ga iz returnTo
    // (returnTo se koristi samo za navigaciju kada je komponenta otvorena kao ruta)

    const state = this.filterState.get();
    this.minRating     = state.minRating;
    this.openNow       = state.openNow;
    this.showOnlySaved = state.showOnlySaved ?? false;
    this.savedPostIds  = state.savedPostIds ?? [];
    const storedRadius = state.radius ?? 0;
    const nearest = this.radiusSteps.reduce((prev, cur) =>
      Math.abs(cur - storedRadius) < Math.abs(prev - storedRadius) ? cur : prev, 0);
    this.radiusIndex = this.radiusSteps.indexOf(nearest);
    if (state.activeCategories.length > 0) {
      this.categories.forEach(c => { c.selected = state.activeCategories.includes(c.id); });
    }
  }

  getCategoryColor(id: string): string {
    return this.categoryColors[id] ?? '#6b7280';
  }

  toggleCategory(cat: any): void {
    cat.selected = !cat.selected;
    this.onAnyChange();
  }

  setRating(rating: number): void {
    this.minRating = this.minRating === rating ? 0 : rating;
    this.onAnyChange();
  }

  /** Called on every interactive change — saves state and emits immediately */
  onAnyChange(): void {
    const state = this.buildState();
    this.filterState.set(state);
    this.applied.emit(state);
  }

  clearAll(): void {
    this.categories.forEach(c => c.selected = false);
    this.radiusIndex   = 0;
    this.minRating     = 0;
    this.openNow       = false;
    this.showOnlySaved = false;
    this.savedPostIds  = [];
    this.fromDate      = '';
    this.toDate        = '';
    this.filterState.clear();
    this.applied.emit(this.filterState.getDefault());
  }

  closeFilters(): void {
    this.closed.emit();
  }

  /** Navigate-based close — used when component is opened as a route (map context, mobile) */
  private buildState(): FilterState {
    const selected = this.categories.filter(c => c.selected).map(c => c.id);
    return {
      minRating:        this.minRating,
      openNow:          this.openNow,
      radius:           this.radius,
      activeCategories: selected,
      showOnlySaved:    this.showOnlySaved,
      savedPostIds:     this.savedPostIds,
    };
  }

  /** applyFilters kept for backward compat — now just saves and navigates */
  applyFilters(): void {
    const state = this.buildState();
    this.filterState.set(state);
    if (this.inlineMode) {
      this.applied.emit(state);
    } else {
      this.router.navigate(['/' + this.returnTo]);
    }
  }
}
