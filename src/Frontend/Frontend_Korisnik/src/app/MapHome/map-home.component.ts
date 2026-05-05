import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import * as L from 'leaflet';
import { MapRecommendationsPanelComponent } from './components/map-recommendations-panel/map-recommendations-panel.component';
import { RouteDetoursPanelComponent } from './components/route-detours-panel/route-detours-panel.component';
import { LocationDetailsCardComponent } from '../location-details-card/location-details-card';
import { SideMenuComponent } from '../SideMenu/side-menu.component';
import { TripPlannerPanelComponent } from './components/trip-planner-panel/trip-planner-panel.component';
import { AuthService } from '../services/auth.service';
import { LocationService, Location } from '../services/location.service';
import { FilterStateService } from '../services/filter-state.service';
import { GeolocationService, UserPosition } from '../services/geolocation.service';
import { UserService, CalendarItem, UserProfile, ServerPreferences } from '../services/user.service';
import { PlannerStop, RoutePlannerService } from '../services/route-planner.service';
import { ComputedRoute, RoutingService, RouteSummary } from '../services/routing.service';
import { TravelMode, TouristPreferencesService } from '../services/tourist-preferences.service';
import { TouristAnalyticsService } from '../services/tourist-analytics.service';
import {
  LocationRecommendation,
  RecommendationService,
  RouteDetourSuggestion
} from '../services/recommendation.service';

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
    SideMenuComponent,
    TripPlannerPanelComponent,
    RouteDetoursPanelComponent,
    MapRecommendationsPanelComponent,
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
  private userMarker: L.Marker | null = null;
  private routeStopMarkers: L.Marker[] = [];
  private latestQueryParams: Record<string, string> = {};
  private lastHydratedQueryKey = '';
  private plannerRenderToken = 0;

  showAuthPopup = false;
  routePolyline: L.Polyline | null = null;
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

  categories = [
    { key: 'attraction', label: 'Attractions', icon: '🏖️', active: true },
    { key: 'restaurant', label: 'Restaurants', icon: '🍽️', active: true },
    { key: 'cultural_site', label: 'Culture', icon: '🏛️', active: true },
    { key: 'monument', label: 'Monuments', icon: '🗿', active: true },
    { key: 'club', label: 'Nightlife', icon: '🎉', active: true },
    { key: 'sports_facility', label: 'Activities', icon: '🏄', active: true },
    { key: 'event', label: 'Events', icon: '📅', active: true },
    { key: 'accommodation', label: 'Accommodation', icon: '🏨', active: true },
    { key: 'shop', label: 'Shopping', icon: '🛍️', active: true },
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
      || !this.allCategoriesActive
      || this.filterShowOnlySaved;
  }

  get allCategoriesActive(): boolean {
    return this.categories.every(c => c.active);
  }

  get recommendationCards(): LocationRecommendation[] {
    if (this.activeRecommendationTab === 'personalized' && this.personalizedRecommendations.length > 0) {
      return this.personalizedRecommendations;
    }
    return this.globalRecommendations;
  }

  get hasPersonalizedRecommendations(): boolean {
    return this.personalizedRecommendations.length > 0;
  }

  private readonly categoryColors: Record<string, { bg: string; icon: string }> = {
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
    nightlife:     '<path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z"/>',
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
  ) {}

  ngOnInit(): void {
    this.applyFilterState();
    this.syncPlannerStateFromServices();
  }

  ngAfterViewInit(): void {
    this.initMap();
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
    this.map?.remove();
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

    const savedIds: number[] = JSON.parse(localStorage.getItem('guest_saved_ids') || '[]');
    this.savedLocationsContext = this.locationsList.filter(location => savedIds.includes(location.id));
  }

  private refreshRecommendations(): void {
    if (this.locationsList.length === 0) {
      this.globalRecommendations = [];
      this.personalizedRecommendations = [];
      return;
    }

    const preferences = this.preferences.snapshot;
    const analyticsEvents = this.analytics.getRecentEvents();
    // Priority: user-set content prefs → profile interests → server-side interaction history
    const contentPreferences = preferences.contentPreferences.length > 0
      ? preferences.contentPreferences
      : (this.userProfile?.interests ?? []).length > 0
        ? (this.userProfile?.interests ?? [])
        : this.serverPreferenceTypes;

    this.globalRecommendations = this.recommendationService.buildGlobalRecommendations(this.locationsList, {
      userPosition: this.userPosition,
      limit: 6,
    });

    this.personalizedRecommendations = preferences.personalizedRecs
      ? this.recommendationService.buildPersonalizedRecommendations(
          this.locationsList,
          this.userProfile,
          this.savedLocationsContext,
          this.calendarItemsContext,
          analyticsEvents,
          {
            userPosition: this.userPosition,
            contentPreferences,
            limit: 6,
          }
        )
      : [];

    if (this.personalizedRecommendations.length === 0) {
      this.activeRecommendationTab = 'global';
    }
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
    if (!imagesValue) return 'assets/placeholder.jpg';

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

    if (!firstImg) return 'assets/placeholder.jpg';
    if (!firstImg.startsWith('http')) {
      const clean = firstImg.startsWith('/') ? firstImg.substring(1) : firstImg;
      return `${this.IMAGE_BASE_URL}${clean}`;
    }
    return firstImg;
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
  }

  toggleAllCategories(): void {
    this.categories.forEach(c => c.active = true);
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
    if (this.travelMode === mode) {
      return;
    }
    this.travelMode = mode;
    this.routePlanner.setTravelMode(mode);
    this.preferences.update({ preferredTravelMode: mode });
    this.renderPlannerRoute();
  }

  applyDetourSuggestion(suggestion: RouteDetourSuggestion): void {
    this.addLocationToPlanner(suggestion.location, false, suggestion.insertAfterIndex);
    this.analytics.track('planner_detour_applied', {
      postId: suggestion.location.id,
      postType: suggestion.location.postType,
      distanceToRouteKm: suggestion.distanceToRouteKm,
    });
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

    if (this.plannerStops.length === 1) {
      const onlyStop = this.plannerStops[0];
      this.map.flyTo([onlyStop.lat, onlyStop.lng], 14, { animate: true, duration: 1 });
      this.scenicSuggestions = this.buildNearbyStopSuggestions(onlyStop);
      this.cdr.detectChanges();
      return;
    }

    const routeCoordinates = this.getRouteCoordinates();
    if (routeCoordinates.length < 2) {
      this.scenicSuggestions = [];
      this.cdr.detectChanges();
      return;
    }

    this.isRenderingRoute = true;
    const renderToken = ++this.plannerRenderToken;

    this.routingService.computeRoute(routeCoordinates, this.travelMode)
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
        this.scenicSuggestions = this.scenicMode
          ? this.recommendationService.suggestDetours(this.plannerStops, route.geometry, this.locationsList, {
              contentPreferences: this.preferences.snapshot.contentPreferences.length > 0
                ? this.preferences.snapshot.contentPreferences
                : (this.userProfile?.interests ?? []),
              userPosition: this.userPosition,
              limit: 4,
            })
          : [];

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
    if (this.routePolyline) {
      this.map?.removeLayer(this.routePolyline);
      this.routePolyline = null;
    }
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
    this.clearRouteVisuals();
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
    this.cdr.detectChanges();
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
    if (!this.map || route.geometry.length < 2) {
      return;
    }

    this.routePolyline = L.polyline(route.geometry, {
      color: route.usedFallback ? '#94a3b8' : '#22c55e',
      weight: 5,
      opacity: route.usedFallback ? 0.78 : 0.88,
      dashArray: route.usedFallback ? '10 8' : undefined,
    }).addTo(this.map);

    this.map.fitBounds(this.routePolyline.getBounds(), { padding: [60, 60] });
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

  private applyFilterState(): void {
    const state = this.filterStateService.get();
    this.filterMinRating = state.minRating;
    this.filterOpenNow = state.openNow;
    this.filterRadius = state.radius ?? 0;
    this.filterShowOnlySaved = state.showOnlySaved ?? false;
    this.filterSavedPostIds = state.savedPostIds ?? [];
    if (state.activeCategories.length > 0) {
      this.categories.forEach(c => {
        c.active = state.activeCategories.includes(c.key);
      });
    }
  }

  private syncFilterState(): void {
    const state = this.filterStateService.get();
    const activeKeys = this.allCategoriesActive
      ? []
      : this.categories.filter(c => c.active).map(c => c.key);
    this.filterStateService.set({ ...state, activeCategories: activeKeys });
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

    if (!this.allCategoriesActive) {
      const key = (loc.postType || loc.category || '').toLowerCase().replace(/\s+/g, '_');
      const activeKeys = this.categories.filter(c => c.active).map(c => c.key);
      const isKnownType = this.categories.some(c => c.key === key);
      if (isKnownType && !activeKeys.includes(key)) return false;
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

    this.requestGeolocation();
  }

  private requestGeolocation(): void {
    void this.geolocationService.requestCurrentPosition().then((position) => {
      if (!position) {
        return;
      }

      this.showUserLocation(position);
      this.updateDistancesAndRecommendations();
      this.applyMarkerFilter();
      this.refreshRecommendations();
      this.renderPlannerRoute();
      this.cdr.detectChanges();
    });
  }

  private showUserLocation(position: UserPosition): void {
    const userIcon = L.divIcon({
      html: `<div style="width:18px;height:18px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 5px rgba(59,130,246,0.25);"></div>`,
      className: '',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    if (this.userMarker) {
      this.map!.removeLayer(this.userMarker);
    }

    this.userMarker = L.marker([position.lat, position.lng], { icon: userIcon, zIndexOffset: 1000 })
      .bindPopup('<b>You are here</b>')
      .addTo(this.map!);

    this.userPosition = [position.lat, position.lng];
    this.map!.flyTo([position.lat, position.lng], 13, { animate: true, duration: 1.5 });
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
        this.selectedLocation = loc;
        this.analytics.track('location_opened', {
          postId: loc.id,
          postType: loc.postType,
          regionName: loc.regionName,
        });
        if (this.plannerMode) {
          this.addLocationToPlanner(loc, true);
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

  openFilters(): void {
    this.router.navigate(['/filters']);
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
    this.activeTab = 'saved';
    this.router.navigate(['/saved']);
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
