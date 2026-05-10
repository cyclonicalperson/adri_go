import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SideMenuComponent } from '../SideMenu/side-menu.component';
import { AuthService } from '../services/auth.service';
import { GeolocationService, UserPosition } from '../services/geolocation.service';
import { Location, LocationService } from '../services/location.service';
import { formatPostType } from '../utils/post-type.utils';

type SearchContext = {
  lat: number;
  lng: number;
};

@Component({
  selector: 'app-location-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SideMenuComponent],
  templateUrl: './location-list.component.html',
  styleUrls: ['./location-list.component.css']
})
export class LocationListComponent implements OnInit, OnDestroy {
  readonly IMAGE_BASE_URL = 'http://localhost:5125/';

  isMenuOpen = false;
  searchQuery = '';
  allLocations: Location[] = [];
  locations: Location[] = [];
  isLoading = false;
  errorMessage = '';
  feedbackMessage = '';
  private userPosition: UserPosition | null = null;
  private searchRequestId = 0;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly searchDebounceMs = 200;

  constructor(
    private router: Router,
    private locationService: LocationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private geolocationService: GeolocationService
  ) {}

  ngOnInit(): void {
    this.loadLocations();
    this.loadUserPosition();
  }

  ngOnDestroy(): void {
    this.clearSearchDebounce();
  }

  loadLocations(): void {
    this.isLoading = true;
    this.locationService.getLocations().subscribe({
      next: (res) => {
        const decoratedLocations = this.decorateLocations(res.data);
        this.allLocations = decoratedLocations;
        this.locations = decoratedLocations;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Greska pri ucitavanju lokacija.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onLike(loc: Location, event: Event): void {
    event.stopPropagation();
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    const action$ = loc.isLiked
      ? this.locationService.unlikeLocation(loc.id)
      : this.locationService.likeLocation(loc.id);

    action$.subscribe({
      next: (res) => {
        loc.isLiked = !loc.isLiked;
        if (res.likeCount !== undefined) loc.likeCount = res.likeCount;
        this.showFeedback(loc.isLiked ? 'Liked!' : 'Removed like');
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err.status === 401) this.router.navigate(['/login']);
        else console.error(err);
      }
    });
  }

  onSave(loc: Location, event: Event): void {
    event.stopPropagation();
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    const action$ = loc.isSaved
      ? this.locationService.unsaveLocation(loc.id)
      : this.locationService.saveLocation(loc.id);

    action$.subscribe({
      next: (res) => {
        loc.isSaved = !loc.isSaved;
        if (res.saveCount !== undefined) loc.saveCount = res.saveCount;
        this.showFeedback(loc.isSaved ? 'Saved!' : 'Removed from saved');
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (err.status === 401) this.router.navigate(['/login']);
        else console.error(err);
      }
    });
  }

  toggleMenu(): void { this.isMenuOpen = !this.isMenuOpen; }
  goToMap(): void { this.router.navigate(['/map-home']); }
  openFilters(): void { this.router.navigate(['/filters']); }
  viewDetails(id: number): void { this.router.navigate(['/location-details', id]); }

  formatDistance(distanceKm?: number | null): string {
    return this.geolocationService.formatDistanceKm(distanceKm);
  }

  onSearchInputChange(): void {
    this.clearSearchDebounce();

    // Prazan unos odmah vraca punu listu i ignorise stare odgovore pretrage.
    if (!this.searchQuery.trim()) {
      ++this.searchRequestId;
      this.isLoading = false;
      this.errorMessage = '';
      this.locations = [...this.allLocations];
      this.cdr.markForCheck();
      return;
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.searchLocations();
    }, this.searchDebounceMs);
  }

  getFirstImage(loc: Partial<Location> & { images?: string | string[] }): string {
    if (!loc || !loc.images) {
      return 'assets/placeholder.jpg';
    }

    let firstImg = '';

    if (typeof loc.images === 'string') {
      try {
        const parsed = JSON.parse(loc.images) as string[];
        firstImg = parsed.length > 0 ? parsed[0] : '';
      } catch {
        firstImg = loc.images;
      }
    } else if (Array.isArray(loc.images) && loc.images.length > 0) {
      firstImg = loc.images[0];
    }

    if (!firstImg) return 'assets/placeholder.jpg';

    if (!firstImg.startsWith('http')) {
      const cleanPath = firstImg.startsWith('/') ? firstImg.substring(1) : firstImg;
      return `${this.IMAGE_BASE_URL}${cleanPath}`;
    }

    return firstImg;
  }

  formatPostType(type?: string | null): string {
    return formatPostType(type);
  }

  private showFeedback(msg: string): void {
    this.feedbackMessage = msg;
    setTimeout(() => (this.feedbackMessage = ''), 2500);
  }

  private loadUserPosition(): void {
    void this.geolocationService.requestCurrentPosition().then((position) => {
      if (!position) {
        return;
      }

      this.userPosition = position;
      const decoratedLocations = this.decorateLocations(this.locations);
      this.allLocations = decoratedLocations;
      this.locations = decoratedLocations;
      this.cdr.markForCheck();
    });
  }

  private decorateLocations(locations: Location[]): Location[] {
    if (!this.userPosition) {
      return locations.map((location) => ({ ...location, distanceKm: null }));
    }

    return [...locations]
      .map((location) => {
        const coordinates = this.getLocationCoordinates(location);
        const distanceKm = coordinates
          ? this.geolocationService.haversineKm(this.userPosition!, coordinates)
          : null;

        return { ...location, distanceKm };
      })
      .sort((left, right) => {
        const leftDistance = (left as any).distanceKm ?? Number.POSITIVE_INFINITY;
        const rightDistance = (right as any).distanceKm ?? Number.POSITIVE_INFINITY;
        return leftDistance - rightDistance;
      });
  }

  searchLocations(): void {
    this.clearSearchDebounce();
    const query = this.searchQuery.trim();
    const requestId = ++this.searchRequestId;
    if (!query) {
      this.isLoading = false;
      this.errorMessage = '';
      this.locations = [...this.allLocations];
      this.cdr.markForCheck();
      return;
    }

    const context = this.getSearchContext();
    this.isLoading = true;

    this.locationService.searchLocations(query, 1, 20, context).subscribe({
      next: (res) => {
        // Ignorisemo starije odgovore ako korisnik nastavi da kuca ili obrise unos.
        if (requestId !== this.searchRequestId) {
          return;
        }

        this.locations = this.decorateLocations(res.data);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        if (requestId !== this.searchRequestId) {
          return;
        }

        this.errorMessage = 'Greska pri pretrazi lokacija.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private getLocationCoordinates(location: Partial<Location>): UserPosition | null {
    const lat = location.lat ?? location.latitude;
    const lng = location.lng ?? location.longitude;

    if (lat == null || lng == null) {
      return null;
    }

    return { lat: Number(lat), lng: Number(lng) };
  }

  private getSearchContext(): SearchContext | undefined {
    if (this.userPosition) {
      return this.userPosition;
    }

    // Ako nema zive lokacije, trazimo oko zadnjeg dela mape koji je korisnik gledao.
    const rawMapCenter = localStorage.getItem('adriGo.mapCenter');
    if (!rawMapCenter) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(rawMapCenter) as Partial<SearchContext>;
      if (parsed.lat == null || parsed.lng == null) {
        return undefined;
      }

      return { lat: Number(parsed.lat), lng: Number(parsed.lng) };
    } catch {
      return undefined;
    }
  }

  private clearSearchDebounce(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
  }
}
