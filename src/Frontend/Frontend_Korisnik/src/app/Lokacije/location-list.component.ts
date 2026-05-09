import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SideMenuComponent } from '../SideMenu/side-menu.component';
import { AuthService } from '../services/auth.service';
import { GeolocationService, UserPosition } from '../services/geolocation.service';
import { Location, LocationService } from '../services/location.service';
import { formatPostType } from '../utils/post-type.utils';

@Component({
  selector: 'app-location-list',
  standalone: true,
  imports: [CommonModule, SideMenuComponent],
  templateUrl: './location-list.component.html',
  styleUrls: ['./location-list.component.css']
})
export class LocationListComponent implements OnInit {
  readonly IMAGE_BASE_URL = 'http://localhost:5125/';

  isMenuOpen = false;
  locations: Location[] = [];
  isLoading = false;
  errorMessage = '';
  feedbackMessage = '';
  private userPosition: UserPosition | null = null;

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

  loadLocations(): void {
    this.isLoading = true;
    this.locationService.getLocations().subscribe({
      next: (res) => {
        const decorated = this.decorateLocations(res.data);
        this.locations = this.applyGuestState(decorated);
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
      if (idx >= 0) {
        liked.splice(idx, 1);
        loc.isLiked = false;
        loc.likeCount = Math.max(0, (loc.likeCount || 0) - 1);
      } else {
        liked.push(loc.id);
        loc.isLiked = true;
        loc.likeCount = (loc.likeCount || 0) + 1;
      }
      localStorage.setItem('guest_liked_ids', JSON.stringify(liked));
      this.showFeedback(loc.isLiked ? '❤️ Liked!' : 'Like removed');
      this.cdr.markForCheck();
      return;
    }

    const action$ = loc.isLiked
      ? this.locationService.unlikeLocation(loc.id)
      : this.locationService.likeLocation(loc.id);

    action$.subscribe({
      next: (res) => {
        loc.isLiked = !loc.isLiked;
        if (res.likeCount !== undefined) loc.likeCount = res.likeCount;
        this.showFeedback(loc.isLiked ? '❤️ Liked!' : 'Like removed');
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
      const saved: number[] = JSON.parse(localStorage.getItem('guest_saved_ids') || '[]');
      const idx = saved.indexOf(loc.id);
      if (idx >= 0) {
        saved.splice(idx, 1);
        loc.isSaved = false;
        loc.saveCount = Math.max(0, (loc.saveCount || 0) - 1);
      } else {
        saved.push(loc.id);
        loc.isSaved = true;
        loc.saveCount = (loc.saveCount || 0) + 1;
      }
      localStorage.setItem('guest_saved_ids', JSON.stringify(saved));
      this.showFeedback(loc.isSaved ? '🔖 Saved!' : 'Removed from saved');
      this.cdr.markForCheck();
      return;
    }

    const action$ = loc.isSaved
      ? this.locationService.unsaveLocation(loc.id)
      : this.locationService.saveLocation(loc.id);

    action$.subscribe({
      next: (res) => {
        loc.isSaved = !loc.isSaved;
        if (res.saveCount !== undefined) loc.saveCount = res.saveCount;
        this.showFeedback(loc.isSaved ? '🔖 Saved!' : 'Removed from saved');
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
  openFilters(): void { this.router.navigate(['/filters'], { queryParams: { returnTo: 'location-list' } }); }
  viewDetails(id: number): void { this.router.navigate(['/location-details', id]); }

  formatDistance(distanceKm?: number | null): string {
    return this.geolocationService.formatDistanceKm(distanceKm);
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

  private getLocationCoordinates(location: Partial<Location>): UserPosition | null {
    const lat = location.lat ?? location.latitude;
    const lng = location.lng ?? location.longitude;

    if (lat == null || lng == null) {
      return null;
    }

    return { lat: Number(lat), lng: Number(lng) };
  }
}
