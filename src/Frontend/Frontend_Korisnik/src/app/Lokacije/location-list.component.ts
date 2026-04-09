

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SideMenuComponent } from '../SideMenu/side-menu.component';
import { LocationService, Location } from '../services/location.service';
import { AuthService } from '../services/auth.service';

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

  // Feedback poruke za like/save
  feedbackMessage = '';

  constructor(
    private router: Router,
    private locationService: LocationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadLocations();
  }

  loadLocations(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.locationService.getLocations().subscribe({
      next: (res) => {
        this.locations = res.data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Greška pri učitavanju lokacija.';
        this.isLoading = false;
      }
    });
  }

  // ── Like ──────────────────────────────────────────────────────────────────
  onLike(loc: Location, event: Event): void {
    event.stopPropagation();
    const touristId = this.authService.touristId;
    if (!touristId) {
      this.router.navigate(['/login']);
      return;
    }
    this.locationService.likeLocation(loc.id, touristId).subscribe({
      next: (res) => {
        if (res.likeCount !== undefined) loc.likeCount = res.likeCount;
        this.showFeedback('❤️ Liked!');
      },
      error: (err) => console.error(err)
    });
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  onSave(loc: Location, event: Event): void {
    event.stopPropagation();
    const touristId = this.authService.touristId;
    if (!touristId) {
      this.router.navigate(['/login']);
      return;
    }
    this.locationService.saveLocation(loc.id, touristId).subscribe({
      next: (res) => {
        if (res.saveCount !== undefined) loc.saveCount = res.saveCount;
        this.showFeedback('🔖 Saved!');
      },
      error: (err) => console.error(err)
    });
  }

  private showFeedback(msg: string): void {
    this.feedbackMessage = msg;
    setTimeout(() => (this.feedbackMessage = ''), 2500);
  }

  // ── Navigacija ────────────────────────────────────────────────────────────
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  goToMap(): void {
    this.router.navigate(['/map-home']);
  }

  openFilters(): void {
    this.router.navigate(['/filters']);
  }

  viewDetails(id: number): void {
    this.router.navigate(['/location-details', id]);
  }

  // ── Helper ────────────────────────────────────────────────────────────────
  getFirstImage(loc: Location): string {
    const imgs = this.locationService.parseImages(loc.images);
    return imgs[0] || 'assets/Budva.jpg';
  }
}
