import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FiltersComponent } from '../Filteri/filters.component';
import { NotificationBadgeComponent } from '../notifications/notification-badge.component';
import { AuthService } from '../services/auth.service';
import { GeolocationService, UserPosition } from '../services/geolocation.service';
import { Location, LocationService } from '../services/location.service';
import { RecommendationService } from '../services/recommendation.service';
import { UserService } from '../services/user.service';
import { TouristAnalyticsService } from '../services/tourist-analytics.service';
import { FilterStateService, FilterState } from '../services/filter-state.service';
import { RoutePlannerService } from '../services/route-planner.service';
import { TouristActivitiesService, TouristActivityItem } from '../services/tourist-activities.service';
import { TouristRouteItem, TouristRoutesService } from '../services/tourist-routes.service';
import { TouristPreferencesService } from '../services/tourist-preferences.service';
import { formatPostType } from '../utils/post-type.utils';
import { DragScrollDirective } from '../directives/drag-scroll.directive';
import { resolveBackendAssetUrl } from '../utils/backend-url.utils';
import { AuthRequiredModalComponent } from '../shared/auth-required-modal/auth-required-modal.component';
import { WORLD_COUNTRIES } from '../shared/data/world-countries';
import { MobileTouristNavComponent } from '../shared/mobile-tourist-nav.component';
import { DesktopFooterComponent } from '../shared/desktop-footer.component';

// Max cards shown per section row (prevents overcrowding)
const SECTION_LIMIT = 10;
type ExploreContentType = 'destinations' | 'activities' | 'routes';
type SortOption = 'recommended' | 'rating-desc' | 'distance-asc' | 'name-asc' | 'name-desc' | 'newest' | 'popular';
type ActivitySortOption = 'activity-name-asc' | 'activity-popular' | 'activity-category' | 'activity-difficulty';
type RouteSortOption = 'route-newest' | 'route-distance-asc' | 'route-distance-desc' | 'route-duration-asc' | 'route-name-asc' | 'route-difficulty';
type ExploreSortOption = SortOption | ActivitySortOption | RouteSortOption;

type SearchIntent = {
  normalizedQuery: string;
  terms: string[];
  categoryKeys: string[];
  nearMe: boolean;
  openNow: boolean;
  highRated: boolean;
  savedOnly: boolean;
  familyFriendly: boolean;
  timeSensitive: boolean;
  scenic: boolean;
  personalized: boolean;
  matchedPhrases: string[];
};

type DestinationSearchResult = Location & {
  searchReason?: string;
  searchBadges?: string[];
};

type ExploreSearchResult = {
  kind: ExploreContentType;
  id: number;
  title: string;
  subtitle: string;
  meta: string;
  color: string;
  image?: string;
  rating?: number | null;
  reason?: string;
  raw: Location | TouristActivityItem | TouristRouteItem;
};

interface PopularDestination {
  name: string;
  placeCount: number;
  imageUrl: string;
  topRating: number;
}

@Component({
  selector: 'app-location-list',
  standalone: true,
  imports: [CommonModule, FormsModule, FiltersComponent, NotificationBadgeComponent, DragScrollDirective, AuthRequiredModalComponent, MobileTouristNavComponent, DesktopFooterComponent],
  templateUrl: './location-list.component.html',
  styleUrls: ['./location-list.component.css']
})
export class LocationListComponent implements OnInit, OnDestroy {
  isMenuOpen = false;
  sortMenuOpen = false;
  isFiltersOpen = false;
  isTypeFiltersOpen = false;
  activeContentType: ExploreContentType = 'destinations';
  locations: Location[] = [];
  private allLocations: Location[] = [];
  activities: TouristActivityItem[] = [];
  private allActivities: TouristActivityItem[] = [];
  routes: TouristRouteItem[] = [];
  private allRoutes: TouristRouteItem[] = [];
  isLoading = false;
  errorMessage = '';
  activitiesErrorMessage = '';
  routesErrorMessage = '';
  feedbackMessage = '';
  showAuthPopup = false;
  authPopupMessage = 'Please log in to save locations, like places, and add items to your calendar.';
  private userPosition: UserPosition | null = null;
  sortOption: ExploreSortOption = 'recommended';
  readonly destinationSortOptions: { value: SortOption; label: string }[] = [
    { value: 'recommended', label: 'Recommended' },
    { value: 'rating-desc', label: 'Highest rated' },
    { value: 'distance-asc', label: 'Nearest' },
    { value: 'name-asc', label: 'Name A-Z' },
    { value: 'name-desc', label: 'Name Z-A' },
    { value: 'newest', label: 'Newest' },
    { value: 'popular', label: 'Most popular' },
  ];
  readonly activitySortOptions: { value: ActivitySortOption; label: string }[] = [
    { value: 'activity-name-asc', label: 'Name A-Z' },
    { value: 'activity-popular', label: 'Most used' },
    { value: 'activity-category', label: 'Category' },
    { value: 'activity-difficulty', label: 'Difficulty' },
  ];
  readonly routeSortOptions: { value: RouteSortOption; label: string }[] = [
    { value: 'route-newest', label: 'Newest' },
    { value: 'route-distance-asc', label: 'Shortest' },
    { value: 'route-distance-desc', label: 'Longest' },
    { value: 'route-duration-asc', label: 'Quickest' },
    { value: 'route-name-asc', label: 'Name A-Z' },
    { value: 'route-difficulty', label: 'Difficulty' },
  ];

  searchQuery = '';
  submittedSearchQuery = '';
  isSearchActive = false;
  searchResults: ExploreSearchResult[] = [];
  searchIntentSummary = '';
  searchFocused = false;
  showDropdown = false;

  readonly contentTypeTabs: { value: ExploreContentType; label: string }[] = [
    { value: 'destinations', label: 'Destinations' },
    { value: 'activities', label: 'Activities' },
    { value: 'routes', label: 'Routes' },
  ];

  // Section arrays
  nearYouLocations: Location[] = [];
  recommendedLocations: Location[] = [];
  topRatedLocations: Location[] = [];
  popularDestinations: PopularDestination[] = [];

  get allLocationCount(): number {
    return this.allLocations.length;
  }

  get discoverTitle(): string {
    return this.allLocationCount > 0
      ? `Discover ${this.allLocationCount} curated places`
      : 'Discover curated places';
  }

  // Filter state
  isFilterActive = false;
  filteredLocations: Location[] = [];
  activeFilterState: FilterState | null = null;
  private activeActivityFilter: { id: number | null; name: string } | null = null;
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

  get isFilterView(): boolean {
    return this.activeContentType === 'destinations' && this.isFilterActive && !this.isSearchActive;
  }

  get sortOptions(): { value: ExploreSortOption; label: string }[] {
    switch (this.activeContentType) {
      case 'activities': return this.activitySortOptions;
      case 'routes': return this.routeSortOptions;
      default: return this.destinationSortOptions;
    }
  }

  get activeContentLabel(): string {
    return this.contentTypeTabs.find(tab => tab.value === this.activeContentType)?.label ?? 'Destinations';
  }

  get activeSearchPlaceholder(): string {
    switch (this.activeContentType) {
      case 'activities': return 'Search activities...';
      case 'routes': return 'Search routes...';
      default: return 'Search locations...';
    }
  }

  get activeErrorMessage(): string {
    switch (this.activeContentType) {
      case 'activities': return this.activitiesErrorMessage;
      case 'routes': return this.routesErrorMessage;
      default: return this.errorMessage;
    }
  }

  get hasActiveTypeFilters(): boolean {
    if (this.activeContentType === 'destinations') {
      return this.isFilterActive || this.filterStateService.isActive();
    }
    if (this.activeContentType === 'activities') {
      return this.activityFilters.categories.length > 0
        || this.activityFilters.difficulties.length > 0
        || this.activityFilters.linkedOnly;
    }
    return this.routeFilters.difficulties.length > 0
      || this.routeFilters.countries.length > 0
      || this.routeFilters.regions.length > 0
      || !!this.routeFilters.distanceBand
      || !!this.routeFilters.durationBand;
  }

  get activityCategoryOptions(): string[] {
    return this.uniqueSorted(this.allActivities.map(item => item.category).filter(Boolean));
  }

  get activityDifficultyOptions(): string[] {
    return this.uniqueSorted(this.allActivities.map(item => item.difficulty || '').filter(Boolean));
  }

  get routeDifficultyOptions(): string[] {
    return this.uniqueSorted(this.allRoutes.map(item => item.difficulty || '').filter(Boolean));
  }

  get selectedSortLabel(): string {
    return this.sortOptions.find(option => option.value === this.sortOption)?.label ?? 'Sort';
  }

  get routeCountryOptions(): string[] {
    return [...WORLD_COUNTRIES];
  }

  get routeRegionOptions(): string[] {
    return this.uniqueSorted(this.destinationRegionItems.map(item => item.name));
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

  get destinationRegionItems(): { name: string; country: string }[] {
    const seen = new Set<string>();
    return this.allLocations
      .map(location => ({
        name: (location.regionName || '').trim(),
        country: (location.country || '').trim(),
      }))
      .filter(item => {
        if (!item.name) return false;
        const key = `${item.name}|${item.country}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  get availableSavedPostIds(): number[] {
    return Array.from(new Set(
      this.allLocations
        .filter(location => location.isSaved)
        .map(location => location.id)
        .filter(id => Number.isFinite(id))
    ));
  }

  get activeResultCount(): number {
    switch (this.activeContentType) {
      case 'activities': return this.activities.length;
      case 'routes': return this.routes.length;
      default: return this.locations.length;
    }
  }

  get isActivityFilterView(): boolean {
    return this.activeContentType === 'destinations'
      && !!this.activeActivityFilter
      && !this.isSearchActive
      && !this.isFilterView;
  }

  get activeActivityFilterLabel(): string {
    return this.activeActivityFilter?.name || 'Activity';
  }

  get searchNoResultsMessage(): string {
    const query = this.submittedSearchQuery || this.searchQuery.trim();
    switch (this.activeContentType) {
      case 'activities': return `No activities found for "${query}".`;
      case 'routes': return `No routes found for "${query}".`;
      default: return `No destinations found for "${query}".`;
    }
  }

  // Expanded section view (inline, no navigation)
  activeSectionView: 'near-you' | 'recommended' | 'top-rated' | null = null;

  get activeSectionLabel(): string {
    switch (this.activeSectionView) {
      case 'near-you': return 'Near you';
      case 'recommended': return 'Recommended for you';
      case 'top-rated': return 'Top rated';
      default: return '';
    }
  }

  get activeSectionLocations(): Location[] {
    const items = (() => {
      switch (this.activeSectionView) {
      case 'near-you': return this.nearYouLocations;
      case 'recommended': return this.recommendedLocations;
      case 'top-rated': return this.topRatedLocations;
      default: return [];
      }
    })();
    return this.applySort(items);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private locationService: LocationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private geolocationService: GeolocationService,
    private recommendationService: RecommendationService,
    private userService: UserService,
    private analyticsService: TouristAnalyticsService,
    private filterStateService: FilterStateService,
    private activitiesService: TouristActivitiesService,
    private routesService: TouristRoutesService,
    private routePlanner: RoutePlannerService,
    private preferences: TouristPreferencesService,
  ) { }

  ngOnInit(): void {
    this.readContentTypeFromRoute();
    this.readActivityFilterFromRoute();
    this.loadLocations();
    this.loadActivities();
    this.loadRoutes();
    this.loadUserPosition();
  }

  ngOnDestroy(): void {
    this.setPageScrollLock(false);
  }

  loadLocations(): void {
    this.isLoading = true;
    this.locationService.getLocations(1, 100).subscribe({
      next: (res) => {
        const decorated = this.decorateLocations(res.data);
        this.allLocations = this.applyGuestState(decorated);
        if (this.activeActivityFilter) {
          this.applyActivityFilter(this.activeActivityFilter);
        } else {
          this.refreshVisibleContent();
        }
        this.buildSections();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Greška pri učitavanju lokacija.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadActivities(): void {
    this.activitiesErrorMessage = '';
    this.activitiesService.getActivities().subscribe({
      next: (activities) => {
        this.allActivities = activities;
        this.refreshVisibleContent();
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err.status === 403 || err.status === 401) {
          this.activitiesErrorMessage = 'Activities require a registered account.';
        } else if (err.status === 404) {
          this.activitiesErrorMessage = 'Activities are not available on this server.';
        } else {
          this.activitiesErrorMessage = 'Could not load activities.';
        }
        this.allActivities = [];
        this.refreshVisibleContent();
        this.cdr.markForCheck();
      },
    });
  }

  loadRoutes(): void {
    this.routesErrorMessage = '';
    this.routesService.getRoutes().subscribe({
      next: (routes) => {
        this.allRoutes = routes;
        this.refreshVisibleContent();
        this.cdr.markForCheck();
      },
      error: () => {
        this.routesErrorMessage = 'Could not load routes.';
        this.allRoutes = [];
        this.refreshVisibleContent();
        this.cdr.markForCheck();
      },
    });
  }

  /** Called on every keystroke — updates live dropdown */
  retryActiveLoad(): void {
    if (this.activeContentType === 'activities') {
      this.loadActivities();
      return;
    }
    if (this.activeContentType === 'routes') {
      this.loadRoutes();
      return;
    }
    this.loadLocations();
  }

  onSearchInput(): void {
    const query = this.searchQuery.trim();
    if (!query) {
      this.resetSearchState();
      this.refreshVisibleContent();
      this.cdr.markForCheck();
      return;
    }
    this.isSearchActive = true;
    this.submittedSearchQuery = query;
    this.clearActivityFilterState();
    this.rebuildSearchResults();
    this.refreshVisibleContent();
    // Odmah filtriramo i listu ispod dropdowna — bez klikanja Search
    this.cdr.markForCheck();
  }

  /** Called when user clicks a dropdown suggestion */
  selectSearchResult(result: ExploreSearchResult): void {
    this.searchQuery = result.title || '';
    this.showDropdown = false;
    this.searchFocused = false;
    this.submittedSearchQuery = this.searchQuery.trim();
    this.isSearchActive = true;
    this.clearActivityFilterState();
    this.rebuildSearchResults();
    this.refreshVisibleContent();
    this.cdr.markForCheck();
  }

  /** Called when user clicks Search button or presses Enter */
  executeSearch(rawQuery = this.searchQuery): void {
    this.searchQuery = rawQuery;
    const query = rawQuery.trim();
    this.showDropdown = false;
    this.searchFocused = false;
    this.sortMenuOpen = false;
    if (!query) {
      this.clearSearch();
      return;
    }
    this.isSearchActive = true;
    this.clearActivityFilterState();
    this.submittedSearchQuery = query;
    this.rebuildSearchResults();
    this.refreshVisibleContent();
    this.cdr.markForCheck();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.resetSearchState();
    this.clearActivityFilterState();
    this.refreshVisibleContent();
    this.cdr.markForCheck();
  }

  /** Zatvaramo dropdown kad input izgubi fokus (malo kašnjenje zbog mousedown na stavci) */
  onSearchFocus(): void {
    this.searchFocused = true;
    this.rebuildSearchResults();
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.showDropdown = false;
      this.searchFocused = false;
      this.cdr.markForCheck();
    }, 150);
  }

  private applyGuestState(locations: Location[]): Location[] {
    if (this.authService.isLoggedIn) return locations;
    return locations.map(loc => ({
      ...loc,
      isLiked: false,
      isSaved: false,
    }));
  }

  onLike(loc: Location, event: Event): void {
    event.stopPropagation();

    if (!this.authService.isLoggedIn) {
      this.openAuthPopup('Please log in to like locations.');
      return;
    }

    const action$ = loc.isLiked ? this.locationService.unlikeLocation(loc.id) : this.locationService.likeLocation(loc.id);
    action$.subscribe({
      next: (res) => { loc.isLiked = !loc.isLiked; if (res.likeCount !== undefined) loc.likeCount = res.likeCount; this.showFeedback(loc.isLiked ? '❤️ Liked!' : 'Like removed'); this.cdr.markForCheck(); },
      error: (err) => { if (err.status === 401) this.router.navigate(['/login']); else console.error(err); }
    });
  }

  onSave(loc: Location, event: Event): void {
    event.stopPropagation();

    if (!this.authService.isLoggedIn) {
      this.openAuthPopup('Please log in to save locations.');
      return;
    }

    const action$ = loc.isSaved ? this.locationService.unsaveLocation(loc.id) : this.locationService.saveLocation(loc.id);
    action$.subscribe({
      next: (res) => { loc.isSaved = !loc.isSaved; if (res.saveCount !== undefined) loc.saveCount = res.saveCount; this.showFeedback(loc.isSaved ? '🔖 Saved!' : 'Removed from saved'); this.cdr.markForCheck(); },
      error: (err) => { if (err.status === 401) this.router.navigate(['/login']); else console.error(err); }
    });
  }

  toggleMenu(): void { this.isMenuOpen = !this.isMenuOpen; }
  goToNotifications(): void { this.router.navigate(['/notifications']); }
  goToMap(): void { this.router.navigate(['/map-home']); }
  openFilters(): void {
    if (this.activeContentType !== 'destinations') {
      this.isTypeFiltersOpen = true;
      this.setPageScrollLock(true);
      this.cdr.markForCheck();
      return;
    }
    this.isFiltersOpen = true;
    this.setPageScrollLock(true);
    this.cdr.markForCheck();
  }
  closeFilters(): void {
    this.isFiltersOpen = false;
    this.isTypeFiltersOpen = false;
    this.setPageScrollLock(false);
    this.cdr.markForCheck();
  }

  onFiltersApplied(state: FilterState): void {
    // NE zatvaramo panel — korisnik sam zatvara sa X
    // Odmah primeni filtere reaktivno
    this.activeFilterState = state;
    const hasActiveFilter =
      state.activeCategories.length > 0 ||
      (state.destinationCountries?.length ?? 0) > 0 ||
      (state.destinationRegions?.length ?? 0) > 0 ||
      state.minRating > 0 ||
      state.openNow ||
      state.showOnlySaved ||
      (state.radius > 0);

    if (hasActiveFilter) {
      this.filteredLocations = this.applyFiltersToLocations(this.allLocations, state);
      this.isFilterActive = true;
      this.activeSectionView = null;
    } else {
      this.filteredLocations = [];
      this.isFilterActive = false;
    }
    this.refreshVisibleContent();
    this.cdr.markForCheck();
  }

  clearFilterView(): void {
    this.isFilterActive = false;
    this.filteredLocations = [];
    this.activeFilterState = null;
    this.filterStateService.clear();
    this.refreshVisibleContent();
    this.cdr.markForCheck();
  }

  private applyFiltersToLocations(locations: Location[], state: FilterState): Location[] {
    return this.applySort(locations.filter(loc => {
      // Kategorija filter
      if (state.activeCategories.length > 0) {
        const key = (loc.postType || (loc as any).category || '').toLowerCase().replace(/\s+/g, '_');
        if (!state.activeCategories.includes(key)) return false;
      }
      if ((state.destinationCountries?.length ?? 0) > 0 && !state.destinationCountries!.includes(loc.country || '')) {
        return false;
      }
      if ((state.destinationRegions?.length ?? 0) > 0 && !state.destinationRegions!.includes(loc.regionName || '')) {
        return false;
      }
      // Rating filter
      if (state.minRating > 0 && (loc.avgRating || 0) < state.minRating) return false;
      if (state.openNow && !this.isLocationOpen(loc)) return false;
      if (state.showOnlySaved && state.savedPostIds?.length && !state.savedPostIds.includes(loc.id)) return false;
      // Radius filter
      if (state.radius > 0 && this.userPosition) {
        const coords = this.getLocationCoordinates(loc);
        if (coords) {
          const dist = this.geolocationService.haversineKm(this.userPosition, coords);
          if (dist > state.radius) return false;
        }
      }
      return true;
    }));
  }

  onSortChanged(): void {
    this.ensureSortForActiveType();
    this.refreshVisibleContent();
    this.filteredLocations = this.applySort(this.filteredLocations);
    this.nearYouLocations = this.applySort(this.nearYouLocations).slice(0, SECTION_LIMIT);
    this.recommendedLocations = this.applySort(this.recommendedLocations).slice(0, SECTION_LIMIT);
    this.topRatedLocations = this.applySort(this.topRatedLocations).slice(0, SECTION_LIMIT);
    this.cdr.markForCheck();
  }

  openSection(section: 'near-you' | 'recommended' | 'top-rated'): void {
    this.activeSectionView = section;
    this.isFilterActive = false; // zatvaramo filter view kad se otvara sekcija
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.markForCheck();
  }

  viewDetails(id: number): void { this.router.navigate(['/location-details', id]); }

  closeSection(): void {
    this.activeSectionView = null;
    this.cdr.markForCheck();
  }

  openDestination(destination: PopularDestination): void {
    this.searchQuery = destination.name;
    this.submittedSearchQuery = destination.name;
    this.isSearchActive = true;
    this.isFilterActive = false;
    this.activeSectionView = null;
    this.showDropdown = false;
    this.sortMenuOpen = false;
    this.locations = this.applySort(this.allLocations.filter(loc => this.getDestinationName(loc) === destination.name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.cdr.markForCheck();
  }

  formatDistance(distanceKm?: number | null): string { return this.geolocationService.formatDistanceKm(distanceKm); }

  getFirstImage(loc: Partial<Location> & { images?: string | string[] }): string {
    if (!loc?.images) return 'assets/Budva.jpg';
    let firstImg = '';
    if (typeof loc.images === 'string') {
      try { const p = JSON.parse(loc.images) as string[]; firstImg = p[0] || ''; } catch { firstImg = loc.images; }
    } else if (Array.isArray(loc.images) && loc.images.length > 0) { firstImg = loc.images[0]; }
    if (!firstImg) return 'assets/Budva.jpg';
    return resolveBackendAssetUrl(firstImg, 'assets/Budva.jpg');
  }

  getCategoryColor(postType?: string | null): string {
    const colors: Record<string, string> = {
      accommodation: '#3b82f6', restaurant: '#ef4444', club: '#8b5cf6',
      cultural_site: '#f59e0b', monument: '#d97706', sports_facility: '#22c55e',
      event: '#ec4899', attraction: '#10b981', shop: '#f97316',
    };
    return colors[(postType || '').toLowerCase().replace(/\s+/g, '_')] || '#6b7280';
  }

  formatPostType(type?: string | null): string { return formatPostType(type); }

  getActivityTags(loc: Partial<Location>, limit = 3): string[] {
    const rawTags = (loc as any).tagNames ?? (loc as any).TagNames ?? [];
    const tags = Array.isArray(rawTags)
      ? rawTags
      : String(rawTags || '').split(/[;,]/);

    return Array.from(new Set(tags
      .map(tag => String(tag).trim())
      .filter(Boolean)))
      .slice(0, limit);
  }

  getTagList(tags?: string | null): string[] {
    if (!tags) return [];
    return tags
      .split(/[;,]/)
      .map(tag => tag.trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  get sectionTitle(): string {
    if (this.isSearchActive) return `Results for "${this.submittedSearchQuery || this.searchQuery}"`;
    return 'Explore';
  }

  private buildSections(): void {
    const pos = this.userPosition
      ? [this.userPosition.lat, this.userPosition.lng] as [number, number]
      : null;

    // 1. Near You: sorted by distance
    const withDistance = [...this.allLocations]
      .filter(l => l.distanceKm != null)
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    const withoutDistance = this.allLocations.filter(l => l.distanceKm == null);
    this.nearYouLocations = [...withDistance, ...withoutDistance].slice(0, SECTION_LIMIT);

    // 2. Recommended for You: personalized recommendations
    try {
      const calendarItems: any[] = [];
      const analytics = this.analyticsService.getRecentEvents();
      const recs = this.recommendationService.buildPersonalizedRecommendations(
        this.allLocations, null, [], calendarItems, analytics,
        { userPosition: pos, limit: SECTION_LIMIT }
      );
      this.recommendedLocations = recs.map(r => r.location).slice(0, SECTION_LIMIT);
    } catch {
      // Fallback: show high-rated ones
      this.recommendedLocations = [...this.allLocations]
        .filter(l => l.avgRating != null)
        .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
        .slice(0, SECTION_LIMIT);
    }

    // 3. Top Rated: global recommendations by rating & engagement
    try {
      const global = this.recommendationService.buildGlobalRecommendations(
        this.allLocations, { userPosition: pos, limit: SECTION_LIMIT }
      );
      this.topRatedLocations = global.map(r => r.location).slice(0, SECTION_LIMIT);
    } catch {
      this.topRatedLocations = [...this.allLocations]
        .filter(l => l.avgRating != null)
        .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
        .slice(0, SECTION_LIMIT);
    }

    if (this.sortOption !== 'recommended') {
      this.nearYouLocations = this.applySort(this.nearYouLocations).slice(0, SECTION_LIMIT);
      this.recommendedLocations = this.applySort(this.recommendedLocations).slice(0, SECTION_LIMIT);
      this.topRatedLocations = this.applySort(this.topRatedLocations).slice(0, SECTION_LIMIT);
    }

    this.buildPopularDestinations();
    this.cdr.markForCheck();
  }

  private buildPopularDestinations(): void {
    const groups = new Map<string, Location[]>();

    this.allLocations.forEach(loc => {
      const name = this.getDestinationName(loc);
      if (!name) return;
      const items = groups.get(name) ?? [];
      items.push(loc);
      groups.set(name, items);
    });

    this.popularDestinations = Array.from(groups.entries())
      .map(([name, items]) => {
        const ranked = [...items].sort((a, b) => this.getPopularityScore(b) - this.getPopularityScore(a));
        const top = ranked[0];

        return {
          name,
          placeCount: items.length,
          imageUrl: this.getFirstImage(top),
          topRating: top?.avgRating ?? top?.rating ?? 0,
        };
      })
      .filter(destination => destination.placeCount > 0)
      .sort((a, b) => (b.topRating * 4 + b.placeCount) - (a.topRating * 4 + a.placeCount))
      .slice(0, 5);
  }

  private getPopularityScore(loc: Location): number {
    return ((loc.avgRating ?? loc.rating ?? 0) * 10) +
      (loc.reviewCount ?? 0) +
      (loc.likeCount ?? 0) +
      (loc.saveCount ?? 0) +
      ((loc.viewCount ?? 0) / 10);
  }

  private getDestinationName(loc: Partial<Location>): string {
    const regionName = (loc.regionName || '').trim();
    if (regionName) return regionName;

    const addressPart = (loc.address || '')
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .pop();

    return addressPart || '';
  }

  private showFeedback(msg: string): void {
    this.feedbackMessage = msg;
    setTimeout(() => (this.feedbackMessage = ''), 2500);
  }

  openAuthPopup(message = 'Please log in to continue.'): void {
    this.authPopupMessage = message;
    this.showAuthPopup = true;
    this.cdr.markForCheck();
  }

  closeAuthPopup(): void {
    this.showAuthPopup = false;
    this.cdr.markForCheck();
  }

  goToLogin(): void {
    this.closeAuthPopup();
    this.router.navigate(['/login']);
  }

  goToSaved(): void {
    if (!this.authService.isLoggedIn) {
      this.openAuthPopup('Please log in to view and manage saved locations.');
      return;
    }
    this.router.navigate(['/saved']);
  }

  goToCalendar(): void {
    if (!this.authService.isLoggedIn) {
      this.openAuthPopup('Please log in to view your calendar.');
      return;
    }
    this.router.navigate(['/calendar']);
  }

  goToAccount(): void {
    this.router.navigate(['/account']);
  }

  private setPageScrollLock(locked: boolean): void {
    document.body.style.overflow = locked ? 'hidden' : '';
  }

  private loadUserPosition(): void {
    void this.geolocationService.requestCurrentPosition().then((position) => {
      if (!position) return;
      this.userPosition = position;
      this.allLocations = this.decorateLocations(this.allLocations);
      if (this.activeActivityFilter) {
        this.applyActivityFilter(this.activeActivityFilter);
      } else if (!this.isSearchActive) {
        this.refreshVisibleContent();
      }
      if (this.isSearchActive) {
        this.rebuildSearchResults();
        this.refreshVisibleContent();
      }
      this.buildSections();
      this.cdr.markForCheck();
    });
  }

  private readActivityFilterFromRoute(): void {
    const params = this.route.snapshot.queryParamMap;
    const name = (params.get('activityTag') || '').trim();
    const idParam = params.get('activityTagId');
    const parsedId = idParam != null ? Number(idParam) : NaN;
    if (!name && !Number.isFinite(parsedId)) return;

    this.activeContentType = 'destinations';
    this.activeActivityFilter = {
      id: Number.isFinite(parsedId) ? parsedId : null,
      name,
    };
  }

  private applyActivityFilter(filter: { id: number | null; name: string }): void {
    this.searchQuery = '';
    this.submittedSearchQuery = '';
    this.isSearchActive = false;
    this.showDropdown = false;
    this.searchResults = [];
    this.searchIntentSummary = '';
    this.searchFocused = false;
    this.isFilterActive = false;
    this.filteredLocations = [];
    this.activeSectionView = null;
    this.locations = this.applySort(this.allLocations.filter(loc => this.matchesActivityFilter(loc, filter)));
  }

  private matchesActivityFilter(loc: Location, filter: { id: number | null; name: string }): boolean {
    const ids = ((loc as any).tagIds ?? (loc as any).TagIds ?? []) as unknown[];
    if (filter.id != null && ids.some(id => Number(id) === filter.id)) return true;

    if (!filter.name) return false;
    const target = this.normalizeSearchTerm(filter.name);
    return this.getActivityTags(loc, 20).some(tag => this.normalizeSearchTerm(tag) === target);
  }

  private normalizeSearchTerm(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private clearActivityFilterState(): void {
    const hadActivityFilter = !!this.activeActivityFilter;
    this.activeActivityFilter = null;
    if (!hadActivityFilter) return;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { activityTagId: null, activityTag: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private decorateLocations(locations: Location[]): Location[] {
    if (!this.userPosition) return locations.map(l => ({ ...l, distanceKm: null }));
    return [...locations]
      .map(l => {
        const c = this.getLocationCoordinates(l);
        return { ...l, distanceKm: c ? this.geolocationService.haversineKm(this.userPosition!, c) : null };
      })
      .sort((a, b) => ((a as any).distanceKm ?? Infinity) - ((b as any).distanceKm ?? Infinity));
  }

  private applySort(locations: Location[]): Location[] {
    const sorted = [...locations];
    switch (this.sortOption) {
      case 'rating-desc':
        return sorted.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
      case 'distance-asc':
        return sorted.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
      case 'name-asc':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'name-desc':
        return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      case 'newest':
        return sorted.sort((a, b) =>
          new Date(b.createdAt || b.publishedAt || 0).getTime() -
          new Date(a.createdAt || a.publishedAt || 0).getTime()
        );
      case 'popular':
        return sorted.sort((a, b) =>
          ((b.viewCount ?? 0) + (b.likeCount ?? 0) + (b.saveCount ?? 0)) -
          ((a.viewCount ?? 0) + (a.likeCount ?? 0) + (a.saveCount ?? 0))
        );
      default:
        return sorted;
    }
  }

  setActiveContentType(type: ExploreContentType): void {
    if (this.activeContentType === type) return;

    this.activeContentType = type;
    this.activeSectionView = null;
    this.isFiltersOpen = false;
    this.isTypeFiltersOpen = false;
    this.sortMenuOpen = false;
    this.setPageScrollLock(false);
    this.clearSearch();
    this.ensureSortForActiveType();
    this.refreshVisibleContent();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { type },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  toggleActivityFilter(group: 'categories' | 'difficulties', value: string): void {
    const list = this.activityFilters[group];
    this.activityFilters[group] = list.includes(value)
      ? list.filter(item => item !== value)
      : [...list, value];
    this.refreshVisibleContent();
    this.cdr.markForCheck();
  }

  toggleRouteFilter(group: 'difficulties' | 'countries' | 'regions', value: string): void {
    if (!value) return;

    const list = this.routeFilters[group];
    this.routeFilters[group] = list.includes(value)
      ? list.filter(item => item !== value)
      : [...list, value];

    if (group === 'countries') {
      const availableRegions = new Set(this.filteredRouteRegionOptions);
      this.routeFilters.regions = this.routeFilters.regions.filter(region => availableRegions.has(region));
    }

    this.refreshVisibleContent();
    this.cdr.markForCheck();
  }

  setRouteDistanceBand(value: string): void {
    this.routeFilters.distanceBand = this.routeFilters.distanceBand === value ? '' : value;
    this.refreshVisibleContent();
    this.cdr.markForCheck();
  }

  setRouteDurationBand(value: string): void {
    this.routeFilters.durationBand = this.routeFilters.durationBand === value ? '' : value;
    this.refreshVisibleContent();
    this.cdr.markForCheck();
  }

  toggleLinkedActivitiesOnly(): void {
    this.activityFilters.linkedOnly = !this.activityFilters.linkedOnly;
    this.refreshVisibleContent();
    this.cdr.markForCheck();
  }

  clearTypeFilters(): void {
    if (this.activeContentType === 'activities') {
      this.activityFilters = { categories: [], difficulties: [], linkedOnly: false };
    } else if (this.activeContentType === 'routes') {
      this.routeFilters = { difficulties: [], countries: [], regions: [], distanceBand: '', durationBand: '' };
    }
    this.refreshVisibleContent();
    this.cdr.markForCheck();
  }

  openActivity(activity: TouristActivityItem): void {
    this.activeContentType = 'destinations';
    this.activeActivityFilter = { id: activity.id, name: activity.name };
    this.applyActivityFilter(this.activeActivityFilter);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { type: 'destinations', activityTagId: activity.id, activityTag: activity.name },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.cdr.markForCheck();
  }

  openRouteOnMap(route: TouristRouteItem): void {
    if (route.waypoints.length === 0) return;

    this.routePlanner.replaceStops(
      this.routesService.routeToPlannerStops(route),
      {
        plannerMode: true,
        scenicMode: false,
        travelMode: this.routePlanner.snapshot.travelMode || this.preferences.snapshot.preferredTravelMode || 'driving',
        sourceRouteId: route.id,
      },
    );
    this.router.navigate(['/map-home']);
  }

  getRouteFirstImage(route: TouristRouteItem): string {
    return this.getFirstImage({ images: route.images || [] });
  }

  getActivityColor(activity: TouristActivityItem): string {
    return activity.color || '#22c55e';
  }

  getActivityCategoryFilterColor(value: string): string {
    const normalized = this.normalizeFilterColorKey(value);
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
    const normalized = this.normalizeFilterColorKey(value);
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

  getStableFilterColor(value: string): string {
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#ef4444'];
    const key = this.normalizeFilterColorKey(value);
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
    return palette[Math.abs(hash) % palette.length];
  }

  selectedSummary(values: string[], fallback: string, formatter: (value: string) => string = value => value): string {
    return values.length ? values.map(formatter).join(', ') : fallback;
  }

  private normalizeFilterColorKey(value: string): string {
    return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  formatRouteDifficulty(value?: string | null): string {
    if (!value) return 'Route';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  formatActivityCategory(value?: string | null): string {
    if (!value) return 'Activity';
    return value
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  private readContentTypeFromRoute(): void {
    const type = this.route.snapshot.queryParamMap.get('type');
    if (type === 'activities' || type === 'routes' || type === 'destinations') {
      this.activeContentType = type;
      this.ensureSortForActiveType();
    }
  }

  private ensureSortForActiveType(): void {
    const allowed = this.sortOptions.map(option => option.value);
    if (allowed.includes(this.sortOption)) return;

    this.sortOption = this.activeContentType === 'activities'
      ? 'activity-name-asc'
      : this.activeContentType === 'routes'
        ? 'route-newest'
        : 'recommended';
  }

  private resetSearchState(): void {
    this.submittedSearchQuery = '';
    this.isSearchActive = false;
    this.searchResults = [];
    this.searchIntentSummary = '';
    this.showDropdown = false;
  }

  private rebuildSearchResults(): void {
    const query = this.searchQuery.trim();
    if (!query) {
      this.resetSearchState();
      return;
    }

    this.searchResults = this.buildSearchResults(query);
    this.searchIntentSummary = this.describeSearchForCurrentType(query, this.searchResults.length);
    this.showDropdown = this.searchFocused && this.searchResults.length > 0;
  }

  private refreshVisibleContent(): void {
    if (this.isSearchActive && this.searchQuery.trim()) {
      this.rebuildSearchResults();
    }

    if (this.activeContentType === 'destinations') {
      if (this.activeActivityFilter) {
        this.locations = this.applySort(this.allLocations.filter(loc => this.matchesActivityFilter(loc, this.activeActivityFilter!)));
        return;
      }

      const base = this.getDestinationFilterBase();
      this.locations = this.isSearchActive && this.searchQuery.trim()
        ? this.applySort(this.searchResults
            .filter(result => result.kind === 'destinations')
            .map(result => result.raw as Location))
        : this.applySort(base);
      return;
    }

    if (this.activeContentType === 'activities') {
      const base = this.getActivityFilterBase();
      this.activities = this.isSearchActive && this.searchQuery.trim()
        ? this.sortActivities(this.searchResults
            .filter(result => result.kind === 'activities')
            .map(result => result.raw as TouristActivityItem))
        : this.sortActivities(base);
      return;
    }

    const base = this.getRouteFilterBase();
    this.routes = this.isSearchActive && this.searchQuery.trim()
      ? this.sortRoutes(this.searchResults
          .filter(result => result.kind === 'routes')
          .map(result => result.raw as TouristRouteItem))
      : this.sortRoutes(base);
  }

  private getDestinationFilterBase(): Location[] {
    if (this.activeFilterState && this.isFilterActive) {
      return this.applyFiltersToLocations(this.allLocations, this.activeFilterState);
    }
    return [...this.allLocations];
  }

  private getActivityFilterBase(): TouristActivityItem[] {
    return this.allActivities.filter(activity => {
      if (this.activityFilters.categories.length > 0 && !this.activityFilters.categories.includes(activity.category)) {
        return false;
      }
      if (this.activityFilters.difficulties.length > 0 && !this.activityFilters.difficulties.includes(activity.difficulty || '')) {
        return false;
      }
      if (this.activityFilters.linkedOnly && !(activity.linkedPosts && activity.linkedPosts > 0)) {
        return false;
      }
      return true;
    });
  }

  private getRouteFilterBase(): TouristRouteItem[] {
    return this.allRoutes.filter(route => {
      if (this.routeFilters.difficulties.length > 0 && !this.routeFilters.difficulties.includes(route.difficulty || '')) {
        return false;
      }
      if (this.routeFilters.countries.length > 0 && !this.routeFilters.countries.includes(route.countryName || '')) {
        return false;
      }
      if (this.routeFilters.regions.length > 0 && !this.routeFilters.regions.includes(route.regionName || '')) {
        return false;
      }
      if (this.routeFilters.distanceBand && !this.routeMatchesDistanceBand(route, this.routeFilters.distanceBand)) {
        return false;
      }
      if (this.routeFilters.durationBand && !this.routeMatchesDurationBand(route, this.routeFilters.durationBand)) {
        return false;
      }
      return true;
    });
  }

  private buildSearchResults(query: string): ExploreSearchResult[] {
    if (this.activeContentType === 'activities') {
      return this.getActivitySearchResults(query);
    }
    if (this.activeContentType === 'routes') {
      return this.getRouteSearchResults(query);
    }
    return this.getDestinationSearchResults(query);
  }

  private getDestinationSearchResults(query: string): ExploreSearchResult[] {
    const intent = this.parseSearchIntent(query);
    if (!intent.normalizedQuery) return [];
    if (intent.terms.length === 0 && !this.hasExplicitDestinationIntent(intent)) return [];

    return this.getDestinationFilterBase()
      .map(loc => this.buildDestinationSearchMatch(loc, intent))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(item => ({
        kind: 'destinations',
        id: item.loc.id,
        title: item.loc.title,
        subtitle: item.loc.regionName || this.formatPostType(item.loc.postType || item.loc.category),
        meta: this.formatPostType(item.loc.postType || item.loc.category),
        color: this.getCategoryColor(item.loc.postType || item.loc.category),
        image: this.getFirstImage(item.loc),
        rating: item.loc.avgRating || item.loc.rating || null,
        reason: item.reason,
        raw: {
          ...item.loc,
          searchReason: item.reason,
          searchBadges: item.badges,
        } as DestinationSearchResult,
      }));
  }

  private getActivitySearchResults(query: string): ExploreSearchResult[] {
    const terms = this.expandSearchTerms(this.tokenizeSearch(query));
    if (terms.length === 0) return [];

    return this.getActivityFilterBase()
      .map(activity => {
        const fields = [
          activity.name,
          activity.category,
          activity.description,
          activity.difficulty,
          activity.duration,
          activity.tags,
          activity.locationName,
        ].map(value => this.normalizeSearchValue(value));
        const textScore = this.scoreTextFields(terms, fields, this.normalizeSearchValue(activity.name));
        const score = textScore > 0
          ? textScore + Math.min(12, activity.viewCount ?? 0)
          : 0;
        return { activity, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ activity }) => ({
        kind: 'activities',
        id: activity.id,
        title: activity.name,
        subtitle: this.formatActivityCategory(activity.category),
        meta: [activity.locationName, activity.difficulty, activity.duration].filter(Boolean).join(' · '),
        color: this.getActivityColor(activity),
        reason: activity.locationName ? `Matched activity data near ${activity.locationName}.` : 'Matched activity name, category or tags.',
        raw: activity,
      }));
  }

  private getRouteSearchResults(query: string): ExploreSearchResult[] {
    const terms = this.expandSearchTerms(this.tokenizeSearch(query));
    if (terms.length === 0) return [];

    return this.getRouteFilterBase()
      .map(route => {
        const fields = [
          route.name,
          route.description,
          route.difficulty,
          route.regionName,
          ...route.waypoints.map(point => point.name || ''),
        ].map(value => this.normalizeSearchValue(value));
        const textScore = this.scoreTextFields(terms, fields, this.normalizeSearchValue(route.name));
        const score = textScore > 0
          ? textScore + Math.max(0, 20 - (route.distanceKm || 0) / 2)
          : 0;
        return { route, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ route }) => ({
        kind: 'routes',
        id: route.id,
        title: route.name,
        subtitle: route.regionName || this.formatRouteDifficulty(route.difficulty),
        meta: [
          route.distanceKm ? `${route.distanceKm.toFixed(1)} km` : '',
          route.durationMin ? `${route.durationMin} min` : '',
          this.formatRouteDifficulty(route.difficulty),
        ].filter(Boolean).join(' · '),
        color: '#0ea5e9',
        image: this.getRouteFirstImage(route),
        reason: route.regionName ? `Matched route data in ${route.regionName}.` : 'Matched route name, description or waypoints.',
        raw: route,
      }));
  }

  private buildDestinationSearchMatch(loc: Location, intent: SearchIntent): { loc: Location; score: number; reason: string; badges: string[] } {
    const terms = intent.terms;
    const fields = [
      loc.title,
      loc.regionName,
      loc.country,
      loc.address,
      loc.description,
      loc.postType,
      loc.category,
      ...this.getActivityTags(loc, 20),
    ].filter(Boolean).map(value => this.normalizeSearchText(String(value)));

    let textScore = 0;
    let score = 0;
    const badges: string[] = [];
    const title = this.normalizeSearchText(loc.title || '');
    const typeKey = this.normalizeTypeKey(loc.postType || loc.category || '');
    const rating = Number(loc.avgRating || loc.rating || 0);
    const categoryMatch = intent.categoryKeys.includes(typeKey);
    const isOpenNow = this.isLocationOpen(loc);
    const openNowMatch = intent.openNow && isOpenNow;
    const nearMeMatch = intent.nearMe && loc.distanceKm != null;
    const familyFriendlyMatch = intent.familyFriendly && fields.some(field => /(family|kids|children|porodic|deca|djeca|mirno|park)/.test(field));
    const timeSensitiveMatch = intent.timeSensitive && (typeKey === 'event' || isOpenNow);
    const scenicMatch = intent.scenic && fields.some(field => /(view|scenic|panorama|vidikovac|nature|priroda|sunset|zalazak|photo|foto)/.test(field));
    const personalTokens = this.preferences.snapshot.contentPreferences
      .map(value => this.normalizeSearchText(value));
    const personalizedMatch = intent.personalized
      && personalTokens.some(token => fields.some(field => field.includes(token)));
    const highRatedMatch = intent.highRated && rating >= 4;

    for (const term of terms) {
      if (title === term) textScore += 120;
      else if (title.startsWith(term)) textScore += 80;
      else if (title.includes(term)) textScore += 55;

      if (fields.some(field => field.split(/\s+/).some(part => part.startsWith(term)))) textScore += 25;
      if (fields.some(field => field.includes(term))) textScore += 15;
    }

    const hasPrimaryMatch = textScore > 0
      || categoryMatch
      || openNowMatch
      || nearMeMatch
      || familyFriendlyMatch
      || timeSensitiveMatch
      || scenicMatch
      || personalizedMatch
      || highRatedMatch;

    if (!hasPrimaryMatch) {
      return { loc, score: 0, reason: '', badges: [] };
    }

    score += textScore;

    if (categoryMatch) {
      score += terms.length > 0 ? 70 : 45;
      badges.push(this.formatPostType(loc.postType || loc.category));
    }

    if (intent.openNow) {
      if (!isOpenNow) return { loc, score: 0, reason: '', badges: [] };
      score += 35;
      badges.push('Open now');
    }

    if (intent.highRated) {
      if (rating < 4) score -= 20;
      score += Math.min(35, rating * 7);
      badges.push('Top rated');
    }

    if (intent.nearMe) {
      if (loc.distanceKm != null) {
        score += Math.max(0, 45 - loc.distanceKm * 7);
        if (loc.distanceKm <= 2) badges.push('Very close');
        else if (loc.distanceKm <= 8) badges.push('Nearby');
      }
    }

    if (familyFriendlyMatch) {
      score += 25;
      badges.push('Family fit');
    }

    if (timeSensitiveMatch) {
      score += 20;
      badges.push(typeKey === 'event' ? 'Event' : 'Good timing');
    }

    if (scenicMatch) {
      score += 22;
      badges.push('Scenic');
    }

    if (personalizedMatch) {
      score += 18;
      badges.push('For you');
    }

    if (loc.distanceKm != null) score += Math.max(0, 10 - loc.distanceKm);
    score += Math.min(10, rating);

    const uniqueBadges = Array.from(new Set(badges.filter(Boolean))).slice(0, 3);
    return {
      loc,
      score,
      reason: this.getSearchReason(loc, intent, uniqueBadges),
      badges: uniqueBadges,
    };
  }

  private parseSearchIntent(query: string): SearchIntent {
    const normalizedQuery = this.normalizeSearchText(query);
    const phrases: string[] = [];
    const categoryKeys = new Set<string>();

    const phraseIncludes = (...values: string[]) => values.some(value => normalizedQuery.includes(value));
    const addCategory = (key: string, ...values: string[]) => {
      if (phraseIncludes(...values)) {
        categoryKeys.add(key);
        phrases.push(this.formatPostType(key));
      }
    };

    addCategory('attraction', 'beach', 'plaza', 'more', 'nature', 'priroda', 'attraction', 'znamenitost', 'viewpoint', 'vidikovac');
    addCategory('restaurant', 'restaurant', 'restoran', 'food', 'hrana', 'dinner', 'lunch', 'kafa', 'cafe');
    addCategory('cultural_site', 'culture', 'cultural', 'kultura', 'museum', 'muzej', 'history', 'istorija');
    addCategory('monument', 'monument', 'spomenik');
    addCategory('club', 'nightlife', 'club', 'bar', 'party', 'nocni', 'nocu');
    addCategory('sports_facility', 'sport', 'activity', 'aktivnost', 'hike', 'walk', 'cycling', 'adventure');
    addCategory('event', 'event', 'dogadjaj', 'festival', 'concert', 'koncert', 'tonight', 'veceras', 'weekend', 'vikend');
    addCategory('accommodation', 'hotel', 'accommodation', 'smestaj', 'smjestaj', 'stay');
    addCategory('shop', 'shop', 'shopping', 'prodavnica', 'market');
    addCategory('other', 'other', 'ostalo', 'misc', 'miscellaneous');

    const nearMe = phraseIncludes('near me', 'nearby', 'close', 'blizu', 'u blizini', 'oko mene');
    const openNow = phraseIncludes('open now', 'opened', 'otvoreno', 'radi sada', 'sad otvoreno');
    const highRated = phraseIncludes('best', 'top', 'rated', 'najbolje', 'najbolji', 'visoko ocen', 'visoko ocjen');
    const savedOnly = phraseIncludes('saved', 'sacuvano', 'sacuvane', 'omiljeno', 'favorites', 'favourites');
    const familyFriendly = phraseIncludes('family', 'kids', 'children', 'porodic', 'deca', 'djeca');
    const timeSensitive = phraseIncludes('today', 'tonight', 'tomorrow', 'weekend', 'danas', 'veceras', 'sutra', 'vikend');
    const scenic = phraseIncludes('scenic', 'view', 'photo', 'foto', 'panorama', 'vidikovac', 'zalazak');
    const personalized = phraseIncludes('for me', 'recommended', 'recommendation', 'preporuci', 'preporuke', 'za mene');

    const stopWords = new Set([
      'near', 'me', 'nearby', 'open', 'now', 'best', 'top', 'rated', 'for', 'today', 'tonight',
      'tomorrow', 'weekend', 'blizu', 'mene', 'sada', 'sad', 'najbolje', 'najbolji', 'danas',
      'veceras', 'sutra', 'vikend', 'preporuci', 'preporuke', 'saved', 'sacuvano', 'sacuvane',
    ]);
    const terms = normalizedQuery
      .split(/\s+/)
      .filter(term => term.length > 1 && !stopWords.has(term));

    return {
      normalizedQuery,
      terms,
      categoryKeys: Array.from(categoryKeys),
      nearMe,
      openNow,
      highRated,
      savedOnly,
      familyFriendly,
      timeSensitive,
      scenic,
      personalized,
      matchedPhrases: phrases,
    };
  }

  private hasExplicitDestinationIntent(intent: SearchIntent): boolean {
    return intent.categoryKeys.length > 0
      || intent.nearMe
      || intent.openNow
      || intent.highRated
      || intent.savedOnly
      || intent.familyFriendly
      || intent.timeSensitive
      || intent.scenic
      || intent.personalized;
  }

  private describeSearchForCurrentType(query: string, count: number): string {
    if (count <= 0) return '';

    if (this.activeContentType !== 'destinations') {
      return `${count} ${count === 1 ? 'result' : 'results'} for "${query}".`;
    }

    const intent = this.parseSearchIntent(query);
    const parts = [
      intent.nearMe ? 'near you' : '',
      intent.openNow ? 'open now' : '',
      intent.highRated ? 'high rated' : '',
      intent.timeSensitive ? 'time-aware' : '',
      intent.scenic ? 'scenic' : '',
      intent.personalized ? 'personalized' : '',
      ...intent.matchedPhrases,
    ].filter(Boolean);

    if (parts.length === 0) {
      return `${count} result${count === 1 ? '' : 's'} ranked by text, rating and context.`;
    }

    return `${count} result${count === 1 ? '' : 's'} for ${Array.from(new Set(parts)).slice(0, 4).join(', ')}.`;
  }

  private getSearchReason(loc: Location, intent: SearchIntent, badges: string[]): string {
    if (badges.includes('Very close') || badges.includes('Nearby')) {
      return `${this.formatDistance(loc.distanceKm)} away, matched your nearby intent.`;
    }
    if (badges.includes('Open now')) return 'Available now based on opening hours.';
    if (badges.includes('For you')) return 'Matches your interests and recent context.';
    if (badges.includes('Top rated')) return `Rated ${(loc.avgRating || loc.rating || 0).toFixed(1)} by travelers.`;
    if (intent.categoryKeys.length > 0) return `Matches ${this.formatPostType(loc.postType || loc.category)}.`;
    return loc.regionName ? `Matched in ${loc.regionName}.` : 'Matched by name, description or tags.';
  }

  private scoreTextFields(terms: string[], fields: string[], title: string): number {
    let score = 0;
    for (const term of terms) {
      if (title === term) score += 120;
      else if (title.startsWith(term)) score += 80;
      else if (title.includes(term)) score += 55;
      if (fields.some(field => field.split(/\s+/).some(part => part.startsWith(term)))) score += 25;
      if (fields.some(field => field.includes(term))) score += 15;
    }
    return score;
  }

  private tokenizeSearch(value: string): string[] {
    return this.normalizeSearchValue(value)
      .split(' ')
      .filter(term => term.length > 1);
  }

  private expandSearchTerms(terms: string[]): string[] {
    const synonyms: Record<string, string[]> = {
      food: ['restaurant', 'restoran', 'cafe'],
      eat: ['restaurant', 'food'],
      restoran: ['restaurant', 'food'],
      plaza: ['beach', 'attraction'],
      beach: ['plaza', 'attraction'],
      culture: ['cultural', 'monument'],
      kultura: ['cultural', 'monument'],
      history: ['cultural', 'monument'],
      night: ['club', 'nightlife'],
      nightlife: ['club'],
      hotel: ['accommodation'],
      stay: ['accommodation'],
      shop: ['shopping'],
      shopping: ['shop'],
      route: ['ruta', 'trail'],
      ruta: ['route', 'trail'],
      hike: ['trail', 'walking'],
    };

    return Array.from(new Set(
      terms
        .flatMap(term => [term, ...(synonyms[term] ?? [])])
        .map(term => this.normalizeSearchValue(term))
        .filter(Boolean)
    ));
  }

  private normalizeSearchText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeTypeKey(value: string): string {
    return this.normalizeSearchText(value).replace(/\s+/g, '_');
  }

  private normalizeSearchValue(value: string | null | undefined): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/Ä‘/g, 'dj')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private isLocationOpen(loc: Location): boolean {
    const raw = loc.openingHours;
    if (!raw) return true;

    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      const now = new Date();
      const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const todayHours = parsed[dayKeys[now.getDay()]];

      if (!todayHours || todayHours === 'closed') return false;
      if (todayHours === '00:00-24:00' || todayHours === '0:00-24:00') return true;

      const [openStr, closeStr] = todayHours.split('-');
      const toMinutes = (value: string) => {
        const [hours, minutes] = value.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const openMinutes = toMinutes(openStr);
      const closeMinutes = toMinutes(closeStr);

      if (closeMinutes <= openMinutes) {
        return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
      }

      return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
    } catch {
      return true;
    }
  }

  private sortActivities(activities: TouristActivityItem[]): TouristActivityItem[] {
    const sorted = [...activities];
    switch (this.sortOption) {
      case 'activity-popular':
        return sorted.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
      case 'activity-category':
        return sorted.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name));
      case 'activity-difficulty':
        return sorted.sort((a, b) => (a.difficulty || '').localeCompare(b.difficulty || '') || a.name.localeCompare(b.name));
      default:
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  private sortRoutes(routes: TouristRouteItem[]): TouristRouteItem[] {
    const sorted = [...routes];
    switch (this.sortOption) {
      case 'route-distance-asc': return sorted.sort((a, b) => a.distanceKm - b.distanceKm);
      case 'route-distance-desc': return sorted.sort((a, b) => b.distanceKm - a.distanceKm);
      case 'route-duration-asc': return sorted.sort((a, b) => a.durationMin - b.durationMin);
      case 'route-name-asc': return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'route-difficulty': return sorted.sort((a, b) => (a.difficulty || '').localeCompare(b.difficulty || '') || a.name.localeCompare(b.name));
      default:
        return sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
  }

  private routeMatchesDistanceBand(route: TouristRouteItem, band: string): boolean {
    const distance = route.distanceKm || 0;
    if (band === 'short') return distance > 0 && distance <= 5;
    if (band === 'medium') return distance > 5 && distance <= 15;
    if (band === 'long') return distance > 15;
    return true;
  }

  private routeMatchesDurationBand(route: TouristRouteItem, band: string): boolean {
    const duration = route.durationMin || 0;
    if (band === 'quick') return duration > 0 && duration <= 60;
    if (band === 'half-day') return duration > 60 && duration <= 240;
    if (band === 'full-day') return duration > 240;
    return true;
  }

  private uniqueSorted(values: string[]): string[] {
    return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
  }

  private getLocationCoordinates(location: Partial<Location>): UserPosition | null {
    const lat = location.lat ?? location.latitude;
    const lng = location.lng ?? location.longitude;
    if (lat == null || lng == null) return null;
    return { lat: Number(lat), lng: Number(lng) };
  }

  // Povezujemo se sa HTML elementom koji ima #scrollContainer
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  isDown = false;
  startY = 0;
  scrollTop = 0;

  // Kada korisnik pritisne levi klik
  onMouseDown(e: MouseEvent) {
    this.isDown = true;
    const el = this.scrollContainer.nativeElement;
    // Računamo početnu poziciju miša u odnosu na kontejner
    this.startY = e.pageY - el.offsetTop;
    // Čuvamo trenutnu poziciju skrola
    this.scrollTop = el.scrollTop;
  }

  // Kada korisnik pusti klik
  onMouseUp() {
    this.isDown = false;
  }

  // Ako miš izađe izvan okvira kontejnera dok je kliknut
  onMouseLeave() {
    this.isDown = false;
  }

  // Dok korisnik pomera miša
  onMouseMove(e: MouseEvent) {
    if (!this.isDown) return; // Ako nije kliknuto, ne radi ništa
    e.preventDefault(); // Sprečava selektovanje teksta dok vučeš

    const el = this.scrollContainer.nativeElement;
    const y = e.pageY - el.offsetTop;
    const walk = (y - this.startY) * 1.5; // Množimo sa 1.5 da ubrzamo skrol
    el.scrollTop = this.scrollTop - walk;
  }

}
