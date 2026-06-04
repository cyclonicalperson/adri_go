import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
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
import { SiteTranslateService } from '../services/site-translate.service';

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
export class FiltersComponent implements OnInit, OnChanges {

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
    { id: 'other',           label: 'Other',         icon: '\u{1F4CD}', selected: false },
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
  eventDateRangeMessage = '';
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
  routeCountryOptions: string[] = [...WORLD_COUNTRIES];
  routeRegionOptions: string[] = [];
  activityFilters = {
    categories: [] as string[],
    difficulties: [] as string[],
    linkedOnly: false,
  };
  routeFilters = {
    difficulties: [] as string[],
    countries: [] as string[],
    regions: [] as string[],
    distanceBand: '',
    durationBand: '',
  };
  destinationRegionsLoading = false;
  readonly contentTypeTabs: { value: FilterContentType; label: string }[] = [
    { value: 'destinations', label: 'Destinations' },
    { value: 'activities', label: 'Activities' },
    { value: 'routes', label: 'Routes' },
  ];

  private returnTo: string = 'map-home';
  private availableSavedPostIdsInternal: number[] = [];
  private static destinationRegionCache: DestinationRegionOption[] | null = null;
  private static destinationRegionRequest$: Observable<DestinationRegionOption[]> | null = null;
  private static activityCategoryCache: string[] | null = null;
  private static activityDifficultyCache: string[] | null = null;
  private static routeDifficultyCache: string[] | null = null;
  private contentFilterOptionsRequested = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private filterState: FilterStateService,
    private activitiesService: TouristActivitiesService,
    private routesService: TouristRoutesService,
    private http: HttpClient,
    private siteTranslate: SiteTranslateService
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
    this.fromDate      = state.eventFromDate ?? '';
    this.toDate        = state.eventToDate ?? '';
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
      countries: [...(state.routeCountries ?? [])],
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
      // Vrati zapamćeni content type
      const savedType = state.activeContentType;
      if (savedType && savedType !== this.activeContentType) {
        this.activeContentType = savedType;
        // Emitujemo da roditelj zna koji tab je aktivan
        Promise.resolve().then(() => this.activeContentTypeChange.emit(savedType));
      }
      this.ensureContentFilterOptions();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeContentType'] && !changes['activeContentType'].firstChange) {
      this.activeContentType = changes['activeContentType'].currentValue;
    }

    if (this.showContentFilters) {
      this.ensureContentFilterOptions();
    }
  }

  getCategoryColor(id: string): string {
    return this.categoryColors[id] ?? '#6b7280';
  }

  getActivityCategoryColor(value: string): string {
    const normalized = this.normalizeColorKey(value);
    if (/(water|swim|beach|kayak|rafting|more|plaza)/.test(normalized)) return '#0ea5e9';
    if (/(food|wine|restaurant|dining|hrana|vino)/.test(normalized)) return '#ef4444';
    if (/(culture|museum|history|kultura|istorija|muzej)/.test(normalized)) return '#f59e0b';
    if (/(night|club|bar|party|noc)/.test(normalized)) return '#8b5cf6';
    if (/(shop|market|shopping|kupovina)/.test(normalized)) return '#f97316';
    if (/(walk|hike|trail|mountain|planina|setnja)/.test(normalized)) return '#22c55e';
    if (/(wellness|spa|relax|yoga)/.test(normalized)) return '#14b8a6';
    return this.getStableFilterColor(value);
  }

  getDifficultyFilterColor(value: string): string {
    const normalized = this.normalizeColorKey(value);
    if (/(easy|light|beginner|low|lako)/.test(normalized)) return '#22c55e';
    if (/(medium|moderate|standard|srednje)/.test(normalized)) return '#f59e0b';
    if (/(hard|difficult|advanced|high|tesko)/.test(normalized)) return '#ef4444';
    return this.getStableFilterColor(value);
  }

  getRouteDistanceBandColor(value: string): string {
    if (value === 'short') return '#22c55e';
    if (value === 'medium') return '#f59e0b';
    return '#ef4444';
  }

  getRouteDurationBandColor(value: string): string {
    if (value === 'quick') return '#10b981';
    if (value === 'half-day') return '#0ea5e9';
    return '#8b5cf6';
  }

  getRatingFilterColor(value: number): string {
    if (value <= 2) return '#ef4444';
    if (value === 3) return '#f59e0b';
    if (value === 4) return '#22c55e';
    return '#10b981';
  }

  getStableFilterColor(value: string): string {
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#ef4444'];
    const key = this.normalizeColorKey(value);
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
    return palette[Math.abs(hash) % palette.length];
  }

  private normalizeColorKey(value: string): string {
    return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
    this.ensureContentFilterOptions();
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

  toggleRouteFilter(group: 'difficulties' | 'countries' | 'regions', value: string): void {
    const list = this.routeFilters[group];
    this.routeFilters[group] = list.includes(value)
      ? list.filter(item => item !== value)
      : [...list, value];

    if (group === 'countries') {
      const availableRegions = new Set(this.filteredRouteRegionOptions);
      this.routeFilters.regions = this.routeFilters.regions.filter(region => availableRegions.has(region));
    }

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
    group: 'destinationCountries' | 'destinationRegions' | 'activityCategories' | 'activityDifficulties' | 'routeDifficulties' | 'routeCountries' | 'routeRegions',
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
      case 'routeCountries':
        this.toggleRouteFilter('countries', value);
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

  get minEventToDate(): string {
    return this.shiftDateOnly(this.fromDate, 1);
  }

  get maxEventFromDate(): string {
    return this.shiftDateOnly(this.toDate, -1);
  }

  onFromDateChange(value: string): void {
    this.fromDate = value;
    this.ensureEventDateRange('from');
    this.onAnyChange();
  }

  onToDateChange(value: string): void {
    this.toDate = value;
    this.ensureEventDateRange('to');
    this.onAnyChange();
  }

  formatActivityCategory(value?: string | null): string {
    if (!value) return this.translateLabel('Other');
    const readable = value
      .toString()
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
    return this.translateLabel(readable);
  }

  formatRouteDifficulty(value?: string | null): string {
    if (!value) return this.translateLabel('Standard');
    const normalized = value.toString().toLowerCase();
    const labels: Record<string, string> = {
      easy: 'Easy',
      moderate: 'Moderate',
      hard: 'Hard',
      expert: 'Expert',
    };
    return this.translateLabel(labels[normalized] ?? this.formatActivityCategory(value));
  }

  selectedCategorySummary(): string {
    const selected = this.categories.filter(category => category.selected).map(category => this.translateLabel(category.label));
    return selected.length ? selected.join(', ') : this.translateLabel('All categories');
  }

  selectedSummary(values: string[], fallback: string, formatter: (value: string) => string = value => value): string {
    return values.length ? values.map(value => this.translateLabel(formatter(value))).join(', ') : this.translateLabel(fallback);
  }

  translateLabel(value: string | null | undefined): string {
    return this.siteTranslate.instant(value ?? '');
  }

  get filteredRouteRegionOptions(): string[] {
    if (this.routeFilters.countries.length === 0) {
      return this.routeRegionOptions;
    }

    const selectedCountries = new Set(this.routeFilters.countries);
    return this.uniqueSorted(
      this.destinationRegionItems
        .filter(item => selectedCountries.has(item.country))
        .map(item => item.name)
    );
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
    this.eventDateRangeMessage = '';
    this.destinationFilters = { countries: [], regions: [] };
    this.activityFilters = { categories: [], difficulties: [], linkedOnly: false };
    this.routeFilters = { difficulties: [], countries: [], regions: [], distanceBand: '', durationBand: '' };
    const defaultState = {
      ...this.filterState.getDefault(),
      savedPostIds: this.savedPostIds,
      activeContentType: this.activeContentType,
    };
    this.filterState.set(defaultState);
    this.applied.emit(defaultState);
  }

  closeFilters(): void {
    this.closed.emit();
  }

  /** Navigate-based close — used when component is opened as a route (map context, mobile) */
  private buildState(): FilterState {
    this.ensureEventDateRange('to');
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
      routeCountries: this.routeFilters.countries,
      routeRegions: this.routeFilters.regions,
      routeDistanceBand: this.routeFilters.distanceBand,
      routeDurationBand: this.routeFilters.durationBand,
      eventFromDate: this.fromDate,
      eventToDate: this.toDate,
      activeContentType: this.activeContentType,
    };
  }

  private ensureEventDateRange(changed: 'from' | 'to'): void {
    if (!this.fromDate || !this.toDate) {
      this.eventDateRangeMessage = '';
      return;
    }

    if (this.compareDateOnly(this.fromDate, this.toDate) < 0) {
      this.eventDateRangeMessage = '';
      return;
    }

    if (changed === 'from') {
      this.toDate = '';
    } else {
      this.fromDate = '';
    }
    this.eventDateRangeMessage = 'Start date must be before end date.';
  }

  private compareDateOnly(left: string, right: string): number {
    const leftTime = this.parseDateOnly(left)?.getTime();
    const rightTime = this.parseDateOnly(right)?.getTime();
    if (leftTime == null || rightTime == null) return 0;
    return leftTime - rightTime;
  }

  private shiftDateOnly(value: string, days: number): string {
    const date = this.parseDateOnly(value);
    if (!date) return '';
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseDateOnly(value: string): Date | null {
    if (!value) return null;
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  /** applyFilters kept for backward compat — now just saves and navigates */
  private ensureContentFilterOptions(): void {
    if (FiltersComponent.activityCategoryCache) {
      this.activityCategoryOptions = [...FiltersComponent.activityCategoryCache];
      this.activityDifficultyOptions = [...(FiltersComponent.activityDifficultyCache ?? [])];
    }

    if (FiltersComponent.routeDifficultyCache) {
      this.routeDifficultyOptions = [...FiltersComponent.routeDifficultyCache];
      this.syncRouteLocationOptionsWithDestinations();
    }

    if (
      this.contentFilterOptionsRequested &&
      (this.activityCategoryOptions.length > 0 || this.activityDifficultyOptions.length > 0) &&
      (this.routeDifficultyOptions.length > 0 || this.routeCountryOptions.length > 0 || this.routeRegionOptions.length > 0)
    ) {
      return;
    }

    this.contentFilterOptionsRequested = true;
    this.loadContentFilterOptions();
  }

  private loadContentFilterOptions(): void {
    this.activitiesService.getActivities().subscribe({
      next: activities => {
        this.activityCategoryOptions = this.uniqueSorted(activities.map(item => item.category).filter(Boolean));
        this.activityDifficultyOptions = this.uniqueSorted(activities.map(item => item.difficulty || '').filter(Boolean));
        FiltersComponent.activityCategoryCache = [...this.activityCategoryOptions];
        FiltersComponent.activityDifficultyCache = [...this.activityDifficultyOptions];
      },
      error: () => {
        this.activityCategoryOptions = [...(FiltersComponent.activityCategoryCache ?? this.activityCategoryOptions)];
        this.activityDifficultyOptions = [...(FiltersComponent.activityDifficultyCache ?? this.activityDifficultyOptions)];
        this.contentFilterOptionsRequested = false;
      },
    });

    this.routesService.getRoutes().subscribe({
      next: routes => {
        this.routeDifficultyOptions = this.uniqueSorted(routes.map(item => item.difficulty || '').filter(Boolean));
        FiltersComponent.routeDifficultyCache = [...this.routeDifficultyOptions];
        this.syncRouteLocationOptionsWithDestinations();
      },
      error: () => {
        this.routeDifficultyOptions = [...(FiltersComponent.routeDifficultyCache ?? this.routeDifficultyOptions)];
        this.syncRouteLocationOptionsWithDestinations();
        this.contentFilterOptionsRequested = false;
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
    this.syncRouteLocationOptionsWithDestinations();
    const availableRegions = new Set(this.filteredDestinationRegionOptions);
    this.destinationFilters.regions = this.destinationFilters.regions.filter(region => availableRegions.has(region));
    this.destinationRegionsLoading = false;
  }

  private syncRouteLocationOptionsWithDestinations(): void {
    this.routeCountryOptions = [...this.destinationCountryOptions];
    this.routeRegionOptions = [...this.destinationRegionOptions];
    const availableRegions = new Set(this.filteredRouteRegionOptions);
    this.routeFilters.regions = this.routeFilters.regions.filter(region => availableRegions.has(region));
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
