import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { FilterStateService } from '../services/filter-state.service';
import { Location, LocationService } from '../services/location.service';
import { RoutingService } from '../services/routing.service';
import { SavedRouteLibraryItem, TouristRoutesService } from '../services/tourist-routes.service';
import { DEFAULT_LOCATION_IMAGE, resolveBackendAssetUrl } from '../utils/backend-url.utils';
import { TouristPreferencesService } from '../services/tourist-preferences.service';
import { formatPostType } from '../utils/post-type.utils';
import { SiteTranslateService } from '../services/site-translate.service';
import { AuthRequiredModalComponent } from '../shared/auth-required-modal/auth-required-modal.component';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';
import { DesktopFooterComponent } from '../shared/desktop-footer.component';
import { MobileTouristNavComponent } from '../shared/mobile-tourist-nav.component';

type SavedFilter = 'All' | 'Destinations' | 'Routes';
type SavedSectionKey = 'places' | 'routes';
type SavedRouteStopBucket = 'all' | '1' | '2-3' | '4+';
type SavedRouteDistanceSort = 'default' | 'distance-asc' | 'distance-desc';

interface SavedFilterItem {
  id: SavedFilter;
  label: string;
}

interface SavedSectionMeta {
  key: SavedSectionKey;
  title: string;
  emptyTitle: string;
  emptyCopy: string;
  filter: Exclude<SavedFilter, 'All'>;
}

interface SavedPlaceCategoryOption {
  id: string;
  label: string;
  color: string;
  icon: string;
}

interface SavedRouteStopOption {
  value: SavedRouteStopBucket;
  label: string;
}

interface SavedRouteDistanceSortOption {
  value: SavedRouteDistanceSort;
  label: string;
}

interface SavedMiniFilterState {
  placeCategories: string[];
  placeMinRating: number;
  routeStopBucket: SavedRouteStopBucket;
  routeModes: string[];
  routeDistanceSort: SavedRouteDistanceSort;
  routeDistanceMin: string;
  routeDistanceMax: string;
}

interface SavedDisplayItem {
  id: number;
  title: string;
  category: string;
  categoryKey: string;
  rating: number;
  reviews: number;
  distance: number | null;
  status: string;
  isOpen: boolean;
  imageUrl: string;
  isLiked: boolean;
  isSaved: boolean;
  likeCount: number;
  saveCount: number;
  tagNames: string[];
  description?: string;
  regionName?: string;
  country?: string;
  address?: string;
  createdAt?: string;
  publishedAt?: string;
  _lat?: number;
  _lng?: number;
}

function createDefaultSavedFilters(): SavedMiniFilterState {
  return {
    placeCategories: [],
    placeMinRating: 0,
    routeStopBucket: 'all',
    routeModes: [],
    routeDistanceSort: 'default',
    routeDistanceMin: '',
    routeDistanceMax: '',
  };
}

@Component({
  selector: 'app-saved-locations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppHeaderComponent,
    AuthRequiredModalComponent,
    MobileTouristNavComponent,
    DesktopFooterComponent,
  ],
  templateUrl: './saved-locations.html',
  styleUrls: ['./saved-locations.css'],
})
export class SavedLocationsComponent implements OnInit, OnDestroy {
  @ViewChild('savedFiltersScroll') private savedFiltersScroll?: ElementRef<HTMLElement>;
  @ViewChildren('sectionRail') private sectionRails?: QueryList<ElementRef<HTMLElement>>;

  activeFilter: SavedFilter = 'All';
  readonly defaultImage = 'assets/plaza.jpg';
  readonly filters: SavedFilterItem[] = [
    { id: 'All', label: 'All' },
    { id: 'Destinations', label: 'Destinations' },
    { id: 'Routes', label: 'Routes' },
  ];
  readonly sectionMeta: SavedSectionMeta[] = [
    {
      key: 'places',
      title: 'Saved Destinations',
      emptyTitle: 'No saved places yet',
      emptyCopy: 'Places you save from the app will appear here.',
      filter: 'Destinations',
    },
    {
      key: 'routes',
      title: 'Saved Routes',
      emptyTitle: 'No saved routes yet',
      emptyCopy: 'Curated favorites and routes you save from the planner will appear here.',
      filter: 'Routes',
    },
  ];
  readonly savedPlaceCategoryOptions: SavedPlaceCategoryOption[] = [
    {
      id: 'attraction',
      label: 'Attractions',
      color: '#10b981',
      icon: '🏖️',
    },
    {
      id: 'restaurant',
      label: 'Restaurants',
      color: '#ef4444',
      icon: '🍴',
    },
    {
      id: 'cultural_site',
      label: 'Culture',
      color: '#f59e0b',
      icon: '🏛️',
    },
    {
      id: 'monument',
      label: 'Monuments',
      color: '#d97706',
      icon: '🗿',
    },
    {
      id: 'club',
      label: 'Nightlife',
      color: '#8b5cf6',
      icon: '🎉',
    },
    {
      id: 'sports_facility',
      label: 'Activities',
      color: '#22c55e',
      icon: '🎡',
    },
    {
      id: 'event',
      label: 'Events',
      color: '#ec4899',
      icon: '🗓️',
    },
    {
      id: 'accommodation',
      label: 'Accommodation',
      color: '#3b82f6',
      icon: '🏨',
    },
    {
      id: 'shop',
      label: 'Shopping',
      color: '#f97316',
      icon: '🛍️',
    },
  ];
  readonly savedPlaceCategoryOptionsExtended: SavedPlaceCategoryOption[] = [
    ...this.savedPlaceCategoryOptions,
    {
      id: 'other',
      label: 'Other',
      color: '#64748b',
      icon: '•',
    },
  ];
  readonly routeStopOptions: SavedRouteStopOption[] = [
    { value: 'all', label: 'All stops' },
    { value: '1', label: '1 stop' },
    { value: '2-3', label: '2-3 stops' },
    { value: '4+', label: '4+ stops' },
  ];
  readonly routeModeOptions: string[] = ['driving', 'walking', 'cycling'];
  readonly routeDistanceSortOptions: SavedRouteDistanceSortOption[] = [
    { value: 'default', label: 'Default order' },
    { value: 'distance-asc', label: 'Shortest first' },
    { value: 'distance-desc', label: 'Longest first' },
  ];

  isLoading = true;
  isGuest = false;
  showAuthPopup = false;
  feedbackMessage = '';
  loadErrorMessage = '';
  savedSearchQuery = '';
  savedFiltersOpen = false;
  savedSortOpen = false;
  savedSortValue: SavedRouteDistanceSort = 'default';
  editingRouteKey: string | null = null;
  editingRouteTitle = '';
  appliedSavedFilters: SavedMiniFilterState = createDefaultSavedFilters();
  draftSavedFilters: SavedMiniFilterState = createDefaultSavedFilters();
  savedItems: SavedDisplayItem[] = [];
  placeItems: SavedDisplayItem[] = [];
  routeItems: SavedRouteLibraryItem[] = [];
  userPosition: [number, number] | null = null;
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public router: Router,
    private locationService: LocationService,
    private authService: AuthService,
    private filterStateService: FilterStateService,
    private preferences: TouristPreferencesService,
    private touristRoutesService: TouristRoutesService,
    private routingService: RoutingService,
    private cdr: ChangeDetectorRef,
    private siteTranslate: SiteTranslateService
  ) {}

  ngOnInit(): void {
    if (this.preferences.snapshot.locationSharing) {
      this.requestGeolocation();
    }

    if (this.authService.isLoggedIn) {
      this.loadSavedLocations();
      return;
    }

    this.isGuest = true;
    this.isLoading = false;
    this.showAuthPopup = true;
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.unlockSavedBackgroundScroll();
  }

  get totalSavedCount(): number {
    return this.placeItems.length + this.routeItems.length;
  }

  get filteredPlaceItems(): SavedDisplayItem[] {
    const query = this.savedSearchQuery.trim().toLowerCase();
    return this.placeItems.filter(item => this.matchesSavedPlace(item, query, this.appliedSavedFilters));
  }

  get filteredRouteItems(): SavedRouteLibraryItem[] {
    const query = this.savedSearchQuery.trim().toLowerCase();
    const filtered = this.routeItems.filter(route =>
      this.matchesSavedRoute(route, query, this.appliedSavedFilters),
    );
    return this.sortSavedRoutes(filtered, this.savedSortValue);
  }

  get hasActiveSavedFilters(): boolean {
    return this.appliedSavedFilters.placeCategories.length > 0
      || this.appliedSavedFilters.placeMinRating > 0
      || this.appliedSavedFilters.routeStopBucket !== 'all'
      || this.appliedSavedFilters.routeModes.length > 0
      || this.appliedSavedFilters.routeDistanceMin.trim().length > 0
      || this.appliedSavedFilters.routeDistanceMax.trim().length > 0;
  }

  get hasSavedSearchOrFilters(): boolean {
    return this.savedSearchQuery.trim().length > 0 || this.hasActiveSavedFilters;
  }

  get shouldShowPlaceFilters(): boolean {
    return this.activeFilter !== 'Routes';
  }

  get shouldShowRouteFilters(): boolean {
    return this.activeFilter !== 'Destinations';
  }

  get visibleSections(): SavedSectionMeta[] {
    if (this.activeFilter === 'All') return this.sectionMeta;
    return this.sectionMeta.filter(section => section.filter === this.activeFilter);
  }

  get visibleEmptyState(): boolean {
    return !this.isLoading && this.totalSavedCount === 0 && this.activeFilter !== 'All';
  }

  getActivityTags(item: SavedDisplayItem, limit = 3): string[] {
    return Array.from(
      new Set(
        (item.tagNames ?? [])
          .map(tag => String(tag).trim())
          .filter(Boolean),
      ),
    ).slice(0, limit);
  }

  openActivityTag(tag: string, event?: Event): void {
    event?.stopPropagation();
    const name = String(tag ?? '').trim();
    if (!name) return;

    this.router.navigate(['/location-list'], {
      queryParams: {
        type: 'destinations',
        tag: name,
      },
    });
  }

  formatPostType(type?: string | null): string {
    return this.translateLabel(formatPostType(type));
  }

  getCategoryColor(postType?: string | null): string {
    const colors: Record<string, string> = {
      attraction: '#10b981',
      sports_facility: '#22c55e',
      event: '#ec4899',
      restaurant: '#ef4444',
      club: '#8b5cf6',
      accommodation: '#3b82f6',
      shop: '#f97316',
      cultural_site: '#f59e0b',
      monument: '#d97706',
    };

    return colors[(postType || '').toLowerCase().replace(/\s+/g, '_')] || '#6b7280';
  }

  setFilter(filter: SavedFilter): void {
    this.activeFilter = filter;
  }

  translateLabel(value: string | null | undefined): string {
    return this.siteTranslate.instant(value ?? '');
  }

  formatDynamicTag(value: string | null | undefined): string {
    const raw = (value ?? '').toString().trim();
    if (!raw) return '';
    const normalizedRaw = raw.replace(/_/g, ' ').replace(/\s+/g, ' ');
    const translatedRaw = this.translateLabel(normalizedRaw);
    if (translatedRaw !== normalizedRaw) return translatedRaw;

    const readable = raw
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .replace(/(^|[\s-])\p{L}/gu, match => match.toUpperCase());
    return this.translateLabel(readable);
  }

  getActiveFilterLabel(): string {
    return this.translateLabel(this.filters.find(filter => filter.id === this.activeFilter)?.label ?? this.activeFilter);
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
  }

  onSavedSearchChanged(query: string): void {
    this.savedSearchQuery = query;
    this.cdr.markForCheck();
  }

  openSavedFilters(event: Event): void {
    event.stopPropagation();
    this.draftSavedFilters = this.cloneSavedFilters(this.appliedSavedFilters);
    this.savedFiltersOpen = true;
    this.lockSavedBackgroundScroll();
    this.cdr.detectChanges();
    this.resetSavedFiltersScroll();
  }

  closeSavedFilters(): void {
    this.resetSavedFiltersScroll();
    this.savedFiltersOpen = false;
    this.unlockSavedBackgroundScroll();
  }

  clearSavedFilters(): void {
    this.draftSavedFilters = createDefaultSavedFilters();
  }

  applySavedFilters(): void {
    this.appliedSavedFilters = this.cloneSavedFilters(this.draftSavedFilters);
    this.resetSavedFiltersScroll();
    this.savedFiltersOpen = false;
    this.unlockSavedBackgroundScroll();
  }

  toggleDraftPlaceCategory(categoryId: string): void {
    const nextCategories = this.draftSavedFilters.placeCategories.includes(categoryId)
      ? this.draftSavedFilters.placeCategories.filter(id => id !== categoryId)
      : [...this.draftSavedFilters.placeCategories, categoryId];
    this.draftSavedFilters = {
      ...this.draftSavedFilters,
      placeCategories: nextCategories,
    };
  }

  setDraftPlaceMinRating(rating: number): void {
    this.draftSavedFilters = {
      ...this.draftSavedFilters,
      placeMinRating: this.draftSavedFilters.placeMinRating === rating ? 0 : rating,
    };
  }

  setDraftRouteStopBucket(value: SavedRouteStopBucket): void {
    this.draftSavedFilters = {
      ...this.draftSavedFilters,
      routeStopBucket: value,
    };
  }

  toggleDraftRouteMode(mode: string): void {
    const nextModes = this.draftSavedFilters.routeModes.includes(mode)
      ? this.draftSavedFilters.routeModes.filter(item => item !== mode)
      : [...this.draftSavedFilters.routeModes, mode];

    this.draftSavedFilters = {
      ...this.draftSavedFilters,
      routeModes: nextModes,
    };
  }

  setDraftRouteDistanceMin(value: string): void {
    this.draftSavedFilters = {
      ...this.draftSavedFilters,
      routeDistanceMin: value,
    };
  }

  setDraftRouteDistanceSort(value: SavedRouteDistanceSort): void {
    this.draftSavedFilters = {
      ...this.draftSavedFilters,
      routeDistanceSort: value,
    };
  }

  setSavedSort(value: SavedRouteDistanceSort): void {
    this.savedSortValue = value;
    this.savedSortOpen = false;
  }

  getSavedSortLabel(): string {
    return this.translateLabel(this.routeDistanceSortOptions.find(option => option.value === this.savedSortValue)?.label ?? 'Default order');
  }

  setDraftRouteDistanceMax(value: string): void {
    this.draftSavedFilters = {
      ...this.draftSavedFilters,
      routeDistanceMax: value,
    };
  }

  viewAll(section: SavedSectionKey): void {
    const meta = this.sectionMeta.find(item => item.key === section);
    if (!meta) return;
    this.activeFilter = meta.filter;
  }

  getSectionTitle(section: SavedSectionMeta): string {
    return section.title;
  }

  shouldShowViewAll(section: SavedSectionMeta): boolean {
    return this.activeFilter === 'All' && this.getSectionCount(section.key) > 0;
  }

  getSectionItems(section: SavedSectionKey): Array<SavedDisplayItem | SavedRouteLibraryItem> {
    switch (section) {
      case 'places':
        return this.getVisiblePostItems();
      case 'routes':
        return this.filteredRouteItems;
    }
  }

  getVisiblePostItems(): SavedDisplayItem[] {
    return this.filteredPlaceItems;
  }

  getSectionCount(section: SavedSectionKey): number {
    return this.getSectionItems(section).length;
  }

  getFilterCount(filter: SavedFilter): number {
    switch (filter) {
      case 'All':
        return this.filteredPlaceItems.length + this.filteredRouteItems.length;
      case 'Destinations':
        return this.filteredPlaceItems.length;
      case 'Routes':
        return this.filteredRouteItems.length;
    }
  }

  getItemLocation(item: SavedDisplayItem): string {
    const fallbackLocation = [item.regionName, item.country].filter(Boolean).join(', ');
    return item.address || fallbackLocation || this.formatPostType(item.category);
  }

  getItemDate(item: SavedDisplayItem): Date | null {
    const raw = item.publishedAt || item.createdAt;
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  getEventDateLabel(item: SavedDisplayItem): string {
    const date = this.getItemDate(item);
    if (!date) return 'Date pending';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  getRelativeDateLabel(item: SavedDisplayItem): string {
    const date = this.getItemDate(item);
    if (!date) return 'Saved recently';

    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / 86400000));

    if (diffDays === 0) return 'Created today';
    if (diffDays === 1) return 'Created yesterday';
    if (diffDays < 7) return `Created ${diffDays} days ago`;

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 5) return `Created ${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `Created ${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;

    const diffYears = Math.floor(diffDays / 365);
    return `Created ${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
  }

  getSectionEmptyIcon(section: SavedSectionKey): string {
    switch (section) {
      case 'places':
        return 'bookmark';
      case 'routes':
        return 'route';
    }
  }

  goBack(): void {
    window.history.back();
  }

  viewDetails(id: number): void {
    this.router.navigate(['/location-details', id]);
  }

  viewRoute(route: SavedRouteLibraryItem, event?: Event): void {
    event?.stopPropagation();
    this.router.navigate(['/map-home'], {
      queryParams: route.kind === 'touristRoute'
        ? { touristRouteId: route.touristRouteId }
        : { routeId: route.routeId },
    });
  }

  startRoute(route: SavedRouteLibraryItem, event?: Event): void {
    event?.stopPropagation();
    this.router.navigate(['/map-home'], {
      queryParams: route.kind === 'touristRoute'
        ? { touristRouteId: route.touristRouteId }
        : { routeId: route.routeId },
    });
  }

  showOnMap(): void {
    if (this.isGuest) {
      this.showAuthPopup = true;
      return;
    }

    const ids = this.savedItems.map(item => item.id);
    const defaultState = this.filterStateService.getDefault();
    this.filterStateService.set({
      ...defaultState,
      activeContentType: 'destinations',
      showOnlySaved: true,
      savedPostIds: ids,
    });
    this.router.navigate(['/map-home']);
  }

  exploreSavedRoutes(): void {
    this.router.navigate(['/location-list'], {
      queryParams: { type: 'routes' },
    });
  }

  removeSaved(id: number, event: Event): void {
    event.stopPropagation();

    if (this.isGuest) {
      this.showAuthPopup = true;
      this.cdr.detectChanges();
      return;
    }

    const originalItems = [...this.savedItems];
    this.savedItems = this.savedItems.filter(item => item.id !== id);
    this.rebuildSections();

    this.locationService.toggleSaveLocation(id).subscribe({
      next: () => {
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.savedItems = originalItems;
        this.rebuildSections();
        if (!this.handleAuthFailure(err)) {
          this.showFeedback('Could not update saved items right now.');
        }
        this.cdr.detectChanges();
      },
    });
  }

  removeSavedRoute(route: SavedRouteLibraryItem, event: Event): void {
    event.stopPropagation();

    if (this.isGuest) {
      this.showAuthPopup = true;
      this.cdr.detectChanges();
      return;
    }

    const originalRoutes = [...this.routeItems];
    this.routeItems = this.routeItems.filter(item => !this.isSameRouteItem(item, route));
    this.cdr.detectChanges();

    if (route.kind === 'touristRoute' && route.touristRouteId != null) {
      this.touristRoutesService.deleteTouristRoute(route.touristRouteId).subscribe({
        next: () => {
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.routeItems = originalRoutes;
          if (!this.handleAuthFailure(err)) {
            this.showFeedback('Could not update saved routes right now.');
          }
          this.cdr.detectChanges();
        },
      });
      return;
    }

    this.touristRoutesService.toggleSaveRoute(route.routeId!).subscribe({
      next: (res) => {
        if (res.isSaved) {
          this.routeItems = originalRoutes.map(item =>
            this.isSameRouteItem(item, route)
              ? { ...item, isSaved: true, saveCount: res.saveCount ?? item.saveCount }
              : item,
          );
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.routeItems = originalRoutes;
        if (!this.handleAuthFailure(err)) {
          this.showFeedback('Could not update saved routes right now.');
        }
        this.cdr.detectChanges();
      },
    });
  }

  beginRouteRename(route: SavedRouteLibraryItem, event: Event): void {
    event.stopPropagation();

    if (this.isGuest) {
      this.showAuthPopup = true;
      this.cdr.detectChanges();
      return;
    }

    if (route.kind !== 'touristRoute' || route.touristRouteId == null) {
      return;
    }

    this.editingRouteKey = this.getRouteIdentity(route);
    this.editingRouteTitle = route.title;
    this.cdr.detectChanges();
  }

  cancelRouteRename(event?: Event): void {
    event?.stopPropagation();
    this.editingRouteKey = null;
    this.editingRouteTitle = '';
    this.cdr.detectChanges();
  }

  saveRouteRename(route: SavedRouteLibraryItem, event?: Event): void {
    event?.stopPropagation();

    if (this.isGuest) {
      this.showAuthPopup = true;
      this.cdr.detectChanges();
      return;
    }

    if (route.kind !== 'touristRoute' || route.touristRouteId == null) {
      return;
    }

    const nextTitle = this.editingRouteTitle.trim();
    if (!nextTitle) {
      this.showFeedback('Route name is required.');
      this.cdr.detectChanges();
      return;
    }

    if (nextTitle === route.title) {
      this.cancelRouteRename();
      return;
    }

    this.touristRoutesService.updateTouristRoute(route.touristRouteId, {
      title: nextTitle,
      waypoints: JSON.stringify(route.waypoints ?? []),
      travelMode: route.travelMode || 'driving',
      scenicMode: !!route.scenicMode,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      sourceRouteId: route.sourceRouteId,
    }).subscribe({
      next: updated => {
        if (!updated) {
          this.showFeedback('Could not rename route right now.');
          this.cdr.detectChanges();
          return;
        }

        this.routeItems = this.routeItems.map(item =>
          this.isSameRouteItem(item, route)
            ? {
                ...item,
                title: updated.title,
                updatedAt: updated.updatedAt,
                travelMode: updated.travelMode,
                scenicMode: updated.scenicMode,
                distanceKm: updated.distanceKm ?? item.distanceKm,
                durationMin: updated.durationMin ?? item.durationMin,
                sourceRouteId: updated.sourceRouteId,
                waypoints: updated.waypoints,
              }
            : item,
        );
        this.editingRouteKey = null;
        this.editingRouteTitle = '';
        this.showFeedback('Route renamed.');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (!this.handleAuthFailure(err)) {
          this.showFeedback('Could not rename route right now.');
        }
        this.cdr.detectChanges();
      },
    });
  }

  toggleLike(item: SavedDisplayItem, event: Event): void {
    event.stopPropagation();

    if (this.isGuest) {
      this.showAuthPopup = true;
      this.cdr.detectChanges();
      return;
    }

    if (item.isLiked) {
      this.locationService.unlikeLocation(item.id).subscribe({
        next: (res) => {
          item.isLiked = false;
          item.likeCount = Math.max(0, res.likeCount ?? (item.likeCount || 0) - 1);
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          if (!this.handleAuthFailure(err)) {
            this.showFeedback('Could not update like right now.');
          }
          this.cdr.detectChanges();
        },
      });
      return;
    }

    this.locationService.likeLocation(item.id).subscribe({
      next: (res) => {
        item.isLiked = true;
        item.likeCount = res.likeCount ?? (item.likeCount || 0) + 1;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (!this.handleAuthFailure(err)) {
          this.showFeedback('Could not update like right now.');
        }
        this.cdr.detectChanges();
      },
    });
  }

  closeAuthPopup(): void {
    this.showAuthPopup = false;
  }

  goToLogin(): void {
    this.showAuthPopup = false;
    this.router.navigate(['/login']);
  }

  trackByItem(_: number, item: SavedDisplayItem): number {
    return item.id;
  }

  trackByRoute(_: number, route: SavedRouteLibraryItem): string {
    return `${route.kind}-${route.id}`;
  }

  isDraftPlaceCategorySelected(categoryId: string): boolean {
    return this.draftSavedFilters.placeCategories.includes(categoryId);
  }

  isDraftRouteModeSelected(mode: string): boolean {
    return this.draftSavedFilters.routeModes.includes(mode);
  }

  formatRouteModeLabel(mode: string): string {
    const normalized = String(mode || '').trim().toLowerCase();
    if (!normalized) return 'Route mode';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  getRouteFirstImage(route: SavedRouteLibraryItem): string {
    if (route.imageUrl) {
      return resolveBackendAssetUrl(route.imageUrl, this.defaultImage);
    }
    const images = this.locationService.parseImages(route.images ?? undefined);
    return resolveBackendAssetUrl(images[0] ?? null, this.defaultImage);
  }

  getRouteLocation(route: SavedRouteLibraryItem): string {
    return [route.regionName, route.countryName].filter(Boolean).join(', ') || `${route.waypoints.length || 0} stops`;
  }

  getRouteRelativeDateLabel(route: SavedRouteLibraryItem): string {
    const raw = route.updatedAt || route.createdAt;
    if (!raw) return 'Saved recently';

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return 'Saved recently';

    const diffMs = Date.now() - parsed.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / 86400000));

    if (diffDays === 0) return 'Created today';
    if (diffDays === 1) return 'Created yesterday';
    if (diffDays < 7) return `Created ${diffDays} days ago`;

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 5) return `Created ${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `Created ${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;

    const diffYears = Math.floor(diffDays / 365);
    return `Created ${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
  }

  formatRouteDifficulty(value?: string | null): string {
    if (!value) return 'Route';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  getRouteMetaLabel(route: SavedRouteLibraryItem): string {
    if (route.kind === 'touristRoute') {
      const mode = (route.travelMode || 'driving').charAt(0).toUpperCase() + (route.travelMode || 'driving').slice(1);
      return `${route.waypoints.length || 0} stops • ${mode}`;
    }
    return `${route.waypoints.length || 0} stops`;
  }

  getRouteBadgeClass(route: SavedRouteLibraryItem): string {
    if (route.badge === 'Modified route') return 'route-badge-modified';
    if (route.badge === 'My route') return 'route-badge-personal';
    return 'route-badge-curated';
  }

  isEditingRoute(route: SavedRouteLibraryItem): boolean {
    return this.editingRouteKey === this.getRouteIdentity(route);
  }

  scrollRail(section: 'places', direction: 1 | -1): void {
    const rail = this.sectionRails
      ?.toArray()
      .find(item => item.nativeElement.dataset['section'] === section)
      ?.nativeElement;

    if (!rail) return;

    const distance = Math.max(rail.clientWidth * 0.72, 240) * direction;
    rail.scrollBy({ left: distance, behavior: 'smooth' });
  }

  private requestGeolocation(): void {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      pos => {
        this.userPosition = [pos.coords.latitude, pos.coords.longitude];
        this.savedItems = this.savedItems.map(item => ({
          ...item,
          distance:
            item._lat && item._lng
              ? this.haversineKm(this.userPosition![0], this.userPosition![1], item._lat, item._lng)
              : null,
        }));
        this.rebuildSections();
        this.cdr.detectChanges();
      },
      () => {},
    );
  }

  private isOpenNow(openingHours?: string): boolean {
    if (!openingHours) return true;
    try {
      const obj = JSON.parse(openingHours);
      const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const now = new Date();
      const todayHours: string = obj[dayKeys[now.getDay()]];
      if (!todayHours || todayHours === 'closed') return false;
      if (todayHours === '00:00-24:00' || todayHours === '0:00-24:00') return true;
      const [openStr, closeStr] = todayHours.split('-');
      const toMinutes = (value: string) => {
        const [hours, minutes] = (value || '0:0').split(':').map(Number);
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

  private loadSavedLocations(): void {
    this.isLoading = true;
    this.loadErrorMessage = '';
    let pendingRequests = 2;
    let hasNonAuthError = false;

    const finishLoad = () => {
      pendingRequests -= 1;
      if (pendingRequests > 0) return;
      this.rebuildSections();
      this.isLoading = false;
      if (hasNonAuthError && !this.loadErrorMessage) {
        this.loadErrorMessage = 'Could not load some saved items right now.';
      }
      this.cdr.detectChanges();
    };

    this.locationService.getMySavedPosts().subscribe({
      next: (posts: Location[]) => {
        this.savedItems = posts.map(post => this.mapToItem(post));
        finishLoad();
      },
      error: (err: any) => {
        if (!this.handleAuthFailure(err)) {
          hasNonAuthError = true;
        }
        finishLoad();
      },
    });

    this.touristRoutesService.getSavedRoutesLibrary().subscribe({
      next: (routes: SavedRouteLibraryItem[]) => {
        void this.hydrateSavedRouteMetrics(routes)
          .then(normalizedRoutes => {
            this.routeItems = normalizedRoutes;
            finishLoad();
          })
          .catch(() => {
            this.routeItems = routes;
            finishLoad();
          });
      },
      error: (err: any) => {
        if (!this.handleAuthFailure(err)) {
          hasNonAuthError = true;
        }
        finishLoad();
      },
    });
  }

  private showFeedback(message: string): void {
    this.feedbackMessage = message;
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
    this.feedbackTimer = setTimeout(() => {
      this.feedbackMessage = '';
      this.feedbackTimer = null;
      this.cdr.detectChanges();
    }, 3200);
  }

  private handleAuthFailure(err: any): boolean {
    if (err?.status !== 401) return false;
    this.authService.logout();
    this.router.navigate(['/login']);
    return true;
  }

  private mapToItem(post: Location): SavedDisplayItem {
    const imagesArr = this.locationService.parseImages(post.images);
    const firstImage = resolveBackendAssetUrl(imagesArr.length > 0 ? imagesArr[0] : null, this.defaultImage);
    const lat = (post as any).lat ?? (post as any).latitude;
    const lng = (post as any).lng ?? (post as any).longitude;
    const distance =
      this.userPosition && lat && lng
        ? this.haversineKm(this.userPosition[0], this.userPosition[1], lat, lng)
        : null;
    const isOpen = this.isOpenNow((post as any).openingHours);

    return {
      id: post.id,
      title: post.title,
      category: post.postType || 'Unknown',
      categoryKey: this.normalizeTypeKey(post.postType || (post as any).category || ''),
      rating: post.avgRating || 0,
      reviews: post.reviewCount || 0,
      distance,
      status: isOpen ? 'Open now' : 'Closed',
      isOpen,
      imageUrl: firstImage,
      isLiked: !!(post as any).isLiked,
      isSaved: true,
      likeCount: (post as any).likeCount || 0,
      saveCount: (post as any).saveCount || 0,
      tagNames: (post as any).tagNames ?? (post as any).TagNames ?? [],
      description: post.description,
      regionName: post.regionName,
      country: post.country,
      address: post.address,
      createdAt: post.createdAt,
      publishedAt: post.publishedAt,
      _lat: lat,
      _lng: lng,
    };
  }

  private rebuildSections(): void {
    this.placeItems = [...this.savedItems];
  }

  private async hydrateSavedRouteMetrics(routes: SavedRouteLibraryItem[]): Promise<SavedRouteLibraryItem[]> {
    return Promise.all(routes.map(route => this.hydrateSavedRouteMetric(route)));
  }

  private async hydrateSavedRouteMetric(route: SavedRouteLibraryItem): Promise<SavedRouteLibraryItem> {
    if (route.kind !== 'touristRoute') {
      return route;
    }

    const coordinates = route.waypoints
      .filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng))
      .map(point => [point.lat, point.lng] as [number, number]);

    if (coordinates.length < 2) {
      return {
        ...route,
        distanceKm: 0,
        durationMin: 0,
      };
    }

    const travelMode = route.travelMode === 'walking' || route.travelMode === 'cycling'
      ? route.travelMode
      : 'driving';

    try {
      const computed = await this.routingService.computeRoute(coordinates, travelMode, {
        allowFallback: true,
      });

      return {
        ...route,
        travelMode,
        distanceKm: computed.distanceKm,
        durationMin: Math.round(computed.durationMin),
      };
    } catch {
      return route;
    }
  }

  private isSameRouteItem(a: SavedRouteLibraryItem, b: SavedRouteLibraryItem): boolean {
    return a.kind === b.kind && a.id === b.id;
  }

  private getRouteIdentity(route: SavedRouteLibraryItem): string {
    return `${route.kind}-${route.id}`;
  }

  private normalizeTypeKey(type: string): string {
    const normalized = String(type || '')
      .toLowerCase()
      .replace(/\s+/g, '_');
    const knownTypes = new Set([
      'attraction',
      'restaurant',
      'cultural_site',
      'monument',
      'club',
      'sports_facility',
      'event',
      'accommodation',
      'shop',
      'other',
    ]);
    return knownTypes.has(normalized) ? normalized : 'other';
  }

  private cloneSavedFilters(filters: SavedMiniFilterState): SavedMiniFilterState {
    return {
      placeCategories: [...filters.placeCategories],
      placeMinRating: filters.placeMinRating,
      routeStopBucket: filters.routeStopBucket,
      routeModes: [...filters.routeModes],
      routeDistanceSort: filters.routeDistanceSort,
      routeDistanceMin: filters.routeDistanceMin,
      routeDistanceMax: filters.routeDistanceMax,
    };
  }

  private resetSavedFiltersScroll(): void {
    this.setSavedFiltersScrollTop(0);
    requestAnimationFrame(() => {
      this.setSavedFiltersScrollTop(0);
      requestAnimationFrame(() => this.setSavedFiltersScrollTop(0));
    });
    setTimeout(() => this.setSavedFiltersScrollTop(0), 0);
  }

  private setSavedFiltersScrollTop(top: number): void {
    const el = this.savedFiltersScroll?.nativeElement;
    if (!el) return;
    el.scrollTop = top;
  }

  private lockSavedBackgroundScroll(): void {
    document.body.style.overflow = 'hidden';
  }

  private unlockSavedBackgroundScroll(): void {
    document.body.style.overflow = '';
  }

  private matchesSavedPlace(item: SavedDisplayItem, query: string, filters: SavedMiniFilterState): boolean {
    if (filters.placeCategories.length > 0 && !filters.placeCategories.includes(item.categoryKey)) {
      return false;
    }

    if (filters.placeMinRating > 0 && Number(item.rating || 0) < filters.placeMinRating) {
      return false;
    }

    const terms = this.normalizeSearchTerms(query);
    if (terms.length === 0) {
      return true;
    }

    const searchable = [
      item.title,
      item.category,
      item.regionName,
      item.country,
      item.address,
      item.description,
      ...(item.tagNames ?? []),
    ]
      .filter(Boolean)
      .map(value => String(value).toLowerCase())
      .join(' ');

    return terms.every(term => searchable.includes(term));
  }

  private matchesSavedRoute(route: SavedRouteLibraryItem, query: string, filters: SavedMiniFilterState): boolean {
    if (!this.matchesRouteStopBucket(route, filters.routeStopBucket)) {
      return false;
    }

    if (filters.routeModes.length > 0) {
      const mode = String(route.travelMode || '').toLowerCase();
      if (!filters.routeModes.includes(mode)) {
        return false;
      }
    }

    const minDistance = this.parseDistanceBound(filters.routeDistanceMin);
    if (minDistance !== null && (route.distanceKm || 0) < minDistance) {
      return false;
    }

    const maxDistance = this.parseDistanceBound(filters.routeDistanceMax);
    if (maxDistance !== null && (route.distanceKm || 0) > maxDistance) {
      return false;
    }

    const terms = this.normalizeSearchTerms(query);
    if (terms.length === 0) {
      return true;
    }

    const searchable = [
      route.title,
      route.description,
      route.regionName,
      route.countryName,
      route.travelMode,
      route.difficulty,
      ...route.waypoints.map(point => point.name || ''),
    ]
      .filter(Boolean)
      .map(value => String(value).toLowerCase())
      .join(' ');

    return terms.every(term => searchable.includes(term));
  }

  private matchesRouteStopBucket(route: SavedRouteLibraryItem, bucket: SavedRouteStopBucket): boolean {
    if (bucket === 'all') {
      return true;
    }

    const stops = route.waypoints.length || 0;
    if (bucket === '1') {
      return stops <= 1;
    }
    if (bucket === '2-3') {
      return stops >= 2 && stops <= 3;
    }
    return stops >= 4;
  }
  private normalizeSearchTerms(query: string): string[] {
    return String(query || '')
      .toLowerCase()
      .split(/\s+/)
      .map(term => term.trim())
      .filter(Boolean);
  }

  private sortSavedRoutes(routes: SavedRouteLibraryItem[], sort: SavedRouteDistanceSort): SavedRouteLibraryItem[] {
    const next = [...routes];
    if (sort === 'distance-asc') {
      return next.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }
    if (sort === 'distance-desc') {
      return next.sort((a, b) => (b.distanceKm || 0) - (a.distanceKm || 0));
    }
    return next;
  }

  private parseDistanceBound(value: string): number | null {
    const normalized = String(value ?? '').trim().replace(',', '.');
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
  }
}
