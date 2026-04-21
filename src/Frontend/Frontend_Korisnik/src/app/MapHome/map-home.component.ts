import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { LocationDetailsCardComponent } from '../location-details-card/location-details-card';
import { SideMenuComponent } from '../SideMenu/side-menu.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-map-home',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationDetailsCardComponent, SideMenuComponent],
  templateUrl: './map-home.component.html',
  styleUrls: ['./map-home.component.css']
})
export class MapHomeComponent implements OnInit, AfterViewInit, OnDestroy {

  selectedLocation: any = null;
  isMenuOpen = false;
  activeTab: string = 'map';
  private map: L.Map | undefined;
  private markers: { loc: any; marker: L.Marker }[] = [];

  showAuthPopup = false;
  filterExpanded = false;

  // Search state
  searchQuery = '';
  searchResults: any[] = [];

  recommendedLocations: any[] = [];

  // --- CATEGORY FILTER ---
  categories = [
    { key: 'Beach',     label: 'Beaches',     icon: '🏖️', active: true },
    { key: 'Nature',    label: 'Nature',       icon: '🌿', active: true },
    { key: 'Culture',   label: 'Culture',      icon: '🏛️', active: true },
    { key: 'Food',      label: 'Restaurants',  icon: '🍽️', active: true },
    { key: 'Nightlife', label: 'Nightlife',    icon: '🎉', active: true },
    { key: 'Activities',label: 'Activities',   icon: '🏄', active: true },
    { key: 'Events',    label: 'Events',       icon: '📅', active: true },
  ];

  locationsList = [
    {
      id: 1,
      lat: 42.2784,
      lng: 18.8372,
      category: 'Culture',
      imageUrl: 'assets/Budva.jpg',
      title: 'Old Town Budva',
      rating: 4.9,
      reviews: 3502,
      likes: 1200,
      saves: 850,
      distance: 0.8,
      status: 'Open now'
    },
    {
      id: 2,
      lat: 42.2760,
      lng: 18.8400,
      category: 'Beach',
      imageUrl: 'assets/plaza.jpg',
      title: 'Mogren Beach',
      rating: 4.7,
      reviews: 1205,
      likes: 800,
      saves: 420,
      distance: 1.2,
      status: 'Open now'
    },
    {
      id: 3,
      lat: 42.2880,
      lng: 18.8420,
      category: 'Nightlife',
      imageUrl: 'assets/top-hill.jpg',
      title: 'Top Hill Club',
      rating: 4.8,
      reviews: 2100,
      likes: 1500,
      saves: 900,
      distance: 2.5,
      status: 'Closed'
    }
  ];

  constructor(
    private router: Router,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.calculateRecommendations();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  calculateRecommendations() {
    const sorted = [...this.locationsList].map(loc => {
      const popularityScore = (loc.rating * 100) + loc.reviews + (loc.likes || 0) + (loc.saves || 0);
      return { ...loc, popularityScore };
    });
    sorted.sort((a, b) => b.popularityScore - a.popularityScore);
    this.recommendedLocations = sorted.slice(0, 3);
  }

  focusOnLocation(loc: any) {
    if (this.map) {
      this.map.flyTo([loc.lat, loc.lng], 16, { animate: true, duration: 1 });
      this.selectedLocation = loc;
      this.cdr.detectChanges();
    }
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='52' height='52' viewBox='0 0 52 52'%3E%3Crect width='52' height='52' fill='%23f1f5f9'/%3E%3Cpath d='M20 34l6-8 4 5 3-4 5 7H14z' fill='%23cbd5e1'/%3E%3Ccircle cx='33' cy='20' r='3' fill='%23cbd5e1'/%3E%3C/svg%3E`;
    img.onerror = null;
  }

  // --- TOGGLE CATEGORY FILTER ---
  toggleCategory(cat: any) {
    cat.active = !cat.active;
    this.applyMarkerFilter();
  }

  toggleAllCategories() {
    const allActive = this.categories.every(c => c.active);
    this.categories.forEach(c => c.active = !allActive);
    this.applyMarkerFilter();
  }

  get allCategoriesActive(): boolean {
    return this.categories.every(c => c.active);
  }

  private applyMarkerFilter() {
    const activeKeys = new Set(this.categories.filter(c => c.active).map(c => c.key));
    this.markers.forEach(({ loc, marker }) => {
      const cat = loc.category || 'default';
      if (activeKeys.has(cat)) {
        if (!this.map!.hasLayer(marker)) {
          marker.addTo(this.map!);
        }
      } else {
        if (this.map!.hasLayer(marker)) {
          this.map!.removeLayer(marker);
        }
      }
    });
  }
  // --------------------------------

  private initMap(): void {
    this.map = L.map('map', { zoomControl: false }).setView([42.2784, 18.8372], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    const categoryColors: Record<string, { bg: string; icon: string }> = {
      'Beach':      { bg: '#0ea5e9', icon: 'beach' },
      'Nature':     { bg: '#22c55e', icon: 'nature' },
      'Culture':    { bg: '#f59e0b', icon: 'culture' },
      'Food':       { bg: '#ef4444', icon: 'food' },
      'Restaurant': { bg: '#ef4444', icon: 'food' },
      'Nightlife':  { bg: '#8b5cf6', icon: 'nightlife' },
      'Activities': { bg: '#f97316', icon: 'activity' },
      'Events':     { bg: '#14b8a6', icon: 'events' },
    };

    const svgIcons: Record<string, string> = {
      beach: '<path d="M13.127 14.56l1.43-1.43 6.44 6.443L19.57 21zm4.293-5.73l2.86-2.86c-3.95-3.95-10.35-3.96-14.3-.02 3.93-1.3 8.31-.25 11.44 2.88zM5.95 5.98c-3.94 3.95-3.93 10.35.02 14.3l2.86-2.86C5.7 14.29 4.65 9.91 5.95 5.98zm.02-.02l-.01.01c-.38 3.01 1.17 6.88 4.7 10.41l5.39-5.39c-3.53-3.53-7.4-5.09-10.08-5.03z"/>',
      nature: '<path d="M17 8C8 10 5.9 16.17 3.82 21H5.1c.8-1.73 1.87-3.11 3.1-4.1C9.38 17.91 10.5 18.8 12 19c2.83.33 4.76-1.42 7-2 .57-.15 1.13-.24 1.7-.29C22.21 16.09 22.92 14.41 23 13c.08-1.35-.4-3.07-3-4.5C20 8.5 18.5 7.64 17 8z"/>',
      culture: '<path d="M12 3L2 12h3v8h14v-8h3L12 3zm0 12.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>',
      food: '<path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>',
      nightlife: '<path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z"/>',
      activity: '<path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/>',
      events: '<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>',
      default: '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>',
    };

    const getMarkerHtml = (category: string): string => {
      const cat = categoryColors[category] || { bg: '#22c55e', icon: 'default' };
      const iconPath = svgIcons[cat.icon] || svgIcons['default'];
      return `
        <div style="
          width:36px;height:36px;
          background:${cat.bg};
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 3px 10px rgba(0,0,0,0.25);
          border:2px solid rgba(255,255,255,0.6);
          cursor:pointer;
        ">
          <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="white">${iconPath}</svg>
          </div>
        </div>`;
    };

    this.locationsList.forEach(loc => {
      const category = (loc as any).postType || (loc as any).category || 'default';
      const icon = L.divIcon({
        html: getMarkerHtml(category),
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      });
      const lat = (loc as any).lat ?? (loc as any).latitude;
      const lng = (loc as any).lng ?? (loc as any).longitude;
      if (!lat || !lng) return;
      const marker = L.marker([lat, lng], { icon }).addTo(this.map!);

      // Čuvamo referencu za filter
      this.markers.push({ loc, marker });

      marker.on('click', (event: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(event as any);
        this.zone.run(() => {
          this.selectedLocation = loc;
          this.cdr.detectChanges();
        });
      });
    });
  }

  closeLocationDetails(): void {
    this.selectedLocation = null;
  }

  viewFullDetails() {
    if (this.selectedLocation) {
      this.router.navigate(['/location-details', this.selectedLocation.id]);
    }
  }

  // --- SEARCH LOGIC ---
  onSearchInput(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) {
      this.searchResults = [];
      return;
    }
    this.searchResults = this.locationsList.filter(loc =>
      loc.title.toLowerCase().includes(q) ||
      loc.category.toLowerCase().includes(q)
    );
  }

  selectSearchResult(loc: any) {
    this.searchQuery = loc.title;
    this.searchResults = [];
    this.focusOnLocation(loc);
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
  }

  getCategoryIcon(category: string): string {
    const cat = this.categories.find(c => c.key === category);
    return cat ? cat.icon : '📍';
  }
  // ----------------------

  get activeFilterCount(): number {
    return this.categories.filter(c => c.active).length;
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
    if (this.authService.isLoggedIn) {
      this.activeTab = 'saved';
      this.router.navigate(['/saved']);
    } else {
      this.showAuthPopup = true;
    }
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