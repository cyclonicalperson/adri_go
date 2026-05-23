import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { GeolocationService, UserPosition } from '../services/geolocation.service';
import { Location, LocationService } from '../services/location.service';
import { RecommendationService } from '../services/recommendation.service';
import { TouristAnalyticsService } from '../services/tourist-analytics.service';
import { formatPostType } from '../utils/post-type.utils';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';

@Component({
  selector: 'app-explore-section',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderComponent],
  templateUrl: './explore-section.component.html',
  styleUrls: ['./explore-section.component.css']
})
export class ExploreSectionComponent implements OnInit {
  readonly IMAGE_BASE_URL = 'http://localhost:5125/';

  section: 'near-you' | 'recommended' | 'top-rated' = 'near-you';
  locations: Location[] = [];
  sortValue: 'distance:asc' | 'createdAt:desc' | 'title:asc' | 'rating:desc' | 'reviews:desc' = 'distance:asc';
  hasSearched = true; // locations loaded = search already done
  sortOpen = false;
  isLoading = false;
  feedbackMessage = '';
  showAuthPopup = false;
  authPopupMessage = 'Please log in to save locations, like places, and add items to your calendar.';
  private userPosition: UserPosition | null = null;

  get sectionLabel(): string {
    switch (this.section) {
      case 'near-you': return '📍 Near You';
      case 'recommended': return '✨ Recommended for You';
      case 'top-rated': return '🌟 Top Rated';
    }
  }

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private locationService: LocationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private geolocationService: GeolocationService,
    private recommendationService: RecommendationService,
    private analyticsService: TouristAnalyticsService,
  ) {}

  ngOnInit(): void {
    const s = this.route.snapshot.queryParamMap.get('section');
    if (s === 'near-you' || s === 'recommended' || s === 'top-rated') {
      this.section = s;
    }
    this.loadData();
  }

  private loadData(): void {
    this.isLoading = true;
    this.locationService.getLocations(1, 200).subscribe({
      next: async (res) => {
        let decorated = res.data;
        try {
          const pos = await this.geolocationService.requestCurrentPosition();
          if (pos) {
            this.userPosition = pos;
            decorated = decorated.map(l => {
              const c = this.getCoords(l);
              return { ...l, distanceKm: c ? this.geolocationService.haversineKm(pos, c) : null };
            });
          }
        } catch { /* geo unavailable */ }

        const all = this.applyGuestState(decorated);
        this.locations = this.sortLocations(this.buildSection(all));
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private buildSection(all: Location[]): Location[] {
    const pos = this.userPosition
      ? [this.userPosition.lat, this.userPosition.lng] as [number, number]
      : null;

    switch (this.section) {
      case 'near-you':
        const withDist = all.filter(l => l.distanceKm != null).sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
        const noDist = all.filter(l => l.distanceKm == null);
        return [...withDist, ...noDist];

      case 'recommended':
        try {
          const cal: any[] = [];
          const ev = this.analyticsService.getRecentEvents();
          return this.recommendationService.buildPersonalizedRecommendations(
            all, null, [], cal, ev, { userPosition: pos }
          ).map(r => r.location);
        } catch {
          return [...all].filter(l => l.avgRating != null).sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
        }

      case 'top-rated':
        try {
          return this.recommendationService.buildGlobalRecommendations(all, { userPosition: pos })
            .map(r => r.location);
        } catch {
          return [...all].filter(l => l.avgRating != null).sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
        }
    }
  }

  onSort(value: typeof this.sortValue): void {
    this.sortValue = value;
    this.locations = this.sortLocations(this.locations);
  }

  private sortLocations(items: Location[]): Location[] {
    const sorted = [...items];
    switch (this.sortValue) {
      case 'title:asc':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'rating:desc':
        return sorted.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
      case 'reviews:desc':
        return sorted.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
      case 'createdAt:desc':
        return sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      case 'distance:asc':
      default:
        return sorted.sort((a, b) => {
          const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
          const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
          if (da !== db) return da - db;
          return (b.avgRating ?? 0) - (a.avgRating ?? 0);
        });
    }
  }

  private applyGuestState(locations: Location[]): Location[] {
    if (this.authService.isLoggedIn) return locations;
    return locations.map(loc => ({ ...loc, isLiked: false, isSaved: false }));
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
      error: (err) => { if (err.status === 401) this.router.navigate(['/login']); }
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
      error: (err) => { if (err.status === 401) this.router.navigate(['/login']); }
    });
  }

  goBack(): void { this.router.navigate(['/location-list']); }
  viewDetails(id: number): void { this.router.navigate(['/location-details', id]); }
  goToLogin(): void { this.router.navigate(['/login']); }
  goToMap(): void { this.router.navigate(['/map-home']); }
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
    if (!this.authService.isLoggedIn) {
      this.openAuthPopup('Please log in to view your account.');
      return;
    }
    this.router.navigate(['/account']);
  }
  formatDistance(distanceKm?: number | null): string { return this.geolocationService.formatDistanceKm(distanceKm); }
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

  private getCoords(location: Partial<Location>): UserPosition | null {
    const lat = location.lat ?? location.latitude;
    const lng = location.lng ?? location.longitude;
    if (lat == null || lng == null) return null;
    return { lat: Number(lat), lng: Number(lng) };
  }
}
