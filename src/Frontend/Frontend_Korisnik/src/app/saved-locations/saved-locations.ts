import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LocationService, Location } from '../services/location.service';
import { AuthService } from '../services/auth.service';
import { FilterStateService } from '../services/filter-state.service';
import { resolveBackendAssetUrl } from '../utils/backend-url.utils';
import { TouristPreferencesService } from '../services/tourist-preferences.service';
import { formatPostType } from '../utils/post-type.utils';

@Component({
  selector: 'app-saved-locations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './saved-locations.html',
  styleUrls: ['./saved-locations.css']
})
export class SavedLocationsComponent implements OnInit {
  activeFilter: string = 'All';
  defaultImage: string = 'assets/plaza.jpg';
  isLoading: boolean = true;
  isGuest: boolean = false;

  filters = [
    { id: 'All',             label: 'All',         icon: '📍', color: '#22c55e' },
    { id: 'attraction',      label: 'Attractions', icon: '🏖️', color: '#10b981' },
    { id: 'restaurant',      label: 'Restaurants', icon: '🍴', color: '#ef4444' },
    { id: 'cultural_site',   label: 'Culture',     icon: '🏛️', color: '#f59e0b' },
    { id: 'monument',        label: 'Monuments',   icon: '🗿', color: '#d97706' },
    { id: 'club',            label: 'Nightlife',   icon: '🎉', color: '#8b5cf6' },
    { id: 'sports_facility', label: 'Activities',  icon: '🎡', color: '#22c55e' },
    { id: 'event',           label: 'Events',      icon: '📅', color: '#ec4899' },
    { id: 'accommodation',   label: 'Stays',       icon: '🏨', color: '#3b82f6' },
    { id: 'shop',            label: 'Shopping',    icon: '🛍️', color: '#f97316' },
  ];

  savedItems: any[] = [];

  constructor(
    public router: Router,
    private locationService: LocationService,
    private authService: AuthService,
    private filterStateService: FilterStateService,
    private preferences: TouristPreferencesService,
    private cdr: ChangeDetectorRef
  ) {}

  userPosition: [number, number] | null = null;

  ngOnInit() {
    if (this.preferences.snapshot.locationSharing) {
      this.requestGeolocation();
    }

    if (this.authService.isLoggedIn) {
      this.loadSavedLocations();
    } else {
      this.isGuest = true;
      this.isLoading = false;
      this.router.navigate(['/login']);
    }
  }

  private requestGeolocation(): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userPosition = [pos.coords.latitude, pos.coords.longitude];
        // Recalculate distances now that we have a position
        this.savedItems = this.savedItems.map(item => ({
          ...item,
          distance: item._lat && item._lng
            ? this.haversineKm(this.userPosition![0], this.userPosition![1], item._lat, item._lng)
            : null
        }));
        this.cdr.detectChanges();
      },
      () => {} // silent fail
    );
  }

  private isOpenNow(openingHours?: string): boolean {
    if (!openingHours) return true; // no hours → assume open
    try {
      const obj = JSON.parse(openingHours);
      const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const now = new Date();
      const todayHours: string = obj[dayKeys[now.getDay()]];
      if (!todayHours || todayHours === 'closed') return false;
      if (todayHours === '00:00-24:00' || todayHours === '0:00-24:00') return true;
      const [openStr, closeStr] = todayHours.split('-');
      const toMins = (t: string) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };
      const nowMins   = now.getHours() * 60 + now.getMinutes();
      const openMins  = toMins(openStr);
      const closeMins = toMins(closeStr);
      if (closeMins <= openMins) {
        // Overnight (e.g. 22:00–06:00)
        return nowMins >= openMins || nowMins < closeMins;
      }
      return nowMins >= openMins && nowMins < closeMins;
    } catch { return true; }
  }

  formatPostType(type?: string | null): string {
    return formatPostType(type);
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
  }

  // ── Logged-in: load from API ──────────────────────────────────
  loadSavedLocations() {
    this.isLoading = true;
    this.locationService.getMySavedPosts().subscribe({
      next: (posts: Location[]) => {
        this.savedItems = posts.map(post => this.mapToItem(post));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error loading saved locations:', err);
        this.isLoading = false;
        if (err.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        this.cdr.detectChanges();
      }
    });
  }

  private mapToItem(post: Location): any {
    const imagesArr = this.locationService.parseImages(post.images);
    const firstImage = resolveBackendAssetUrl(
      imagesArr.length > 0 ? imagesArr[0] : null,
      this.defaultImage,
    );
    const lat = (post as any).lat ?? (post as any).latitude;
    const lng = (post as any).lng ?? (post as any).longitude;
    const distance = (this.userPosition && lat && lng)
      ? this.haversineKm(this.userPosition[0], this.userPosition[1], lat, lng)
      : null;
    const isOpen = this.isOpenNow((post as any).openingHours);
    return {
      id: post.id,
      title: post.title,
      category: post.postType || 'Unknown',
      rating: post.avgRating || 0,
      reviews: post.reviewCount || 0,
      distance,
      _lat: lat,   // keep for later recalculation after geolocation
      _lng: lng,
      status: isOpen ? 'Open Now' : 'Closed',
      isOpen,
      imageUrl: firstImage,
      isLiked: !!(post as any).isLiked,
      isSaved: true,  // all items here are saved by definition
      likeCount: (post as any).likeCount || 0,
      saveCount: (post as any).saveCount || 0
    };
  }

  get filteredItems() {
    if (this.activeFilter === 'All') return this.savedItems;
    return this.savedItems.filter(item =>
      item.category.toLowerCase() === this.activeFilter.toLowerCase()
    );
  }

  get isEmptyStateVisible(): boolean {
    return !this.isLoading && this.filteredItems.length === 0;
  }

  setFilter(filter: string) { this.activeFilter = filter; }

  goBack() { window.history.back(); }

  viewDetails(id: number) { this.router.navigate(['/location-details', id]); }

  showOnMap() {
    // Save current saved IDs to filter state so map can show only these
    const ids = this.savedItems.map(item => item.id as number);
    const currentState = this.filterStateService.get();
    this.filterStateService.set({
      ...currentState,
      showOnlySaved: true,
      savedPostIds: ids
    });
    this.router.navigate(['/map-home']);
  }

  removeSaved(id: number, event: Event) {
    event.stopPropagation();
    const originalItems = [...this.savedItems];
    this.savedItems = this.savedItems.filter(item => item.id !== id);

    if (this.isGuest) {
      this.router.navigate(['/login']);
      this.cdr.detectChanges();
      return;
    }

    this.locationService.toggleSaveLocation(id).subscribe({
      next: () => { this.cdr.detectChanges(); },
      error: () => {
        this.savedItems = originalItems;
        this.cdr.detectChanges();
      }
    });
  }

  toggleLike(item: any, event: Event) {
    event.stopPropagation();

    if (this.isGuest) {
      this.router.navigate(['/login']);
      this.cdr.detectChanges();
      return;
    }

    if (item.isLiked) {
      this.locationService.unlikeLocation(item.id).subscribe({
        next: () => {
          item.isLiked = false;
          item.likeCount = Math.max(0, (item.likeCount || 0) - 1);
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Unlike error:', err)
      });
    } else {
      this.locationService.likeLocation(item.id).subscribe({
        next: () => {
          item.isLiked = true;
          item.likeCount = (item.likeCount || 0) + 1;
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Like error:', err)
      });
    }
  }
}
