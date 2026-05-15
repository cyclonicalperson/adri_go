import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import * as L from 'leaflet';
import { MapRecommendationsPanelComponent } from './components/map-recommendations-panel/map-recommendations-panel.component';
import { RouteDetoursPanelComponent } from './components/route-detours-panel/route-detours-panel.component';
import { MapNavigationPanelComponent } from './components/map-navigation-panel/map-navigation-panel.component';
import { LocationDetailsCardComponent } from '../location-details-card/location-details-card';
import { TripPlannerPanelComponent } from './components/trip-planner-panel/trip-planner-panel.component';
import { FiltersComponent } from '../Filteri/filters.component';
import { AuthService } from '../services/auth.service';
import { LocationService, Location } from '../services/location.service';
import { FilterStateService, FilterState } from '../services/filter-state.service';
import { GeolocationService, UserPosition } from '../services/geolocation.service';
import { UserService, CalendarItem, UserProfile, ServerPreferences } from '../services/user.service';
import { PlannerStop, RoutePlannerService } from '../services/route-planner.service';
import { ComputedRoute, NavigationStep, RoutingService, RouteSummary } from '../services/routing.service';
import { TravelMode, TouristPreferencesService } from '../services/tourist-preferences.service';
import { TouristAnalyticsService } from '../services/tourist-analytics.service';
import {
  LocationRecommendation,
  RecommendationService,
  RouteDetourSuggestion
} from '../services/recommendation.service';
import { SavedRoute, SavedRoutesService } from '../services/saved-routes.service';
import { formatPostType } from '../utils/post-type.utils';

type RecommendationTab = 'personalized' | 'global';

type MapLocation = Location & {
  distanceKm?: number | null;
};

@Component({
  selector: 'app-map-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LocationDetailsCardComponent,
    TripPlannerPanelComponent,
    RouteDetoursPanelComponent,
    MapRecommendationsPanelComponent,
    MapNavigationPanelComponent,
    FiltersComponent,
  ],
  templateUrl: './map-home.component.html',
  styleUrls: ['./map-home.component.css']
})
export class MapHomeComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly IMAGE_BASE_URL = 'http://localhost:5125/';

  selectedLocation: MapLocation | null = null;
  isMenuOpen = false;
  activeTab = 'map';
  sheetExpanded = false;
  private map: L.Map | undefined;
  private markers: { loc: MapLocation; marker: L.Marker }[] = [];
  private userMarker: L.Marker<any> | null = null;
  private routeStopMarkers: L.Marker[] = [];
  private latestQueryParams: Record<string, string> = {};
  private lastHydratedQueryKey = '';
  private plannerRenderToken = 0;
  private locationWatchId: number | null = null;
  private hasCenteredOnUserLocation = false;
  private plannerRouteGeometry: [number, number][] = [];
  private mapResizeTimerId: ReturnType<typeof setTimeout> | null = null;

  showAuthPopup = false;
  routePolyline: L.Polyline | null = null;
  private walkingDotMarkers: L.Layer[] = [];
  routeDestTitle = '';
  showRoutePanel = false;
  isRenderingRoute = false;
  isSavingTrip = false;

  searchQuery = '';
  searchResults: MapLocation[] = [];
  globalRecommendations: LocationRecommendation[] = [];
  personalizedRecommendations: LocationRecommendation[] = [];
  activeRecommendationTab: RecommendationTab = 'personalized';
  locationsList: MapLocation[] = [];
  plannerStops: PlannerStop[] = [];
  scenicSuggestions: RouteDetourSuggestion[] = [];
  plannerMessage = '';
  plannerMode = false;
  scenicMode = true;
  travelMode: TravelMode = 'driving';
  routeSummary: RouteSummary = {
    distanceKm: 0,
    durationMin: 0,
    stopCount: 0,
  };

  userProfile: UserProfile | null = null;
  savedLocationsContext: Location[] = [];
  calendarItemsContext: CalendarItem[] = [];
  private serverPreferenceTypes: string[] = [];

  // ─── Navigation state ────────────────────────────────────────────────────
  isNavigating = false;
  navigationSteps: NavigationStep[] = [];
  navigationRouteGeometry: [number, number][] = [];

  // ─── Navigation map behavior ─────────────────────────────────────────────
  /** Whether the map is currently auto-following the user during navigation */
  navFollowMode = true;
  /** Current map rotation angle in degrees (compass heading) */
  private navMapRotation = 0;
  /** Navigation polyline showing only the REMAINING route */
  private navRemainingPolyline: L.Polyline | null = null;
  /** Timer ID for auto-refollow after user pans away */
  private navRefollowTimerId: ReturnType<typeof setTimeout> | null = null;
  /** How long (ms) to wait before auto-returning to follow mode */
  private readonly NAV_REFOLLOW_DELAY_MS = 8000;
  /** Interpolated marker element for smooth movement — avoid remove/add on every tick */
  private navUserMarkerEl: HTMLElement | null = null;
  private previousNavigationZoomOptions: Pick<L.MapOptions, 'scrollWheelZoom' | 'doubleClickZoom' | 'touchZoom'> | null = null;
  private wakeLock: any = null;
  private readonly onVisibilityChange = () => {
    if (document.visibilityState === 'visible' && this.isNavigating) {
      void this.requestScreenWakeLock();
    }
  };
  private readonly handleWindowResize = () => this.scheduleMapViewportRefresh();
  private readonly handleNavigationZoomRecenter = () => this.centerNavigationOnUser(false);
  private autoLocatePermissionStatus: PermissionStatus | null = null;
  private readonly handleAutoLocatePermissionChange = () => this.tryAutoLocateUser();

  showClearRouteConfirm = false;

  // ─── Saved routes ────────────────────────────────────────────────────────
  savedRoutes: SavedRoute[] = [];
  showSavedRoutes = false;
  saveRouteMessage = '';

  // ─── Locate-me FAB ───────────────────────────────────────────────────────
  isLocating = false;

  categories = [
    { key: 'attraction', label: 'Attractions', icon: '🏖️', active: false },
    { key: 'restaurant', label: 'Restaurants', icon: '🍽️', active: false },
    { key: 'cultural_site', label: 'Culture', icon: '🏛️', active: false },
    { key: 'monument', label: 'Monuments', icon: '🗿', active: false },
    { key: 'club', label: 'Nightlife', icon: '🎉', active: false },
    { key: 'sports_facility', label: 'Activities', icon: '🏄', active: false },
    { key: 'event', label: 'Events', icon: '📅', active: false },
    { key: 'accommodation', label: 'Accommodation', icon: '🏨', active: false },
    { key: 'shop', label: 'Shopping', icon: '🛍️', active: false },
  ];

  filterMinRating = 0;
  filterOpenNow = false;
  filterRadius = 0;
  filterShowOnlySaved = false;
  filterSavedPostIds: number[] = [];
  userPosition: [number, number] | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly resolveRecommendationImage = (location: any): string => this.getFirstImage(location);

  get hasActiveFilters(): boolean {
    return this.filterMinRating > 0
      || this.filterOpenNow
      || (this.filterRadius > 0 && !!this.userPosition)
      || this.hasAnyCategorySelected
      || this.filterShowOnlySaved;
  }

  /** True when at least one category chip is selected (filled) */
  get hasAnyCategorySelected(): boolean {
    return this.categories.some(c => c.active);
  }

  get allCategoriesActive(): boolean {
    return this.categories.every(c => c.active);
  }

  get noCategoriesActive(): boolean {
    return this.categories.every(c => !c.active);
  }

  get recommendationCards(): LocationRecommendation[] {
    return this.globalRecommendations;
  }

  get hasPersonalizedRecommendations(): boolean {
    return false;
  }

  // ─── Category colors (used for map pins AND chip active state) ───────────
  readonly categoryColors: Record<string, { bg: string; icon: string }> = {
    accommodation:   { bg: '#3b82f6', icon: 'accommodation' },
    restaurant:      { bg: '#ef4444', icon: 'food' },
    club:            { bg: '#8b5cf6', icon: 'nightlife' },
    cultural_site:   { bg: '#f59e0b', icon: 'culture' },
    monument:        { bg: '#d97706', icon: 'monument' },
    sports_facility: { bg: '#22c55e', icon: 'activity' },
    event:           { bg: '#ec4899', icon: 'events' },
    attraction:      { bg: '#10b981', icon: 'beach' },
    shop:            { bg: '#f97316', icon: 'shop' },
    other:           { bg: '#6b7280', icon: 'default' },
  };

  private readonly svgIcons: Record<string, string> = {
    beach:         '<path d="M13.127 14.56l1.43-1.43 6.44 6.443L19.57 21zm4.293-5.73l2.86-2.86c-3.95-3.95-10.35-3.96-14.3-.02 3.93-1.3 8.31-.25 11.44 2.88zM5.95 5.98c-3.94 3.95-3.93 10.35.02 14.3l2.86-2.86C5.7 14.29 4.65 9.91 5.95 5.98zm.02-.02l-.01.01c-.38 3.01 1.17 6.88 4.7 10.41l5.39-5.39c-3.53-3.53-7.4-5.09-10.08-5.03z"/>',
    culture:       '<path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 12.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>',
    monument:      '<path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 12.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>',
    food:          '<path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>',
    nightlife:     '<path d="M7 2h10l2 6-7 14L5 8l2-6zm1.44 6l3.56 7.13L15.56 8H8.44zM9 4l-.67 2h7.34L15 4H9z"/>',
    activity:      '<path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/>',
    events:        '<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>',
    accommodation: '<path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/>',
    shop:          '<path d="M16 6V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H2v13c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6h-6zm-6-2h4v2h-4V4zM11 17H9v-6h2v6zm4 0h-2v-6h2v6z"/>',
    default:       '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>',
  };

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    public authService: AuthService,
    private locationService: LocationService,
    private filterStateService: FilterStateService,
    private geolocationService: GeolocationService,
    private userService: UserService,
    private routePlanner: RoutePlannerService,
    private routingService: RoutingService,
    private preferences: TouristPreferencesService,
    private analytics: TouristAnalyticsService,
    private recommendationService: RecommendationService,
    private savedRoutesService: SavedRoutesService,
  ) {}

  ngOnInit(): void {
    this.applyFilterState();
    this.syncPlannerStateFromServices();
    this.savedRoutes = this.savedRoutesService.getAll();
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.startLocationTracking();
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('resize', this.handleWindowResize);
    this.tryAutoLocateUser();
    this.loadPersonalizationContext();
    this.loadLocations();
    this.activatedRoute.queryParams.subscribe(params => {
      this.latestQueryParams = Object.fromEntries(
        Object.entries(params).map(([key, value]) => [key, String(value)])
      );
      this.tryHydratePlannerFromQuery();
    });
  }

  ngOnDestroy(): void {
    // Restore patched Leaflet draggable if it was modified
    const draggable = (this as any)._patchedDraggable;
    const original = (this as any)._originalOnMove;
    if (draggable && original) {
      draggable._onMove = original;
    }
    this.map?.remove();
    this.stopLocationTracking();
    this.clearNavRefollowTimer();
    this.clearMapResizeTimer();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('resize', this.handleWindowResize);
    this.autoLocatePermissionStatus?.removeEventListener?.('change', this.handleAutoLocatePermissionChange);
    this.autoLocatePermissionStatus = null;
    void this.releaseScreenWakeLock();
  }

  loadLocations(): void {
    this.locationService.getLocations(1, 200).subscribe({
      next: (res) => {
        this.locationsList = res.data as MapLocation[];
        this.updateDistancesAndRecommendations();
        this.syncGuestSavedContext();
        this.refreshRecommendations();
        this.addMarkers();
        this.tryHydratePlannerFromQuery();
        this.hydratePlannerFromStorage();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load locations:', err)
    });
  }

  private syncPlannerStateFromServices(): void {
    const plan = this.routePlanner.snapshot;
    this.plannerStops = plan.stops;
    this.plannerMode = plan.plannerMode;
    this.scenicMode = plan.scenicMode;
    this.travelMode = plan.travelMode || this.preferences.snapshot.preferredTravelMode;
    this.showRoutePanel = this.plannerStops.length > 0;
    this.routeDestTitle = this.getRouteTitle();
  }

  private loadPersonalizationContext(): void {
    if (!this.authService.isLoggedIn) {
      this.userProfile = null;
      this.savedLocationsContext = [];
      this.calendarItemsContext = [];
      this.serverPreferenceTypes = [];
      return;
    }

    forkJoin({
      profile: this.userService.getUserProfile().pipe(catchError(() => of(null))),
      saved: this.locationService.getMySavedPosts().pipe(catchError(() => of([] as Location[]))),
      calendar: this.userService.getCalendar().pipe(catchError(() => of([] as CalendarItem[]))),
      serverPrefs: this.userService.getMyServerPreferences().pipe(catchError(() => of(null as ServerPreferences | null))),
    }).subscribe({
      next: (result) => {
        this.userProfile = result.profile;
        this.savedLocationsContext = result.saved;
        this.calendarItemsContext = result.calendar;
        this.serverPreferenceTypes = (result.serverPrefs?.postTypePreferences ?? [])
          .slice(0, 5)
          .map(p => p.postType)
          .filter(Boolean);
        this.refreshRecommendations();
        this.cdr.detectChanges();
      },
      error: () => {
        this.userProfile = null;
        this.savedLocationsContext = [];
        this.calendarItemsContext = [];
        this.serverPreferenceTypes = [];
        this.refreshRecommendations();
        this.cdr.detectChanges();
      }
    });
  }

  private syncGuestSavedContext(): void {
    if (this.authService.isLoggedIn) {
      return;
    }

    this.savedLocationsContext = [];
  }

  private refreshRecommendations(): void {
    if (this.locationsList.length === 0) {
      this.globalRecommendations = [];
      this.personalizedRecommendations = [];
      return;
    }

    this.globalRecommendations = this.buildNearbyCards();
    this.personalizedRecommendations = [];
    this.activeRecommendationTab = 'global';
  }

  private buildNearbyCards(): LocationRecommendation[] {
    const withDistance = this.locationsList
      .filter(location => this.passesFilters(location))
      .map(location => {
        const coordinates = this.getLocationCoordinates(location);
        const distanceKm = this.userPosition && coordinates
          ? this.geolocationService.haversineKm(
              { lat: this.userPosition[0], lng: this.userPosition[1] },
              coordinates
            )
          : location.distanceKm ?? null;

        const fallbackScore = (location.avgRating ?? 0) * 10
          + (location.reviewCount ?? 0)
          + (location.likeCount ?? 0) * 0.2;

        return {
          location: { ...location, distanceKm },
          score: distanceKm == null ? fallbackScore : Math.max(0, 100 - distanceKm),
          badge: distanceKm == null ? 'Nearby' : this.formatDistance(distanceKm),
          reason: distanceKm == null
            ? 'Enable location sharing to sort this spot by distance.'
            : `${this.formatDistance(distanceKm)} from your current location.`,
        };
      });

    return withDistance
      .sort((a, b) => {
        const da = a.location.distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b.location.distanceKm ?? Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
        return b.score - a.score;
      })
      .slice(0, 6);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getFirstImage(loc: any): string {
    if (loc.imageUrl) {
      const url: string = loc.imageUrl;
      if (!url.startsWith('http')) {
        const clean = url.startsWith('/') ? url.substring(1) : url;
        return `${this.IMAGE_BASE_URL}${clean}`;
      }
      return url;
    }

    const imagesValue = loc.images;
    if (!imagesValue) return 'assets/Budva.jpg';

    let firstImg = '';
    if (typeof imagesValue === 'string') {
      try {
        const parsed = JSON.parse(imagesValue) as string[];
        firstImg = parsed[0] || '';
      } catch {
        firstImg = imagesValue;
      }
    } else if (Array.isArray(imagesValue) && imagesValue.length > 0) {
      firstImg = imagesValue[0];
    }

    if (!firstImg) return 'assets/Budva.jpg';
    if (!firstImg.startsWith('http')) {
      const clean = firstImg.startsWith('/') ? firstImg.substring(1) : firstImg;
      return `${this.IMAGE_BASE_URL}${clean}`;
    }
    return firstImg;
  }

  /**
   * Returns the background color for a category key — same colour used on the map pin.
   * Falls back to the 'other' colour when the key is unknown.
   */
  getCategoryColor(categoryKey: string): string {
    const key = categoryKey.toLowerCase().replace(/\s+/g, '_');
    return (this.categoryColors[key] ?? this.categoryColors['other']).bg;
  }

  focusOnLocation(loc: MapLocation): void {
    const coordinates = this.getLocationCoordinates(loc);
    if (this.map && coordinates) {
      this.map.flyTo([coordinates.lat, coordinates.lng], 16, { animate: true, duration: 1 });
      this.selectedLocation = loc;
      this.analytics.track('location_opened', {
        postId: loc.id,
        postType: loc.postType,
        regionName: loc.regionName,
      });
      this.cdr.detectChanges();
    }
  }

  focusOnPlannerStop(stop: PlannerStop): void {
    if (!this.map) {
      return;
    }

    this.map.flyTo([stop.lat, stop.lng], 15, { animate: true, duration: 1 });
    const matched = this.locationsList.find(location => location.id === stop.id) ?? null;
    this.selectedLocation = matched;
    this.cdr.detectChanges();
  }

  toggleCategory(cat: { active: boolean; key: string }): void {
    cat.active = !cat.active;
    this.syncFilterState();
    this.applyMarkerFilter();
    this.refreshRecommendations();
    if (this.searchQuery.trim()) this.onSearchInput(this.searchQuery);
  }

  toggleAllCategories(): void {
    // Ako je bar jedan selektovan — deselektuj sve (vidi se sve)
    // Ako nijedan nije selektovan — nema potrebe za ovom akcijom, ali ostavi je
    const shouldDeselect = this.hasAnyCategorySelected;
    this.categories.forEach(c => c.active = !shouldDeselect);
    this.syncFilterState();
    this.applyMarkerFilter();
  }

  togglePlannerMode(): void {
    this.plannerMode = !this.plannerMode;
    this.routePlanner.setPlannerMode(this.plannerMode);
    this.plannerMessage = this.plannerMode
      ? 'Route builder is active. Tap pins to add stops.'
      : 'Route builder paused. You can still manage the current trip.';
    setTimeout(() => {
      this.plannerMessage = '';
      this.cdr.detectChanges();
    }, 2600);
    this.cdr.detectChanges();
  }

  stopPlannerMode(): void {
    this.plannerMode = false;
    this.routePlanner.setPlannerMode(false);
    this.plannerMessage = '';
    this.cdr.detectChanges();
  }

  addSelectedLocationToPlanner(): void {
    if (!this.selectedLocation) {
      return;
    }
    this.addLocationToPlanner(this.selectedLocation, true);
  }

  addLocationToPlanner(location: Location, fromPin = false, insertAfterIndex?: number): void {
    try {
      const beforeCount = this.routePlanner.snapshot.stops.length;
      this.routePlanner.addStop(location, { insertAfterIndex });
      this.routePlanner.setPlannerMode(true);
      this.syncPlannerStateFromServices();
      this.renderPlannerRoute();
      if (this.routePlanner.snapshot.stops.length === beforeCount) {
        this.plannerMessage = `${location.title} is already in your trip.`;
      } else {
        this.plannerMessage = fromPin
          ? `${location.title} added from the map.`
          : `${location.title} added to your trip.`;
      }
      this.analytics.track('planner_stop_added', {
        source: fromPin ? 'map-pin' : 'planner',
        postId: location.id,
        postType: location.postType,
        regionName: location.regionName,
      });
      this.cdr.detectChanges();
      setTimeout(() => {
        this.plannerMessage = '';
        this.cdr.detectChanges();
      }, 2800);
    } catch {
      this.plannerMessage = 'This location is missing coordinates.';
      this.cdr.detectChanges();
    }
  }

  removePlannerStop(stopId: number): void {
    this.routePlanner.removeStop(stopId);
    this.syncPlannerStateFromServices();
    this.renderPlannerRoute();
  }

  movePlannerStop(index: number, direction: 'up' | 'down'): void {
    const target = direction === 'up' ? index - 1 : index + 1;
    this.routePlanner.moveStop(index, target);
    this.syncPlannerStateFromServices();
    this.renderPlannerRoute();
  }

  optimizePlannerStops(): void {
    const optimized = this.recommendationService.optimizeStopOrder(this.plannerStops, this.userPosition);
    this.routePlanner.replaceStops(optimized, {
      plannerMode: true,
      scenicMode: this.scenicMode,
      travelMode: this.travelMode,
    });
    this.syncPlannerStateFromServices();
    this.renderPlannerRoute();
    this.plannerMessage = 'Trip order optimized for smoother travel.';
    this.analytics.track('planner_optimized', { stopCount: optimized.length });
    this.cdr.detectChanges();
    setTimeout(() => {
      this.plannerMessage = '';
      this.cdr.detectChanges();
    }, 2400);
  }

  toggleScenicMode(): void {
    this.scenicMode = !this.scenicMode;
    this.routePlanner.setScenicMode(this.scenicMode);
    this.renderPlannerRoute();
  }

  setTravelMode(mode: TravelMode): void {
    const changed = this.travelMode !== mode;
    this.travelMode = mode;
    this.routePlanner.setTravelMode(mode);
    this.preferences.update({ preferredTravelMode: mode });
    this.plannerMessage = '';

    if (changed || this.plannerStops.length > 0) {
      this.renderPlannerRoute();
    }

    this.analytics.track('planner_travel_mode_changed', {
      travelMode: mode,
      stopCount: this.plannerStops.length,
    });
    this.cdr.detectChanges();
  }

  async changeNavigationMode(mode: TravelMode): Promise<void> {
    if (this.travelMode === mode) return;

    if (!this.isNavigating) {
      this.setTravelMode(mode);
      return;
    }

    this.travelMode = mode;
    this.routePlanner.setTravelMode(mode);
    this.preferences.update({ preferredTravelMode: mode });

    const coordinates = this.getRouteCoordinates();
    if (coordinates.length < 2) {
      this.cdr.detectChanges();
      return;
    }

    this.isRenderingRoute = true;
    this.plannerMessage = '';
    this.analytics.track('navigation_travel_mode_changed', {
      travelMode: mode,
      stopCount: this.plannerStops.length,
    });

    try {
      const result = await this.routingService.computeRouteForNavigation(
        coordinates,
        mode,
        { viewport: this.getRouteViewportMode() },
      );
      this.navigationSteps = result.steps ?? [];
      this.navigationRouteGeometry = result.geometry;
      this.routeSummary = {
        distanceKm: result.distanceKm,
        durationMin: result.durationMin,
        stopCount: this.plannerStops.length,
      };
      this.routeDestTitle = this.getRouteTitle();
      this.replaceNavigationRouteOverlay(result.geometry);
      if (this.navFollowMode) {
        this.centerNavigationOnUser(false);
      }
    } catch {
      this.plannerMessage = 'Could not switch navigation mode right now.';
      setTimeout(() => {
        this.plannerMessage = '';
        this.cdr.detectChanges();
      }, 2400);
    } finally {
      this.isRenderingRoute = false;
      this.cdr.detectChanges();
    }
  }

  applyDetourSuggestion(suggestion: RouteDetourSuggestion): void {
    this.addLocationToPlanner(suggestion.location, false, suggestion.insertAfterIndex);
    this.optimizeRouteSilently();
    this.analytics.track('planner_detour_applied', {
      postId: suggestion.location.id,
      postType: suggestion.location.postType,
      distanceToRouteKm: suggestion.distanceToRouteKm,
    });
  }

  private optimizeRouteSilently(): void {
    if (this.plannerStops.length < 2) return;
    const optimized = this.recommendationService.optimizeStopOrder(this.plannerStops, this.userPosition);
    this.routePlanner.replaceStops(optimized, {
      plannerMode: true,
      scenicMode: this.scenicMode,
      travelMode: this.travelMode,
    });
    this.syncPlannerStateFromServices();
    this.renderPlannerRoute();
  }

  private hydratePlannerFromStorage(): void {
    this.syncPlannerStateFromServices();
    this.renderPlannerRoute();
  }

  private tryHydratePlannerFromQuery(): void {
    if (this.locationsList.length === 0) {
      return;
    }

    const key = JSON.stringify(this.latestQueryParams);
    if (key === this.lastHydratedQueryKey) {
      return;
    }
    this.lastHydratedQueryKey = key;

    const tripParam = this.latestQueryParams['trip'];
    const directTo = this.latestQueryParams['directTo'];
    const focusId = Number(this.latestQueryParams['focusId']);
    const plannerFlag = this.latestQueryParams['planner'] === '1';
    const scenicFlag = this.latestQueryParams['scenic'];
    const modeParam = this.latestQueryParams['mode'];

    if (modeParam === 'walking' || modeParam === 'cycling' || modeParam === 'driving') {
      this.routePlanner.setTravelMode(modeParam);
      this.travelMode = modeParam;
    }

    if (scenicFlag === '0' || scenicFlag === '1') {
      this.routePlanner.setScenicMode(scenicFlag === '1');
      this.scenicMode = scenicFlag === '1';
    }

    if (Number.isFinite(focusId) && focusId > 0) {
      const matched = this.locationsList.find(location => location.id === focusId);
      if (matched) {
        this.focusOnLocation(matched);
      }
    }

    if (tripParam) {
      const tripIds = tripParam
        .split(',')
        .map(value => Number(value))
        .filter(value => Number.isFinite(value) && value > 0);
      const locations = tripIds
        .map(id => this.locationsList.find(location => location.id === id))
        .filter((location): location is MapLocation => !!location);
      if (locations.length > 0) {
        this.routePlanner.replaceStops(locations, {
          plannerMode: true,
          scenicMode: scenicFlag !== '0',
          travelMode: this.travelMode,
        });
      }
    } else if (directTo) {
      const [latRaw, lngRaw] = directTo.split(',');
      const lat = Number(latRaw);
      const lng = Number(lngRaw);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        const matched = this.locationsList.find(location => {
          const locationLat = location.lat ?? location.latitude;
          const locationLng = location.lng ?? location.longitude;
          return locationLat != null
            && locationLng != null
            && Math.abs(locationLat - lat) < 0.0001
            && Math.abs(locationLng - lng) < 0.0001;
        });

        if (matched) {
          this.routePlanner.replaceStops([matched], {
            plannerMode: true,
            scenicMode: scenicFlag !== '0',
            travelMode: this.travelMode,
          });
        } else {
          this.routePlanner.replaceStops([{
            id: -(Math.round(lat * 100000) + Math.round(lng * 100000)),
            title: this.latestQueryParams['destTitle'] || 'Destination',
            postType: 'attraction',
            lat,
            lng,
          }], {
            plannerMode: true,
            scenicMode: scenicFlag !== '0',
            travelMode: this.travelMode,
          });
        }
      }
    } else if (plannerFlag && this.routePlanner.snapshot.stops.length > 0) {
      this.routePlanner.setPlannerMode(true);
    }

    this.syncPlannerStateFromServices();
    this.renderPlannerRoute();
  }

  private renderPlannerRoute(): void {
    this.clearRouteVisuals();
    this.syncPlannerStateFromServices();
    this.syncStopMarkers();
    this.showRoutePanel = this.plannerStops.length > 0;
    this.routeDestTitle = this.getRouteTitle();
    this.routeSummary = {
      distanceKm: 0,
      durationMin: 0,
      stopCount: this.plannerStops.length,
    };

    if (!this.map || this.plannerStops.length === 0) {
      this.scenicSuggestions = [];
      this.cdr.detectChanges();
      return;
    }

    const routeCoordinates = this.getRouteCoordinates();

    if (routeCoordinates.length < 2) {
      const onlyStop = this.plannerStops[0];
      if (this.preferences.snapshot.locationSharing && !this.userPosition) {
        this.tryAutoLocateUser();
      }
      this.map.flyTo([onlyStop.lat, onlyStop.lng], 14, { animate: true, duration: 1 });
      this.scenicSuggestions = this.buildNearbyStopSuggestions(onlyStop);
      this.cdr.detectChanges();
      return;
    }

    if (this.plannerStops.length === 1) {
      this.scenicSuggestions = this.buildNearbyStopSuggestions(this.plannerStops[0]);
    }

    this.isRenderingRoute = true;
    const renderToken = ++this.plannerRenderToken;

    this.routingService.computeRoute(routeCoordinates, this.travelMode, { viewport: this.getRouteViewportMode() })
      .then(route => {
        if (renderToken !== this.plannerRenderToken || !this.map) {
          return;
        }

        this.drawPlannerPolyline(route);
        this.routeSummary = {
          distanceKm: route.distanceKm,
          durationMin: route.durationMin,
          stopCount: this.plannerStops.length,
        };
        this.routeDestTitle = this.getRouteTitle();
        // suggestDetours requires 2+ stops; for single-stop, keep the nearby suggestions set earlier
        if (this.plannerStops.length >= 2) {
          this.scenicSuggestions = this.scenicMode
            ? this.recommendationService.suggestDetours(this.plannerStops, route.geometry, this.locationsList, {
                contentPreferences: this.preferences.snapshot.contentPreferences.length > 0
                  ? this.preferences.snapshot.contentPreferences
                  : (this.userProfile?.interests ?? []),
                userPosition: this.userPosition,
                limit: 4,
              })
            : [];
        }

        if (route.usedFallback) {
          this.plannerMessage = 'Live routing is unavailable right now. We are showing a scenic stop sequence instead.';
        }
      })
      .catch(() => {
        if (renderToken !== this.plannerRenderToken) {
          return;
        }

        this.scenicSuggestions = [];
        this.plannerMessage = 'We could not calculate this route right now.';
      })
      .finally(() => {
        if (renderToken !== this.plannerRenderToken) {
          return;
        }

        this.isRenderingRoute = false;
        this.cdr.detectChanges();
      });
  }

  private buildNearbyStopSuggestions(stop: PlannerStop): RouteDetourSuggestion[] {
    return this.locationsList
      .filter(location => location.id !== stop.id)
      .map(location => {
        const coordinates = this.getLocationCoordinates(location);
        if (!coordinates) return null;

        const distanceKm = this.geolocationService.haversineKm(
          { lat: stop.lat, lng: stop.lng },
          coordinates
        );
        return {
          location,
          score: (location.avgRating ?? 0) * 10 + Math.max(0, 12 - distanceKm),
          reason: 'Easy add-on near your current stop',
          distanceToRouteKm: Math.round(distanceKm * 10) / 10,
          estimatedExtraMinutes: Math.max(6, Math.round(distanceKm * 5)),
          insertAfterIndex: 0,
        } as RouteDetourSuggestion;
      })
      .filter((item): item is RouteDetourSuggestion => !!item && item.distanceToRouteKm <= 12)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  private clearRouteVisuals(): void {
    this.plannerRouteGeometry = [];
    if (this.routePolyline) {
      this.map?.removeLayer(this.routePolyline);
      this.routePolyline = null;
    }
    if (this.navRemainingPolyline) {
      this.map?.removeLayer(this.navRemainingPolyline);
      this.navRemainingPolyline = null;
    }
    this.walkingDotMarkers.forEach(m => this.map?.removeLayer(m));
    this.walkingDotMarkers = [];
    this.routeStopMarkers.forEach(marker => this.map?.removeLayer(marker));
    this.routeStopMarkers = [];
  }

  private syncStopMarkers(): void {
    this.routeStopMarkers.forEach(marker => this.map?.removeLayer(marker));
    this.routeStopMarkers = [];

    if (!this.map) {
      return;
    }

    this.plannerStops.forEach((stop, index) => {
      const marker = L.marker([stop.lat, stop.lng], {
        icon: L.divIcon({
          html: `<div style="width:30px;height:30px;border-radius:50%;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;border:2px solid #fff;box-shadow:0 8px 18px rgba(15,23,42,0.22);">${index + 1}</div>`,
          className: '',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
        zIndexOffset: 1400,
      }).addTo(this.map!);

      marker.bindPopup(`<strong>${stop.title}</strong>`);
      this.routeStopMarkers.push(marker);
    });
  }

  private getRouteCoordinates(): [number, number][] {
    const coordinates = this.plannerStops.map(stop => [stop.lat, stop.lng] as [number, number]);
    const allowUserStart = this.preferences.snapshot.locationSharing && !!this.userPosition;
    return allowUserStart && this.userPosition
      ? [this.userPosition, ...coordinates]
      : coordinates;
  }

  private getRouteTitle(): string {
    if (this.plannerStops.length === 0) {
      return '';
    }
    if (this.plannerStops.length === 1) {
      return this.plannerStops[0].title;
    }
    return this.scenicMode
      ? `${this.plannerStops.length}-stop scenic trip`
      : `${this.plannerStops.length}-stop route`;
  }

  requestClearRoute(): void {
    if (this.isNavigating) {
      this.clearRoute();
      return;
    }
    this.showClearRouteConfirm = true;
    this.cdr.detectChanges();
  }

  confirmClearRoute(): void {
    this.showClearRouteConfirm = false;
    this.clearRoute();
  }

  cancelClearRoute(): void {
    this.showClearRouteConfirm = false;
    this.cdr.detectChanges();
  }

  clearRoute(): void {
    this.plannerRenderToken++;
    this.routePlanner.clear();
    this.plannerStops = [];
    this.plannerMode = false;
    this.scenicMode = true;
    this.scenicSuggestions = [];
    this.routeSummary = { distanceKm: 0, durationMin: 0, stopCount: 0 };
    this.showRoutePanel = false;
    this.routeDestTitle = '';
    this.plannerMessage = '';
    this.isNavigating = false;
    this.navigationSteps = [];
    this.clearRouteVisuals();
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
    this.cdr.detectChanges();
  }

  saveCurrentRoute(): void {
    if (!this.authService.isLoggedIn) {
      this.showAuthPopup = true;
      return;
    }
    if (this.plannerStops.length === 0) return;
    const title = this.routeDestTitle || this.getRouteTitle();
    const saved = this.savedRoutesService.save(
      this.plannerStops,
      this.travelMode,
      this.scenicMode,
      title,
      this.routeSummary,
    );
    this.savedRoutes = this.savedRoutesService.getAll();
    this.saveRouteMessage = `Route "${saved.title}" saved!`;
    setTimeout(() => {
      this.saveRouteMessage = '';
      this.cdr.detectChanges();
    }, 2500);
    this.cdr.detectChanges();
  }

  openSavedRoutes(): void {
    if (!this.authService.isLoggedIn) {
      this.showAuthPopup = true;
      return;
    }
    this.showSavedRoutes = true;
  }

  loadSavedRoute(route: SavedRoute): void {
    this.showSavedRoutes = false;
    this.routePlanner.replaceStops(route.stops, {
      plannerMode: true,
      scenicMode: route.scenicMode,
      travelMode: route.travelMode,
    });
    this.syncPlannerStateFromServices();
    this.renderPlannerRoute();
    this.plannerMessage = `Route "${route.title}" loaded.`;
    setTimeout(() => {
      this.plannerMessage = '';
      this.cdr.detectChanges();
    }, 2400);
    this.cdr.detectChanges();
  }

  deleteSavedRoute(id: string): void {
    this.savedRoutesService.delete(id);
    this.savedRoutes = this.savedRoutesService.getAll();
    this.cdr.detectChanges();
  }

  async startNavigation(): Promise<void> {
    this.showClearRouteConfirm = false;
    await this.ensureUserPosition();

    const coordinates = this.getRouteCoordinates();
    if (coordinates.length < 2) {
      this.plannerMessage = this.plannerStops.length === 0
        ? 'Add at least one stop to navigate.'
        : 'Enable location sharing to navigate from your current position, or add a second stop.';
      setTimeout(() => { this.plannerMessage = ''; this.cdr.detectChanges(); }, 3000);
      return;
    }
    try {
      const result = await this.routingService.computeRouteForNavigation(
        coordinates,
        this.travelMode,
        { viewport: this.getRouteViewportMode() },
      );
      this.navigationSteps = result.steps ?? [];
      this.navigationRouteGeometry = result.geometry;
      this.isNavigating = true;
      this.showRoutePanel = false;
      this.selectedLocation = null;
      this.setNavigationMapLock(true);
      void this.requestScreenWakeLock();
      this.sheetExpanded = false;
      this.cdr.detectChanges();
    } catch {
      this.plannerMessage = 'Could not fetch navigation data. Check your connection.';
      setTimeout(() => { this.plannerMessage = ''; this.cdr.detectChanges(); }, 2400);
    }
  }

  private async ensureUserPosition(): Promise<void> {
    if (this.userPosition || !this.preferences.snapshot.locationSharing) {
      return;
    }

    const position = await this.geolocationService.requestCurrentPosition({ maximumAge: 30000 });
    if (position) {
      this.handleUserPositionAvailable(position, { fly: false, rerenderRoute: false });
    }
  }

  stopNavigation(): void {
    this.isNavigating = false;
    this.navigationSteps = [];
    this.navFollowMode = true;
    this.navMapRotation = 0;
    if (this.navUserMarkerEl) {
      this.navUserMarkerEl.style.transition = '';
    }
    this.navUserMarkerEl = null;
    this.clearNavRefollowTimer();
    this.setNavigationMapLock(false);
    void this.releaseScreenWakeLock();

    // Remove the remaining-route overlay
    if (this.navRemainingPolyline && this.map) {
      this.map.removeLayer(this.navRemainingPolyline);
      this.navRemainingPolyline = null;
    }

    // Reset map rotation back to North
    this.applyMapRotation(0, '0.4s ease');

    this.cdr.detectChanges();
  }

  onNavigationPositionUpdated(position: [number, number]): void {
    // Move the user marker smoothly without remove/add (avoids flicker)
    this.moveUserMarkerSmooth(position);

    if (!this.navFollowMode || !this.map) return;
    this.centerNavigationOnUser(false);
  }

  private centerNavigationOnUser(animate: boolean): void {
    if (!this.map || !this.userPosition) return;
    this.map.setView(this.userPosition, this.map.getZoom(), { animate });
  }

  /** Move user marker by updating LatLng directly — no DOM remove/add = no flicker */
  private moveUserMarkerSmooth(position: [number, number]): void {
    this.userPosition = position;

    if (this.userMarker) {
      // Directly update the marker’s latlng (Leaflet API, no recreate)
      this.userMarker.setLatLng(position);

      if (!this.navUserMarkerEl) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.navUserMarkerEl = ((this.userMarker as any).getElement?.() as HTMLElement) ?? null;
        if (this.navUserMarkerEl) {
          this.navUserMarkerEl.style.transition = this.isNavigating && this.navFollowMode
            ? 'none'
            : 'transform 0.8s linear';
        }
      } else {
        this.navUserMarkerEl.style.transition = this.isNavigating && this.navFollowMode
          ? 'none'
          : 'transform 0.8s linear';
      }
    } else {
      // First time: create the marker normally
      this.showUserLocation({ lat: position[0], lng: position[1] }, false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.navUserMarkerEl = ((this.userMarker as any)?.getElement?.() as HTMLElement) ?? null;
      if (this.navUserMarkerEl) {
        this.navUserMarkerEl.style.transition = this.isNavigating && this.navFollowMode
          ? 'none'
          : 'transform 0.8s linear';
      }
    }
  }

  /** Called when the navigation panel has recalculated a new route off-route */
  onNavigationRouteRecalculated(event: { steps: NavigationStep[]; geometry: [number, number][] }): void {
    // Swap in the new steps and geometry
    this.navigationSteps = event.steps;
    this.navigationRouteGeometry = event.geometry;
    this.replaceNavigationRouteOverlay(event.geometry);
    this.cdr.detectChanges();
  }

  private replaceNavigationRouteOverlay(geometry: [number, number][]): void {
    if (this.routePolyline && this.map) {
      this.map.removeLayer(this.routePolyline);
      this.routePolyline = null;
    }
    if (this.navRemainingPolyline && this.map) {
      this.map.removeLayer(this.navRemainingPolyline);
      this.navRemainingPolyline = null;
    }
    this.walkingDotMarkers.forEach(marker => this.map?.removeLayer(marker));
    this.walkingDotMarkers = [];
    if (this.map && geometry.length >= 2) {
      if (this.travelMode === 'walking') {
        this.drawWalkingDots(geometry, true);
      } else {
        this.navRemainingPolyline = L.polyline(geometry, {
          color: '#22c55e',
          weight: 6,
          opacity: 0.9,
        }).addTo(this.map);
      }
    }
  }

  /** Helper: returns the #map DOM element which Leaflet owns.
   *  This is intentionally oversized (142% x 142%) so that tile-loading
   *  covers all corners even when the element is rotated up to 45 degrees.
   *  We rotate this element directly; .map-container clips the overflow. */
  private getMapEl(): HTMLElement | null {
    return this.map?.getContainer() ?? null;
  }

  /** Apply compass rotation to the map element with a smooth transition.
   *  deg=0 resets back to North. */
  private applyMapRotation(deg: number, transition = '0.6s ease-out'): void {
    const el = this.getMapEl();
    if (!el) return;
    el.style.transformOrigin = '50% 50%';
    el.style.transition = `transform ${transition}`;
    el.style.transform = deg === 0 ? '' : `rotate(${deg}deg)`;
  }

  /** Called when the navigation panel emits a new compass heading */
  onNavigationMapRotation(heading: number): void {
    this.navMapRotation = heading;
    if (!this.navFollowMode || !this.map) return;
    this.applyMapRotation(-heading);
  }

  /** Called when the navigation panel emits the remaining route geometry */
  onNavigationRouteTrailUpdated(remaining: [number, number][]): void {
    if (!this.map) return;

    // Remove previous nav walking dots if any
    this.walkingDotMarkers.forEach(m => this.map?.removeLayer(m));
    this.walkingDotMarkers = [];

    if (remaining.length >= 2) {
      if (this.travelMode === 'walking') {
        this.drawWalkingDots(remaining, true);
      } else {
        if (this.navRemainingPolyline) {
          this.navRemainingPolyline.setLatLngs(remaining);
        } else {
          this.navRemainingPolyline = L.polyline(remaining, {
            color: '#22c55e',
            weight: 6,
            opacity: 0.9,
          }).addTo(this.map);
        }
      }
    } else if (this.navRemainingPolyline) {
      this.map.removeLayer(this.navRemainingPolyline);
      this.navRemainingPolyline = null;
    }
  }

  /** Start (or restart) the auto-refollow countdown */
  private scheduleNavRefollow(): void {
    this.clearNavRefollowTimer();
    this.navRefollowTimerId = setTimeout(() => {
      if (this.isNavigating && !this.navFollowMode) {
        this.navFollowMode = true;
        this.centerNavigationOnUser(false);
        this.applyMapRotation(-this.navMapRotation);
        this.cdr.detectChanges();
      }
    }, this.NAV_REFOLLOW_DELAY_MS);
  }

  private clearNavRefollowTimer(): void {
    if (this.navRefollowTimerId !== null) {
      clearTimeout(this.navRefollowTimerId);
      this.navRefollowTimerId = null;
    }
  }

  /** Debounced viewport refresh for desktop/mobile switches and browser resizes. */
  private scheduleMapViewportRefresh(): void {
    this.clearMapResizeTimer();
    this.mapResizeTimerId = setTimeout(() => {
      this.mapResizeTimerId = null;
      this.map?.invalidateSize();

      if (this.isNavigating && this.navFollowMode) {
        this.centerNavigationOnUser(false);
        return;
      }

      if (!this.isNavigating && this.plannerRouteGeometry.length >= 2) {
        this.fitRouteGeometry(this.plannerRouteGeometry, false);
      }
    }, 120);
  }

  private clearMapResizeTimer(): void {
    if (this.mapResizeTimerId !== null) {
      clearTimeout(this.mapResizeTimerId);
      this.mapResizeTimerId = null;
    }
  }

  /** User taps the locate/recenter button during navigation. */
  locateMeOrRefollow(): void {
    if (this.isNavigating) {
      this.clearNavRefollowTimer();
      this.navFollowMode = true;
      this.centerNavigationOnUser(false);
      this.applyMapRotation(-this.navMapRotation);
      this.cdr.detectChanges();
    } else {
      this.locateMe();
    }
  }

  shareTrip(): void {
    if (this.plannerStops.length === 0) {
      return;
    }

    const url = new URL(window.location.href);
    url.pathname = '/map-home';
    url.searchParams.set('planner', '1');
    url.searchParams.set('mode', this.travelMode);
    url.searchParams.set('scenic', this.scenicMode ? '1' : '0');
    const tripQuery = this.routePlanner.serializeTripQuery();
    if (tripQuery) {
      url.searchParams.set('trip', tripQuery);
    }

    const shareTitle = this.routeDestTitle || 'AdriGo trip plan';

    if (navigator.share) {
      navigator.share({
        title: shareTitle,
        text: 'Take a look at this AdriGo route idea.',
        url: url.toString(),
      }).catch(() => {});
      return;
    }

    navigator.clipboard.writeText(url.toString()).then(() => {
      this.plannerMessage = 'Trip link copied to your clipboard.';
      this.cdr.detectChanges();
      setTimeout(() => {
        this.plannerMessage = '';
        this.cdr.detectChanges();
      }, 2400);
    });
  }

  private drawPlannerPolyline(route: ComputedRoute): void {
    if (!this.map || route.geometry.length < 2) return;
    this.plannerRouteGeometry = route.geometry;

    if (this.travelMode === 'walking') {
      this.drawWalkingDots(route.geometry, false);
    } else {
      this.routePolyline = L.polyline(route.geometry, {
        color: route.usedFallback ? '#94a3b8' : '#22c55e',
        weight: 5,
        opacity: route.usedFallback ? 0.78 : 0.88,
        dashArray: route.usedFallback ? '10 8' : undefined,
      }).addTo(this.map);
    }

    this.fitRouteGeometry(route.geometry);
  }

  private getRouteViewportMode(): 'mobile' | 'desktop' {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 899px)').matches
      ? 'mobile'
      : 'desktop';
  }

  private fitRouteGeometry(geometry: [number, number][], animate = true): void {
    if (!this.map || geometry.length < 2) return;

    const bounds = L.latLngBounds(geometry);
    if (this.getRouteViewportMode() === 'mobile') {
      this.map.fitBounds(bounds, {
        paddingTopLeft: [42, 150],
        paddingBottomRight: [42, 160],
        animate,
      });
      return;
    }

    this.map.fitBounds(bounds, { padding: [60, 60], animate });
  }

  /**
   * Draws evenly-spaced filled circles along a polyline geometry,
   * mimicking the Google Maps walking-route style.
   *
   * @param geometry  Array of [lat, lng] points.
   * @param isNav     True when called for the navigation remaining-route overlay.
   *                  Uses a slightly different color to distinguish it.
   */
  private drawWalkingDots(
    geometry: [number, number][],
    isNav: boolean,
  ): void {
    if (!this.map || geometry.length < 2) return;

    const totalDistanceM = this.geometryDistanceM(geometry);
    const maxDots = isNav ? 120 : 180;
    const minSpacingM = isNav ? 18 : 24;
    const SPACING_M = Math.max(minSpacingM, Math.ceil(totalDistanceM / maxDots));
    const color = '#22c55e';
    const dotSize = isNav ? 7 : 8;

    // Walk the geometry accumulating distance; place a dot every SPACING_M metres.
    let accumulated = 0;
    let prevLat = geometry[0][0];
    let prevLng = geometry[0][1];

    const place = (lat: number, lng: number) => {
      const marker = L.circleMarker([lat, lng], {
        radius: dotSize / 2,
        color: '#fff',
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
        opacity: 1,
        interactive: false,
      }).addTo(this.map!);
      this.walkingDotMarkers.push(marker);
    };

    // Always place a dot at the very start
    place(prevLat, prevLng);

    for (let i = 1; i < geometry.length; i++) {
      const lat = geometry[i][0];
      const lng = geometry[i][1];

      const segLen = this.haversineM(prevLat, prevLng, lat, lng);
      if (segLen <= 0) {
        prevLat = lat;
        prevLng = lng;
        continue;
      }
      accumulated += segLen;

      while (accumulated >= SPACING_M) {
        // Interpolate the exact position of the dot along this segment
        const overshoot = accumulated - SPACING_M;
        const t = 1 - overshoot / segLen;
        const dLat = lat - prevLat;
        const dLng = lng - prevLng;
        place(prevLat + dLat * t, prevLng + dLng * t);
        accumulated -= SPACING_M;
      }

      prevLat = lat;
      prevLng = lng;
    }
  }

  private geometryDistanceM(geometry: [number, number][]): number {
    let total = 0;
    for (let index = 1; index < geometry.length; index++) {
      total += this.haversineM(
        geometry[index - 1][0],
        geometry[index - 1][1],
        geometry[index][0],
        geometry[index][1],
      );
    }
    return total;
  }

  /** Simple haversine distance in metres between two lat/lng points. */
  private haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
      * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  saveTripToCalendar(): void {
    if (!this.authService.isLoggedIn) {
      this.showAuthPopup = true;
      return;
    }

    const validStops = this.plannerStops.filter(stop => stop.id > 0);
    if (validStops.length === 0 || this.isSavingTrip) {
      return;
    }

    this.isSavingTrip = true;
    forkJoin(validStops.map(stop =>
      this.userService.addToCalendar(stop.id).pipe(
        catchError(() => of({ failed: true }))
      )
    )).subscribe({
      next: (results) => {
        const addedCount = results.filter((res: any) => !res?.failed && !res?.alreadyAdded).length;
        const alreadyCount = results.filter((res: any) => !!res?.alreadyAdded).length;
        const suffix = this.preferences.snapshot.emailNotifications
          ? ' A summary will also appear in your email digest.'
          : '';

        if (addedCount > 0) {
          this.plannerMessage = `${addedCount} stop(s) added to your calendar.${suffix}`;
          this.showTripSavedBrowserNotification(addedCount);
        } else if (alreadyCount > 0) {
          this.plannerMessage = 'These stops are already in your calendar.';
        } else {
          this.plannerMessage = 'We could not save this trip to the calendar.';
        }

        this.analytics.track('planner_saved_to_calendar', {
          stopCount: validStops.length,
          addedCount,
        });
        this.isSavingTrip = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.plannerMessage = 'We could not save this trip to the calendar.';
        this.isSavingTrip = false;
        this.cdr.detectChanges();
      }
    });
  }

  private showTripSavedBrowserNotification(addedCount: number): void {
    if (!this.preferences.snapshot.pushNotifications || !('Notification' in window)) {
      return;
    }
    if (Notification.permission !== 'granted') {
      return;
    }

    const title = addedCount === 1 ? 'Trip stop saved' : 'Trip stops saved';
    const body = addedCount === 1
      ? 'Your stop was added to the travel calendar.'
      : `${addedCount} stops were added to the travel calendar.`;
    new Notification(title, { body });
  }

  private applyFilterState(): void {
    const state = this.filterStateService.get();
    this.filterMinRating = state.minRating;
    this.filterOpenNow = state.openNow;
    this.filterRadius = state.radius ?? 0;
    this.filterShowOnlySaved = state.showOnlySaved ?? false;
    this.filterSavedPostIds = state.savedPostIds ?? [];
    // activeCategories prazan niz = nijedan chip selektovan = sve vidljivo
    this.categories.forEach(c => {
      c.active = state.activeCategories.includes(c.key);
    });
  }

  private syncFilterState(): void {
    const state = this.filterStateService.get();
    // Snimamo samo selektovane — prazan niz znaci sve vidljivo
    const selectedKeys = this.categories.filter(c => c.active).map(c => c.key);
    this.filterStateService.set({ ...state, activeCategories: selectedKeys });
  }

  private updateDistancesAndRecommendations(): void {
    this.locationsList = this.locationsList.map((location) => {
      const coordinates = this.getLocationCoordinates(location);
      const distanceKm = this.userPosition && coordinates
        ? this.geolocationService.haversineKm(
            { lat: this.userPosition[0], lng: this.userPosition[1] },
            coordinates
          )
        : null;

      return { ...location, distanceKm };
    });
  }

  private isLocationOpen(loc: MapLocation): boolean {
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

  private passesFilters(loc: MapLocation): boolean {
    if (this.filterShowOnlySaved && this.filterSavedPostIds.length > 0) {
      if (!this.filterSavedPostIds.includes(loc.id)) return false;
    }

    // Kategorija filter: ako nijedan chip nije selektovan → sve prolazi
    // Ako je bar jedan selektovan → prikazuju se samo selektovane kategorije
    if (this.hasAnyCategorySelected) {
      const key = (loc.postType || loc.category || '').toLowerCase().replace(/\s+/g, '_');
      const selectedKeys = this.categories.filter(c => c.active).map(c => c.key);
      const isKnownType = this.categories.some(c => c.key === key);
      if (isKnownType && !selectedKeys.includes(key)) return false;
    }

    if (this.filterMinRating > 0 && (loc.avgRating || 0) < this.filterMinRating) return false;
    if (this.filterOpenNow && !this.isLocationOpen(loc)) return false;

    if (this.filterRadius > 0 && this.userPosition) {
      const coordinates = this.getLocationCoordinates(loc);
      if (coordinates) {
        const dist = this.geolocationService.haversineKm(
          { lat: this.userPosition[0], lng: this.userPosition[1] },
          coordinates
        );
        if (dist > this.filterRadius) return false;
      }
    }

    return true;
  }

  private applyMarkerFilter(): void {
    this.markers.forEach(({ loc, marker }) => {
      const visible = this.passesFilters(loc);
      if (visible) {
        if (!this.map!.hasLayer(marker)) marker.addTo(this.map!);
      } else if (this.map!.hasLayer(marker)) {
        this.map!.removeLayer(marker);
      }
    });
  }

  private getMarkerHtml(category: string): string {
    const key = category.toLowerCase().replace(/\s+/g, '_');
    const categoryStyle = this.categoryColors[key] || this.categoryColors['other'];
    const iconPath = this.svgIcons[categoryStyle.icon] || this.svgIcons['default'];
    return `<div style="width:36px;height:36px;background:${categoryStyle.bg};border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.25);border:2px solid rgba(255,255,255,0.6);cursor:pointer;"><div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 24 24" width="16" height="16" fill="white">${iconPath}</svg></div></div>`;
  }

  private initMap(): void {
    this.map = L.map('map', { zoomControl: false }).setView([42.2784, 18.8372], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    // #map is oversized (142% x 142%) in CSS so that rotated corners always
    // have tiles pre-loaded. After Leaflet attaches we tell it to recalculate
    // its size so it knows about the larger viewport and fills it with tiles.
    setTimeout(() => this.map?.invalidateSize(), 0);

    // Install rotation-aware drag compensation so that when #map is rotated
    // (compass heading mode) swiping left/right still moves the map in the
    // direction the finger travels on screen, not in the rotated map space.
    this.installRotationAwareDragHandler();

    // When user manually pans during navigation — disable follow mode and start refollow timer
    this.map.on('dragstart', () => {
      if (this.isNavigating) {
        this.navFollowMode = false;
        this.cdr.detectChanges();
        this.scheduleNavRefollow();
      }
    });

    // Reset the refollow timer on any further touch/drag interaction
    this.map.on('drag', () => {
      if (this.isNavigating && !this.navFollowMode) {
        this.scheduleNavRefollow();
      }
    });

  }

  private startLocationTracking(): void {
    this.stopLocationTracking();

    this.locationWatchId = this.geolocationService.watchPosition(
      (position) => {
        const shouldFly = !this.hasCenteredOnUserLocation;
        this.hasCenteredOnUserLocation = true;
        this.showUserLocation(position, shouldFly);
        this.updateDistancesAndRecommendations();
        this.applyMarkerFilter();
        this.refreshRecommendations();
        if (this.searchQuery.trim()) {
          this.onSearchInput(this.searchQuery);
        }
        this.cdr.detectChanges();
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          this.clearUserLocation();
        }
      },
    );
  }

  private stopLocationTracking(): void {
    this.geolocationService.clearWatch(this.locationWatchId);
    this.locationWatchId = null;
  }

  private clearUserLocation(): void {
    if (this.userMarker && this.map?.hasLayer(this.userMarker)) {
      this.map.removeLayer(this.userMarker);
    }
    this.userMarker = null;
    this.userPosition = null;
    this.hasCenteredOnUserLocation = false;
    this.updateDistancesAndRecommendations();
    this.applyMarkerFilter();
    this.refreshRecommendations();
    this.cdr.detectChanges();
  }

  /**
   * Installs a pointer-event handler that counter-rotates drag deltas by
   * navMapRotation so that dragging always moves the map in screen-space
   * regardless of the current compass rotation applied to #map.
   *
   * How it works: Leaflet reads raw pixel deltas from PointerEvents.
   * When #map is CSS-rotated by R degrees those deltas are in rotated
   * space, so dragging screen-left moves the map diagonally. We compute
   * the difference between what Leaflet will do and what we want, then
   * call panBy() to apply the correction each frame.
   */
  private installRotationAwareDragHandler(): void {
    if (!this.map) return;
    const map = this.map;

    // ── PAN CORRECTION ────────────────────────────────────────────────────
    // Leaflet fires 'move' after every internal pan. We intercept the drag
    // handler at a lower level: listen to touchstart/touchmove on the
    // container BEFORE Leaflet does (capture phase), compute the corrected
    // delta ourselves, and suppress Leaflet's own drag by replacing the
    // move delta in the DraggableEvent.
    //
    // Simpler alternative that actually works: hook Leaflet's drag handler
    // _startPos and correct the accumulated offset each move.
    //
    // The cleanest approach: patch map.dragging._draggable so its
    // _onMove gets corrected coordinates.

    const draggable: any = (map.dragging as any)._draggable;
    if (!draggable) return;

    const originalOnMove = draggable._onMove.bind(draggable);

    draggable._onMove = (e: TouchEvent | MouseEvent) => {
      // Only correct when we have an active rotation
      if (!this.isNavigating || this.navMapRotation === 0) {
        originalOnMove(e);
        return;
      }

      // Get the current pointer position
      const point = L.DomEvent.getMousePosition(
        e as MouseEvent,
        map.getContainer(),
      );

      // Leaflet stores the last known position in _lastPoint
      const last: L.Point = draggable._lastPoint ?? draggable._startPoint;
      if (!last) { originalOnMove(e); return; }

      // Raw screen-space delta (what Leaflet would use)
      const rawDx = point.x - last.x;
      const rawDy = point.y - last.y;

      // Rotate delta into map-space
      const rad = (this.navMapRotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const mapDx = rawDx * cos - rawDy * sin;
      const mapDy = rawDx * sin + rawDy * cos;

      // Apply correction: pan by the difference so the total movement
      // equals the rotated delta
      const corrDx = mapDx - rawDx;
      const corrDy = mapDy - rawDy;

      // Let Leaflet process the original event first
      originalOnMove(e);

      // Then apply the correction
      if (Math.abs(corrDx) > 0.2 || Math.abs(corrDy) > 0.2) {
        map.panBy([corrDx, corrDy], { animate: false, noMoveStart: true });
      }
    };

    // Store for cleanup
    (this as any)._patchedDraggable = draggable;
    (this as any)._originalOnMove = originalOnMove;
  }

  locateMe(): void {
    if (this.isLocating) return;
    this.isLocating = true;
    this.cdr.detectChanges();

    void this.geolocationService.requestCurrentPosition({ maximumAge: 0 }).then((position) => {
      this.isLocating = false;
      if (position) {
        this.hasCenteredOnUserLocation = true;
        this.showUserLocation(position, true);
        this.updateDistancesAndRecommendations();
        this.applyMarkerFilter();
        this.refreshRecommendations();
        this.handleUserPositionAvailable(position, { fly: true, rerenderRoute: true });
      }
      this.cdr.detectChanges();
    });
  }

  private tryAutoLocateUser(): void {
    if (!this.preferences.snapshot.locationSharing || typeof navigator === 'undefined') {
      return;
    }

    const locate = () => {
      void this.geolocationService.requestCurrentPosition({ maximumAge: 60000 }).then((position) => {
        if (!position) return;
        this.handleUserPositionAvailable(position, { fly: false, rerenderRoute: true });
        this.cdr.detectChanges();
      });
    };

    const permissions = navigator.permissions;
    if (permissions?.query) {
      permissions.query({ name: 'geolocation' as PermissionName })
        .then(status => {
          this.autoLocatePermissionStatus?.removeEventListener?.('change', this.handleAutoLocatePermissionChange);
          this.autoLocatePermissionStatus = status;
          status.addEventListener?.('change', this.handleAutoLocatePermissionChange);
          if (status.state === 'granted') locate();
        })
        .catch(() => locate());
      return;
    }

    locate();
  }

  private handleUserPositionAvailable(
    position: UserPosition,
    options: { fly?: boolean; rerenderRoute?: boolean } = {},
  ): void {
    this.showUserLocation(position, !!options.fly);
    this.updateDistancesAndRecommendations();
    this.applyMarkerFilter();
    this.refreshRecommendations();

    if (this.isNavigating && this.navFollowMode) {
      this.centerNavigationOnUser(false);
      return;
    }

    if (options.rerenderRoute && this.plannerStops.length > 0) {
      this.renderPlannerRoute();
    }
  }

  private showUserLocation(position: UserPosition, fly: boolean): void {
    const userIcon = L.divIcon({
      html: `<div style="width:18px;height:18px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 5px rgba(59,130,246,0.25);"></div>`,
      className: 'user-location-marker',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    if (this.userMarker) {
      this.userMarker.setLatLng([position.lat, position.lng]);
    } else {
      this.userMarker = L.marker([position.lat, position.lng], { icon: userIcon, zIndexOffset: 1000 })
        .bindPopup('<b>You are here</b>')
        .addTo(this.map!);
    }

    this.userMarker = L.marker([position.lat, position.lng], { icon: userIcon, zIndexOffset: 1000 })
      .bindPopup('<b>You are here</b>')
      .addTo(this.map!);

    this.userPosition = [position.lat, position.lng];
    if (fly) {
      this.map.flyTo([position.lat, position.lng], 14, { animate: true, duration: 1.2 });
    }
  }

  private addMarkers(): void {
    this.markers.forEach(({ marker }) => {
      if (this.map!.hasLayer(marker)) this.map!.removeLayer(marker);
    });
    this.markers = [];

    this.locationsList.forEach(loc => {
      const coordinates = this.getLocationCoordinates(loc);
      if (!coordinates) return;

      const category = loc.postType || loc.category || 'default';
      const icon = L.divIcon({
        html: this.getMarkerHtml(category),
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      });

      const marker = L.marker([coordinates.lat, coordinates.lng], { icon }).addTo(this.map!);
      this.markers.push({ loc, marker });

      marker.on('click', (event: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(event as unknown as Event);
        this.analytics.track('location_opened', {
          postId: loc.id,
          postType: loc.postType,
          regionName: loc.regionName,
        });
        if (this.plannerMode) {
          // U planner mode: samo dodaj stajaliste, ne otvara karticu
          this.addLocationToPlanner(loc, true);
        } else {
          // Van planner mode: otvori karticu objave
          this.selectedLocation = loc;
        }
        this.cdr.detectChanges();
      });
    });

    this.applyMarkerFilter();
  }

  private getLocationCoordinates(loc: Partial<Location>): UserPosition | null {
    const lat = loc.lat ?? loc.latitude;
    const lng = loc.lng ?? loc.longitude;

    if (lat == null || lng == null) {
      return null;
    }

    return { lat: Number(lat), lng: Number(lng) };
  }

  closeLocationDetails(): void {
    this.selectedLocation = null;
  }

  viewFullDetails(): void {
    if (this.selectedLocation) {
      this.router.navigate(['/location-details', this.selectedLocation.id]);
    }
  }

  onSearchInput(query: string): void {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      this.searchResults = [];
      return;
    }

    const normalized = query.toLowerCase().trim();

    this.searchResults = this.locationsList
      .filter(loc =>
        (loc.title || '').toLowerCase().includes(normalized) ||
        (loc.postType || loc.category || '').toLowerCase().includes(normalized)
      )
      .slice(0, 8);
  }

  selectSearchResult(loc: MapLocation): void {
    this.searchQuery = loc.title;
    this.searchResults = [];
    this.focusOnLocation(loc);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
  }

  formatPostType(type?: string | null): string {
    return formatPostType(type);
  }

  getCategoryIcon(postType: string | undefined): string {
    const key = (postType || '').toLowerCase().replace(/\s+/g, '_');
    const category = this.categories.find(item => item.key === key);
    return category ? category.icon : '📍';
  }

  formatDistance(distanceKm?: number | null): string {
    return this.geolocationService.formatDistanceKm(distanceKm);
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  isFiltersOpen = false;

  openFilters(): void {
    this.isFiltersOpen = true;
    this.cdr.detectChanges();
  }

  closeInlineFilters(): void {
    this.isFiltersOpen = false;
    this.cdr.detectChanges();
  }

  onInlineFiltersApplied(): void {
    this.isFiltersOpen = false;
    this.applyFilterState();
    this.applyMarkerFilter();
    this.refreshRecommendations();
    if (this.searchQuery.trim()) this.onSearchInput(this.searchQuery);
    this.cdr.detectChanges();
  }

  onFiltersChanged(state?: FilterState): void {
    // Reactive: called on every filter change while panel is open — panel stays open
    this.applyFilterState();
    this.applyMarkerFilter();
    this.refreshRecommendations();
    if (this.searchQuery.trim()) this.onSearchInput(this.searchQuery);
    this.cdr.detectChanges();
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleSheet(): void {
    this.sheetExpanded = !this.sheetExpanded;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToSaved(): void {
    if (!this.authService.isLoggedIn) {
      this.showAuthPopup = true;
      return;
    }
    this.activeTab = 'saved';
    this.router.navigate(['/saved']);
  }

  goToRoutes(): void {
    this.activeTab = 'routes';
    this.router.navigate(['/routes']);
  }

  goToActivities(): void {
    this.activeTab = 'activities';
    this.router.navigate(['/activities']);
  }

  goToNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  goToCalendar(): void {
    if (!this.authService.isLoggedIn) {
      this.showAuthPopup = true;
      return;
    }
    this.activeTab = 'calendar';
    this.router.navigate(['/calendar']);
  }

  goToAccount(): void {
    if (this.authService.isLoggedIn) {
      this.activeTab = 'account';
      this.router.navigate(['/account']);
    } else {
      this.showAuthPopup = true;
    }
  }

  toggleListView(): void {
    this.activeTab = 'list';
    this.router.navigate(['/location-list']);
  }
}
