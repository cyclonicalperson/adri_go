import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SideMenuComponent } from '../SideMenu/side-menu.component';
import { FiltersComponent } from '../Filteri/filters.component';
import { AuthService } from '../services/auth.service';
import { GeolocationService, UserPosition } from '../services/geolocation.service';
import { Location, LocationService } from '../services/location.service';
import { RecommendationService } from '../services/recommendation.service';
import { UserService } from '../services/user.service';
import { TouristAnalyticsService } from '../services/tourist-analytics.service';
import { FilterStateService, FilterState } from '../services/filter-state.service';
import { formatPostType } from '../utils/post-type.utils';

// Max cards shown per section row (prevents overcrowding)
const SECTION_LIMIT = 10;

@Component({
  selector: 'app-location-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SideMenuComponent, FiltersComponent],
  templateUrl: './location-list.component.html',
  styleUrls: ['./location-list.component.css']
})
export class LocationListComponent implements OnInit {
  readonly IMAGE_BASE_URL = 'http://localhost:5125/';

  isMenuOpen = false;
  isFiltersOpen = false;
  locations: Location[] = [];
  private allLocations: Location[] = [];
  isLoading = false;
  errorMessage = '';
  feedbackMessage = '';
  private userPosition: UserPosition | null = null;

  searchQuery = '';
  isSearchActive = false;
  searchResults: Location[] = [];
  showDropdown = false;

  // Section arrays
  nearYouLocations: Location[] = [];
  recommendedLocations: Location[] = [];
  topRatedLocations: Location[] = [];

  // Filter state
  isFilterActive = false;
  filteredLocations: Location[] = [];
  activeFilterState: FilterState | null = null;

  get isFilterView(): boolean {
    return this.isFilterActive && !this.isSearchActive;
  }

  // Expanded section view (inline, no navigation)
  activeSectionView: 'near-you' | 'recommended' | 'top-rated' | null = null;

  get activeSectionLabel(): string {
    switch (this.activeSectionView) {
      case 'near-you': return '📍 Near You';
      case 'recommended': return '✨ Recommended for You';
      case 'top-rated': return '🌟 Top Rated';
      default: return '';
    }
  }

  get activeSectionLocations(): Location[] {
    switch (this.activeSectionView) {
      case 'near-you': return this.nearYouLocations;
      case 'recommended': return this.recommendedLocations;
      case 'top-rated': return this.topRatedLocations;
      default: return [];
    }
  }

  constructor(
    private router: Router,
    private locationService: LocationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private geolocationService: GeolocationService,
    private recommendationService: RecommendationService,
    private userService: UserService,
    private analyticsService: TouristAnalyticsService,
    private filterStateService: FilterStateService,
  ) { }

  ngOnInit(): void {
    this.loadLocations();
    this.loadUserPosition();
  }

  loadLocations(): void {
    this.isLoading = true;
    this.locationService.getLocations(1, 100).subscribe({
      next: (res) => {
        const decorated = this.decorateLocations(res.data);
        this.allLocations = this.applyGuestState(decorated);
        this.locations = [...this.allLocations];
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

  /** Called on every keystroke — updates live dropdown */
  onSearchInput(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.searchResults = [];
      this.showDropdown = false;
      this.isSearchActive = false;
      this.locations = [...this.allLocations];
      this.cdr.markForCheck();
      return;
    }
    this.searchResults = this.allLocations
      .filter(loc =>
        (loc.title || '').toLowerCase().includes(q) ||
        (loc.postType || (loc as any).category || '').toLowerCase().includes(q) ||
        (loc.regionName || '').toLowerCase().includes(q)
      )
      .slice(0, 8);
    // Odmah filtriramo i listu ispod dropdowna — bez klikanja Search
    this.isSearchActive = true;
    this.locations = this.allLocations.filter(loc =>
      (loc.title || '').toLowerCase().includes(q) ||
      (loc.postType || (loc as any).category || '').toLowerCase().includes(q) ||
      (loc.regionName || '').toLowerCase().includes(q)
    );
    this.showDropdown = this.searchResults.length > 0;
    this.cdr.markForCheck();
  }

  /** Called when user clicks a dropdown suggestion */
  selectSearchResult(loc: Location): void {
    this.searchQuery = loc.title || '';
    this.showDropdown = false;
    this.isSearchActive = true;
    const q = this.searchQuery.trim().toLowerCase();
    this.locations = this.allLocations.filter(l =>
      (l.title || '').toLowerCase().includes(q) ||
      (l.postType || (l as any).category || '').toLowerCase().includes(q) ||
      (l.regionName || '').toLowerCase().includes(q)
    );
    this.cdr.markForCheck();
  }

  /** Called when user clicks Search button or presses Enter */
  executeSearch(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.showDropdown = false;
    if (!q) {
      this.clearSearch();
      return;
    }
    this.isSearchActive = true;
    this.locations = this.allLocations.filter(loc =>
      (loc.title || '').toLowerCase().includes(q) ||
      (loc.postType || (loc as any).category || '').toLowerCase().includes(q) ||
      (loc.regionName || '').toLowerCase().includes(q)
    );
    this.cdr.markForCheck();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.isSearchActive = false;
    this.searchResults = [];
    this.showDropdown = false;
    this.locations = [...this.allLocations];
    this.cdr.markForCheck();
  }

  /** Zatvaramo dropdown kad input izgubi fokus (malo kašnjenje zbog mousedown na stavci) */
  onSearchBlur(): void {
    setTimeout(() => {
      this.showDropdown = false;
      this.cdr.markForCheck();
    }, 150);
  }

  private applyGuestState(locations: Location[]): Location[] {
    if (this.authService.isLoggedIn) return locations;
    const likedIds: number[] = JSON.parse(localStorage.getItem('guest_liked_ids') || '[]');
    const savedIds: number[] = JSON.parse(localStorage.getItem('guest_saved_ids') || '[]');
    return locations.map(loc => ({
      ...loc,
      isLiked: likedIds.includes(loc.id),
      isSaved: savedIds.includes(loc.id),
    }));
  }

  onLike(loc: Location, event: Event): void {
    event.stopPropagation();

    if (!this.authService.isLoggedIn) {
      const liked: number[] = JSON.parse(localStorage.getItem('guest_liked_ids') || '[]');
      const idx = liked.indexOf(loc.id);
      if (idx >= 0) { liked.splice(idx, 1); loc.isLiked = false; loc.likeCount = Math.max(0, (loc.likeCount || 0) - 1); }
      else { liked.push(loc.id); loc.isLiked = true; loc.likeCount = (loc.likeCount || 0) + 1; }
      localStorage.setItem('guest_liked_ids', JSON.stringify(liked));
      this.showFeedback(loc.isLiked ? '❤️ Liked!' : 'Like removed');
      this.cdr.markForCheck();
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
      const saved: number[] = JSON.parse(localStorage.getItem('guest_saved_ids') || '[]');
      const idx = saved.indexOf(loc.id);
      if (idx >= 0) { saved.splice(idx, 1); loc.isSaved = false; loc.saveCount = Math.max(0, (loc.saveCount || 0) - 1); }
      else { saved.push(loc.id); loc.isSaved = true; loc.saveCount = (loc.saveCount || 0) + 1; }
      localStorage.setItem('guest_saved_ids', JSON.stringify(saved));
      this.showFeedback(loc.isSaved ? '🔖 Saved!' : 'Removed from saved');
      this.cdr.markForCheck();
      return;
    }
    const action$ = loc.isSaved ? this.locationService.unsaveLocation(loc.id) : this.locationService.saveLocation(loc.id);
    action$.subscribe({
      next: (res) => { loc.isSaved = !loc.isSaved; if (res.saveCount !== undefined) loc.saveCount = res.saveCount; this.showFeedback(loc.isSaved ? '🔖 Saved!' : 'Removed from saved'); this.cdr.markForCheck(); },
      error: (err) => { if (err.status === 401) this.router.navigate(['/login']); else console.error(err); }
    });
  }

  toggleMenu(): void { this.isMenuOpen = !this.isMenuOpen; }
  goToMap(): void { this.router.navigate(['/map-home']); }
  openFilters(): void { this.isFiltersOpen = true; this.cdr.markForCheck(); }
  closeFilters(): void { this.isFiltersOpen = false; this.cdr.markForCheck(); }

  onFiltersApplied(state: FilterState): void {
    // NE zatvaramo panel — korisnik sam zatvara sa X
    // Odmah primeni filtere reaktivno
    this.activeFilterState = state;
    const hasActiveFilter =
      state.activeCategories.length > 0 ||
      state.minRating > 0 ||
      state.openNow ||
      (state.radius > 0);

    if (hasActiveFilter) {
      this.filteredLocations = this.applyFiltersToLocations(this.allLocations, state);
      this.isFilterActive = true;
      this.activeSectionView = null;
    } else {
      this.filteredLocations = [];
      this.isFilterActive = false;
    }
    this.cdr.markForCheck();
  }

  clearFilterView(): void {
    this.isFilterActive = false;
    this.filteredLocations = [];
    this.activeFilterState = null;
    this.filterStateService.clear();
    this.cdr.markForCheck();
  }

  private applyFiltersToLocations(locations: Location[], state: FilterState): Location[] {
    return locations.filter(loc => {
      // Kategorija filter
      if (state.activeCategories.length > 0) {
        const key = (loc.postType || (loc as any).category || '').toLowerCase().replace(/\s+/g, '_');
        if (!state.activeCategories.includes(key)) return false;
      }
      // Rating filter
      if (state.minRating > 0 && (loc.avgRating || 0) < state.minRating) return false;
      // Radius filter
      if (state.radius > 0 && this.userPosition) {
        const coords = this.getLocationCoordinates(loc);
        if (coords) {
          const dist = this.geolocationService.haversineKm(this.userPosition, coords);
          if (dist > state.radius) return false;
        }
      }
      return true;
    });
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

  formatDistance(distanceKm?: number | null): string { return this.geolocationService.formatDistanceKm(distanceKm); }

  getFirstImage(loc: Partial<Location> & { images?: string | string[] }): string {
    if (!loc?.images) return 'assets/placeholder.jpg';
    let firstImg = '';
    if (typeof loc.images === 'string') {
      try { const p = JSON.parse(loc.images) as string[]; firstImg = p[0] || ''; } catch { firstImg = loc.images; }
    } else if (Array.isArray(loc.images) && loc.images.length > 0) { firstImg = loc.images[0]; }
    if (!firstImg) return 'assets/placeholder.jpg';
    if (!firstImg.startsWith('http')) { const c = firstImg.startsWith('/') ? firstImg.substring(1) : firstImg; return `${this.IMAGE_BASE_URL}${c}`; }
    return firstImg;
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

  get sectionTitle(): string {
    if (this.isSearchActive) return `Results for "${this.searchQuery}"`;
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
      const calendarItems = JSON.parse(localStorage.getItem('adrigo_guest_calendar_v1') || '[]');
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

    this.cdr.markForCheck();
  }

  private showFeedback(msg: string): void {
    this.feedbackMessage = msg;
    setTimeout(() => (this.feedbackMessage = ''), 2500);
  }

  private loadUserPosition(): void {
    void this.geolocationService.requestCurrentPosition().then((position) => {
      if (!position) return;
      this.userPosition = position;
      this.allLocations = this.decorateLocations(this.allLocations);
      if (!this.isSearchActive) this.locations = [...this.allLocations];
      this.buildSections();
      this.cdr.markForCheck();
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

  private getLocationCoordinates(location: Partial<Location>): UserPosition | null {
    const lat = location.lat ?? location.latitude;
    const lng = location.lng ?? location.longitude;
    if (lat == null || lng == null) return null;
    return { lat: Number(lat), lng: Number(lng) };
  }
}
