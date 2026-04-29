import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { LocationDetailsCardComponent } from '../location-details-card/location-details-card';
import { SideMenuComponent } from '../SideMenu/side-menu.component';
import { AuthService } from '../services/auth.service';
import { FilterStateService } from '../services/filter-state.service';
import { GeolocationService, UserPosition } from '../services/geolocation.service';
import { Location, LocationService } from '../services/location.service';

type MapLocation = Location & {
  distanceKm?: number | null;
  _score?: number;
};

@Component({
  selector: 'app-map-home',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationDetailsCardComponent, SideMenuComponent],
  templateUrl: './map-home.component.html',
  styleUrls: ['./map-home.component.css']
})
export class MapHomeComponent implements OnInit, AfterViewInit, OnDestroy {
  selectedLocation: MapLocation | null = null;
  isMenuOpen = false;
  activeTab = 'map';
  private map: L.Map | undefined;
  private markers: { loc: MapLocation; marker: L.Marker }[] = [];
  private userMarker: L.Marker | null = null;

  showAuthPopup = false;
  filterExpanded = false;
  routePolyline: L.Polyline | null = null;
  routeDestTitle = '';
  showRoutePanel = false;

  searchQuery = '';
  searchResults: MapLocation[] = [];
  recommendedLocations: MapLocation[] = [];
  locationsList: MapLocation[] = [];

  readonly IMAGE_BASE_URL = 'http://localhost:5125/';

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
  userPosition: [number, number] | null = null;

  private readonly categoryColors: Record<string, { bg: string; icon: string }> = {
    accommodation: { bg: '#3b82f6', icon: 'accommodation' },
    restaurant: { bg: '#ef4444', icon: 'food' },
    club: { bg: '#8b5cf6', icon: 'nightlife' },
    cultural_site: { bg: '#f59e0b', icon: 'culture' },
    monument: { bg: '#d97706', icon: 'monument' },
    sports_facility: { bg: '#22c55e', icon: 'activity' },
    event: { bg: '#ec4899', icon: 'events' },
    attraction: { bg: '#10b981', icon: 'beach' },
    shop: { bg: '#f97316', icon: 'shop' },
    other: { bg: '#6b7280', icon: 'default' },
  };

  private readonly svgIcons: Record<string, string> = {
    beach: '<path d="M13.127 14.56l1.43-1.43 6.44 6.443L19.57 21zm4.293-5.73l2.86-2.86c-3.95-3.95-10.35-3.96-14.3-.02 3.93-1.3 8.31-.25 11.44 2.88zM5.95 5.98c-3.94 3.95-3.93 10.35.02 14.3l2.86-2.86C5.7 14.29 4.65 9.91 5.95 5.98zm.02-.02l-.01.01c-.38 3.01 1.17 6.88 4.7 10.41l5.39-5.39c-3.53-3.53-7.4-5.09-10.08-5.03z"/>',
    culture: '<path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 12.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>',
    monument: '<path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 12.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>',
    food: '<path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>',
    nightlife: '<path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z"/>',
    activity: '<path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/>',
    events: '<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>',
    accommodation: '<path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/>',
    shop: '<path d="M16 6V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H2v13c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6h-6zm-6-2h4v2h-4V4zM11 17H9v-6h2v6zm4 0h-2v-6h2v6z"/>',
    default: '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>',
  };

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    public authService: AuthService,
    private locationService: LocationService,
    private filterStateService: FilterStateService,
    private geolocationService: GeolocationService
  ) {}

  get hasActiveFilters(): boolean {
    return this.filterMinRating > 0
      || this.filterOpenNow
      || (this.filterRadius > 0 && !!this.userPosition)
      || !this.allCategoriesActive;
  }

  get allCategoriesActive(): boolean {
    return this.categories.every((category) => category.active);
  }

  get recommendedSubtitle(): string {
    return this.userPosition ? 'Closest to your location' : 'Top rated nearby';
  }

  ngOnInit(): void {
    this.applyFilterState();
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.loadLocations();
    this.activatedRoute.queryParams.subscribe((params) => {
      if (params['directTo']) {
        const parts = params['directTo'].split(',');
        const destLat = parseFloat(parts[0]);
        const destLng = parseFloat(parts[1]);
        const title = params['destTitle'] || '';

        if (!Number.isNaN(destLat) && !Number.isNaN(destLng)) {
          setTimeout(() => this.drawRouteToDestination(destLat, destLng, title), 800);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  loadLocations(): void {
    this.locationService.getLocations(1, 200).subscribe({
      next: (res) => {
        this.locationsList = res.data;
        this.updateDistancesAndRecommendations();
        this.addMarkers();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load locations:', err)
    });
  }

  calculateRecommendations(): void {
    const sorted = [...this.locationsList].map((location) => {
      const score = ((location.avgRating || location.rating || 0) * 100)
        + (location.reviewCount || location.reviews || 0)
        + (location.likeCount || location.likes || 0)
        + (location.saveCount || location.saves || 0);

      return { ...location, _score: score };
    });

    if (this.userPosition) {
      sorted.sort((left, right) => {
        const leftDistance = left.distanceKm ?? Number.POSITIVE_INFINITY;
        const rightDistance = right.distanceKm ?? Number.POSITIVE_INFINITY;

        if (leftDistance !== rightDistance) {
          return leftDistance - rightDistance;
        }

        return (right._score ?? 0) - (left._score ?? 0);
      });
    } else {
      sorted.sort((left, right) => (right._score ?? 0) - (left._score ?? 0));
    }

    this.recommendedLocations = sorted.slice(0, 3);
  }

  getFirstImage(loc: MapLocation): string {
    if (loc.imageUrl) return loc.imageUrl;
    if (!loc.images) return 'assets/placeholder.jpg';

    let firstImg = '';
    if (typeof loc.images === 'string') {
      try {
        const parsed = JSON.parse(loc.images) as string[];
        firstImg = parsed[0] || '';
      } catch {
        firstImg = loc.images;
      }
    } else if (Array.isArray(loc.images) && loc.images.length > 0) {
      firstImg = loc.images[0];
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
      this.cdr.detectChanges();
    }
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='52' height='52' viewBox='0 0 52 52'%3E%3Crect width='52' height='52' fill='%23f1f5f9'/%3E%3Cpath d='M20 34l6-8 4 5 3-4 5 7H14z' fill='%23cbd5e1'/%3E%3Ccircle cx='33' cy='20' r='3' fill='%23cbd5e1'/%3E%3C/svg%3E`;
    img.onerror = null;
  }

  toggleCategory(cat: { active: boolean; key: string }): void {
    cat.active = !cat.active;
    this.syncFilterState();
    this.applyMarkerFilter();
    this.calculateRecommendations();
  }

  toggleAllCategories(): void {
    this.categories.forEach((category) => {
      category.active = true;
    });
    this.syncFilterState();
    this.applyMarkerFilter();
    this.calculateRecommendations();
  }

  clearRoute(): void {
    if (this.routePolyline) {
      this.map?.removeLayer(this.routePolyline);
      this.routePolyline = null;
    }

    this.showRoutePanel = false;
    this.routeDestTitle = '';
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
    this.cdr.detectChanges();
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
      .filter((location) =>
        (location.title || '').toLowerCase().includes(normalized)
        || (location.postType || location.category || '').toLowerCase().includes(normalized)
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
    const category = this.categories.find((item) => item.key === key);
    return category ? category.icon : '📍';
  }

  formatDistance(distanceKm?: number | null): string {
    return this.geolocationService.formatDistanceKm(distanceKm);
  }

  openFilters(): void {
    this.router.navigate(['/filters']);
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
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

  private applyFilterState(): void {
    const state = this.filterStateService.get();
    this.filterMinRating = state.minRating;
    this.filterOpenNow = state.openNow;
    this.filterRadius = state.radius ?? 0;

    if (state.activeCategories.length > 0) {
      this.categories.forEach((category) => {
        category.active = state.activeCategories.includes(category.key);
      });
    }
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

    this.calculateRecommendations();
  }

  private syncFilterState(): void {
    const state = this.filterStateService.get();
    const activeKeys = this.allCategoriesActive
      ? []
      : this.categories.filter((category) => category.active).map((category) => category.key);

    this.filterStateService.set({ ...state, activeCategories: activeKeys });
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

  private drawRouteToDestination(destLat: number, destLng: number, title: string): void {
    this.routeDestTitle = title;
    this.showRoutePanel = true;

    const destIcon = L.divIcon({
      html: `<div style="width:32px;height:32px;background:#ef4444;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.3);border:2px solid white;"><div style="transform:rotate(45deg);color:white;font-size:14px;font-weight:900;">🏁</div></div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    L.marker([destLat, destLng], { icon: destIcon }).addTo(this.map!).bindPopup(title || 'Destination');
    this.map?.flyTo([destLat, destLng], 14, { animate: true, duration: 1 });

    if (this.userPosition) {
      this.fetchAndDrawRoute(this.userPosition[0], this.userPosition[1], destLat, destLng);
    } else {
      void this.geolocationService.requestCurrentPosition({ timeout: 6000 }).then((position) => {
        if (position) {
          this.showUserLocation(position);
          this.fetchAndDrawRoute(position.lat, position.lng, destLat, destLng);
        } else {
          this.cdr.detectChanges();
        }
      });
    }

    this.cdr.detectChanges();
  }

  private fetchAndDrawRoute(fromLat: number, fromLng: number, toLat: number, toLng: number): void {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (data.routes?.[0]?.geometry?.coordinates) {
          const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
          );

          if (this.routePolyline) {
            this.map?.removeLayer(this.routePolyline);
          }

          this.routePolyline = L.polyline(coords, {
            color: '#22c55e',
            weight: 5,
            opacity: 0.85
          }).addTo(this.map!);

          this.map?.fitBounds(this.routePolyline.getBounds(), { padding: [60, 60] });
        }

        this.cdr.detectChanges();
      })
      .catch(() => this.cdr.detectChanges());
  }

  private passesFilters(loc: MapLocation): boolean {
    if (!this.allCategoriesActive) {
      const key = (loc.postType || loc.category || '').toLowerCase().replace(/\s+/g, '_');
      const activeKeys = this.categories.filter((category) => category.active).map((category) => category.key);
      const isKnownType = this.categories.some((category) => category.key === key);

      if (isKnownType && !activeKeys.includes(key)) return false;
    }

    if (this.filterMinRating > 0 && (loc.avgRating || 0) < this.filterMinRating) return false;
    if (this.filterOpenNow && !this.isLocationOpen(loc)) return false;

    if (this.filterRadius > 0 && this.userPosition) {
      const coordinates = this.getLocationCoordinates(loc);
      if (coordinates) {
        const distance = this.geolocationService.haversineKm(
          { lat: this.userPosition[0], lng: this.userPosition[1] },
          coordinates
        );

        if (distance > this.filterRadius) return false;
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
      if (this.map!.hasLayer(marker)) {
        this.map!.removeLayer(marker);
      }
    });
    this.markers = [];

    this.locationsList.forEach((loc) => {
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
}
