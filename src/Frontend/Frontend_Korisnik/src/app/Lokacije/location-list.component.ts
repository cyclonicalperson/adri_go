import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SideMenuComponent } from '../SideMenu/side-menu.component';
import { LocationService, Location } from '../services/location.service';
import { AuthService } from '../services/auth.service';
import { resolveBackendAssetUrl } from '../utils/backend-url.utils';

@Component({
  selector: 'app-location-list',
  standalone: true,
  imports: [CommonModule, SideMenuComponent],
  templateUrl: './location-list.component.html',
  styleUrls: ['./location-list.component.css']
})
export class LocationListComponent implements OnInit {
  isMenuOpen = false;
  locations: Location[] = [];
  isLoading = false;
  errorMessage = '';
  feedbackMessage = '';

  constructor(
    private router: Router,
    private locationService: LocationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void { this.loadLocations(); }

  loadLocations(): void {
    this.isLoading = true;
    this.locationService.getLocations().subscribe({
      next: (res) => { this.locations = res.data; this.isLoading = false; this.cdr.markForCheck(); },
      error: () => { this.errorMessage = 'Greska pri ucitavanju lokacija.'; this.isLoading = false; this.cdr.markForCheck(); }
    });
  }

  onLike(loc: Location, event: Event): void {
    event.stopPropagation();
    if (!this.authService.isLoggedIn) { this.router.navigate(['/login']); return; }
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
    if (!this.authService.isLoggedIn) { this.router.navigate(['/login']); return; }
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

  private showFeedback(msg: string): void {
    this.feedbackMessage = msg;
    setTimeout(() => (this.feedbackMessage = ''), 2500);
  }

  toggleMenu():    void { this.isMenuOpen = !this.isMenuOpen; }
  goToMap():       void { this.router.navigate(['/map-home']); }
  openFilters():   void { this.router.navigate(['/filters']); }
  viewDetails(id: number): void { this.router.navigate(['/location-details', id]); }

  getFirstImage(loc: any): string {
    if (!loc || !loc.images) {
      return 'assets/placeholder.jpg';
    }

    let firstImg = '';

    if (typeof loc.images === 'string') {
      try {
        const parsed = JSON.parse(loc.images);
        firstImg = parsed.length > 0 ? parsed[0] : '';
      } catch {
        firstImg = loc.images;
      }
    } else if (Array.isArray(loc.images) && loc.images.length > 0) {
      firstImg = loc.images[0];
    }

    return resolveBackendAssetUrl(firstImg, 'assets/placeholder.jpg');
  }
}
