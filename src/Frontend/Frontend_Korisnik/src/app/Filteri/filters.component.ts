import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
import { FilterStateService, FilterState, FilterContentType } from '../services/filter-state.service';
import { TouristActivitiesService } from '../services/tourist-activities.service';
import { TouristRoutesService } from '../services/tourist-routes.service';
import { environment } from '../../environments/environment';
import { WORLD_COUNTRIES } from '../shared/data/world-countries';

interface DestinationRegionOption {
  name: string;
  country: string;
}

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

  @Input() showContentFilters = false;
  @Input() showContentTypeTabs = false;
  @Input() activeContentType: FilterContentType = 'destinations';
  @Input() set preloadedDestinationRegions(value: DestinationRegionOption[] | null | undefined) {
    this.preloadedDestinationRegionItems = this.normalizeRegionItems(value ?? []);
    if (this.preloadedDestinationRegionItems.length > 0) {
      this.applyDestinationRegionItems(this.preloadedDestinationRegionItems);
    }
  }
  @Input() set availableSavedPostIds(value: number[] | null | undefined) {
    this.availableSavedPostIdsInternal = this.uniqueNumbers(value ?? []);
    this.syncSavedPostIdsFromInput();
  }

  @Output() closed  = new EventEmitter<void>();
  @Output() applied = new EventEmitter<FilterState>();
  @Output() activeContentTypeChange = new EventEmitter<FilterContentType>();

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

  categorySelectValue = '';

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
  readonly destinationCountryOptions = WORLD_COUNTRIES;
  private destinationRegionItems: DestinationRegionOption[] = [];
  private preloadedDestinationRegionItems: DestinationRegionOption[] = [];
  destinationRegionOptions: string[] = [];
  destinationFilters = {
    countries: [] as string[],
    regions: [] as string[],
  };
  activityCategoryOptions: string[] = [];
  activityDifficultyOptions: string[] = [];
  routeDifficultyOptions: string[] = [];
  routeRegionOptions: string[] = [];
  activityFilters = {
    categories: [] as string[],
    difficulties: [] as string[],
    linkedOnly: false,
  };
  routeFilters = {
    difficulties: [] as string[],
    regions: [] as string[],
    distanceBand: '',
    durationBand: '',
  };
  destinationRegionsLoading = false;
  readonly contentTypeTabs: { value: FilterContentType; label: string }[] = [
    { value: 'destinations', label: 'Destinacije' },
    { value: 'activities', label: 'Aktivnosti' },
    { value: 'routes', label: 'Rute' },
  ];

  private returnTo: string = 'map-home';
  private availableSavedPostIdsInternal: number[] = [];
  private static destinationRegionCache: DestinationRegionOption[] | null = null;
  private static destinationRegionRequest$: Observable<DestinationRegionOption[]> | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private filterState: FilterStateService,
    private activitiesService: TouristActivitiesService,
    private routesService: TouristRoutesService,
    private http: HttpClient
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
    this.syncSavedPostIdsFromInput();
    this.destinationFilters = {
      countries: [...(state.destinationCountries ?? [])],
      regions: [...(state.destinationRegions ?? [])],
    };
    this.activityFilters = {
      categories: [...(state.activityCategories ?? [])],
      difficulties: [...(state.activityDifficulties ?? [])],
      linkedOnly: state.activityLinkedOnly ?? false,
    };
    this.routeFilters = {
      difficulties: [...(state.routeDifficulties ?? [])],
      regions: [...(state.routeRegions ?? [])],
      distanceBand: state.routeDistanceBand ?? '',
      durationBand: state.routeDurationBand ?? '',
    };
    const storedRadius = state.radius ?? 0;
    const nearest = this.radiusSteps.reduce((prev, cur) =>
      Math.abs(cur - storedRadius) < Math.abs(prev - storedRadius) ? cur : prev, 0);
    this.radiusIndex = this.radiusSteps.indexOf(nearest);
    if (state.activeCategories.length > 0) {
      this.categories.forEach(c => { c.selected = state.activeCategories.includes(c.id); });
    }
    this.loadDestinationFilterOptions();
    if (this.showContentFilters) {
      this.loadContentFilterOptions();
    }
  }

  getCategoryColor(id: string): string {
    return this.categoryColors[id] ?? '#6b7280';
  }

  get showDestinationFilters(): boolean {
    return !this.showContentFilters || this.activeContentType === 'destinations';
  }

  get showActivityFilters(): boolean {
    return this.showContentFilters && this.activeContentType === 'activities';
  }

  get showRouteFilters(): boolean {
    return this.showContentFilters && this.activeContentType === 'routes';
  }

  setActiveContentType(type: FilterContentType): void {
    if (this.activeContentType === type) return;

    this.activeContentType = type;
    this.activeContentTypeChange.emit(type);
  }

  toggleCategory(cat: any): void {
    cat.selected = !cat.selected;
    this.onAnyChange();
  }

  onCategoryDropdown(value: string): void {
    if (!value) return;
    const category = this.categories.find(cat => cat.id === value);
    if (category) {
      this.toggleCategory(category);
    }
    this.categorySelectValue = '';
  }

  setRating(rating: number): void {
    this.minRating = this.minRating === rating ? 0 : rating;
    this.onAnyChange();
  }

  /** Called on every interactive change — saves state and emits immediately */
  toggleActivityFilter(group: 'categories' | 'difficulties', value: string): void {
    const list = this.activityFilters[group];
    this.activityFilters[group] = list.includes(value)
      ? list.filter(item => item !== value)
      : [...list, value];
    this.onAnyChange();
  }

  toggleRouteFilter(group: 'difficulties' | 'regions', value: string): void {
    const list = this.routeFilters[group];
    this.routeFilters[group] = list.includes(value)
      ? list.filter(item => item !== value)
      : [...list, value];
    this.onAnyChange();
  }

  toggleDestinationFilter(group: 'countries' | 'regions', value: string): void {
    const list = this.destinationFilters[group];
    this.destinationFilters[group] = list.includes(value)
      ? list.filter(item => item !== value)
      : [...list, value];

    if (group === 'countries') {
      const availableRegions = new Set(this.filteredDestinationRegionOptions);
      this.destinationFilters.regions = this.destinationFilters.regions.filter(region => availableRegions.has(region));
    }

    this.onAnyChange();
  }

  toggleLinkedActivitiesOnly(): void {
    this.activityFilters.linkedOnly = !this.activityFilters.linkedOnly;
    this.onAnyChange();
  }

  onDropdownToggle(
    group: 'destinationCountries' | 'destinationRegions' | 'activityCategories' | 'activityDifficulties' | 'routeDifficulties' | 'routeRegions',
    value: string
  ): void {
    if (!value) return;

    switch (group) {
      case 'destinationCountries':
        this.toggleDestinationFilter('countries', value);
        break;
      case 'destinationRegions':
        this.toggleDestinationFilter('regions', value);
        break;
      case 'activityCategories':
        this.toggleActivityFilter('categories', value);
        break;
      case 'activityDifficulties':
        this.toggleActivityFilter('difficulties', value);
        break;
      case 'routeDifficulties':
        this.toggleRouteFilter('difficulties', value);
        break;
      case 'routeRegions':
        this.toggleRouteFilter('regions', value);
        break;
    }
  }

  setRouteDistanceBand(value: string): void {
    this.routeFilters.distanceBand = this.routeFilters.distanceBand === value ? '' : value;
    this.onAnyChange();
  }

  setRouteDurationBand(value: string): void {
    this.routeFilters.durationBand = this.routeFilters.durationBand === value ? '' : value;
    this.onAnyChange();
  }

  formatActivityCategory(value?: string | null): string {
    if (!value) return 'Other';
    return value
      .toString()
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  formatRouteDifficulty(value?: string | null): string {
    if (!value) return 'Standard';
    const normalized = value.toString().toLowerCase();
    const labels: Record<string, string> = {
      easy: 'Easy',
      moderate: 'Moderate',
      hard: 'Hard',
      expert: 'Expert',
    };
    return labels[normalized] ?? this.formatActivityCategory(value);
  }

  selectedCategorySummary(): string {
    const selected = this.categories.filter(category => category.selected).map(category => category.label);
    return selected.length ? selected.join(', ') : 'All categories';
  }

  selectedSummary(values: string[], fallback: string, formatter: (value: string) => string = value => value): string {
    return values.length ? values.map(formatter).join(', ') : fallback;
  }

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
    this.savedPostIds  = [...this.availableSavedPostIdsInternal];
    this.fromDate      = '';
    this.toDate        = '';
    this.destinationFilters = { countries: [], regions: [] };
    this.activityFilters = { categories: [], difficulties: [], linkedOnly: false };
    this.routeFilters = { difficulties: [], regions: [], distanceBand: '', durationBand: '' };
    const defaultState = {
      ...this.filterState.getDefault(),
      savedPostIds: this.savedPostIds,
    };
    this.filterState.set(defaultState);
    this.applied.emit(defaultState);
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
      destinationCountries: this.destinationFilters.countries,
      destinationRegions: this.destinationFilters.regions,
      showOnlySaved:    this.showOnlySaved,
      savedPostIds:     this.savedPostIds,
      activityCategories: this.activityFilters.categories,
      activityDifficulties: this.activityFilters.difficulties,
      activityLinkedOnly: this.activityFilters.linkedOnly,
      routeDifficulties: this.routeFilters.difficulties,
      routeRegions: this.routeFilters.regions,
      routeDistanceBand: this.routeFilters.distanceBand,
      routeDurationBand: this.routeFilters.durationBand,
    };
  }

  /** applyFilters kept for backward compat — now just saves and navigates */
  private loadContentFilterOptions(): void {
    this.activitiesService.getActivities().subscribe({
      next: activities => {
        this.activityCategoryOptions = this.uniqueSorted(activities.map(item => item.category).filter(Boolean));
        this.activityDifficultyOptions = this.uniqueSorted(activities.map(item => item.difficulty || '').filter(Boolean));
      },
      error: () => {
        this.activityCategoryOptions = [];
        this.activityDifficultyOptions = [];
      },
    });

    this.routesService.getRoutes().subscribe({
      next: routes => {
        this.routeDifficultyOptions = this.uniqueSorted(routes.map(item => item.difficulty || '').filter(Boolean));
        this.routeRegionOptions = this.uniqueSorted(routes.map(item => item.regionName || '').filter(Boolean));
      },
      error: () => {
        this.routeDifficultyOptions = [];
        this.routeRegionOptions = [];
      },
    });
  }

  private loadDestinationFilterOptions(): void {
    if (this.preloadedDestinationRegionItems.length > 0) {
      this.applyDestinationRegionItems(this.preloadedDestinationRegionItems);
      return;
    }

    if (FiltersComponent.destinationRegionCache) {
      this.applyDestinationRegionItems(FiltersComponent.destinationRegionCache);
      return;
    }

    this.destinationRegionsLoading = true;
    if (!FiltersComponent.destinationRegionRequest$) {
      FiltersComponent.destinationRegionRequest$ = this.http.get<{ data: Array<{ name?: string; country?: string }> }>(`${environment.apiUrl}/regions?pageSize=100`)
        .pipe(
          map(res => this.normalizeRegionItems(res.data ?? [])),
          tap(items => { FiltersComponent.destinationRegionCache = items; }),
          shareReplay(1),
        );
    }

    FiltersComponent.destinationRegionRequest$
      .subscribe({
        next: items => {
          this.applyDestinationRegionItems(items);
          this.destinationRegionsLoading = false;
        },
        error: () => {
          FiltersComponent.destinationRegionRequest$ = null;
          this.destinationRegionItems = [];
          this.destinationRegionOptions = [];
          this.destinationRegionsLoading = false;
        },
      });
  }

  get filteredDestinationRegionOptions(): string[] {
    if (this.destinationFilters.countries.length === 0) {
      return this.destinationRegionOptions;
    }

    const selectedCountries = new Set(this.destinationFilters.countries);
    return this.uniqueSorted(
      this.destinationRegionItems
        .filter(item => selectedCountries.has(item.country))
        .map(item => item.name)
    );
  }

  private uniqueSorted(values: string[]): string[] {
    return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
  }

  private applyDestinationRegionItems(items: DestinationRegionOption[]): void {
    this.destinationRegionItems = this.normalizeRegionItems(items);
    this.destinationRegionOptions = this.uniqueSorted(this.destinationRegionItems.map(item => item.name));
    const availableRegions = new Set(this.filteredDestinationRegionOptions);
    this.destinationFilters.regions = this.destinationFilters.regions.filter(region => availableRegions.has(region));
    this.destinationRegionsLoading = false;
  }

  private normalizeRegionItems(items: Array<{ name?: string | null; country?: string | null }>): DestinationRegionOption[] {
    const seen = new Set<string>();
    return items
      .map(item => ({
        name: (item.name || '').trim(),
        country: (item.country || '').trim(),
      }))
      .filter(item => {
        if (!item.name) return false;
        const key = `${item.name}|${item.country}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  private syncSavedPostIdsFromInput(): void {
    if (this.availableSavedPostIdsInternal.length === 0) return;

    this.savedPostIds = [...this.availableSavedPostIdsInternal];
  }

  private uniqueNumbers(values: number[]): number[] {
    return Array.from(new Set(values.filter(value => Number.isFinite(value))));
  }

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
