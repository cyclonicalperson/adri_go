

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LocationService, Location, Review } from '../services/location.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-location-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-details.html',
  styleUrls: ['./location-details.css']
})
export class LocationDetailsComponent implements OnInit {

  location: Location | null = null;
  reviews: Review[] = [];
  images: string[] = [];
  isLoading = true;
  errorMessage = '';

  // Like / Save feedback
  likeMessage = '';
  saveMessage = '';

  // Review forma
  showReviewForm = false;
  newRating = 5;
  newComment = '';
  reviewError = '';
  reviewSuccess = '';
  isSubmittingReview = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private locationService: LocationService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/location-list']); return; }

    // Učitaj lokaciju
    this.locationService.getLocationById(id).subscribe({
      next: (loc) => {
        this.location = loc;
        this.images = this.locationService.parseImages(loc.images);
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Lokacija nije pronađena.';
        this.isLoading = false;
      }
    });

    // Učitaj recenzije
    this.locationService.getReviews(id).subscribe({
      next: (res) => { this.reviews = res.data; },
      error: (err) => console.error('Greška recenzija:', err)
    });

    // Registruj pregled ako je turista prijavljen
    const touristId = this.authService.touristId;
    if (touristId) {
      this.locationService.registerView(id, touristId).subscribe();
    }
  }

  // ── Like ──────────────────────────────────────────────────────────────────
  onLike(): void {
    const touristId = this.authService.touristId;
    if (!touristId || !this.location) { this.router.navigate(['/login']); return; }

    this.locationService.likeLocation(this.location.id, touristId).subscribe({
      next: (res) => {
        if (res.likeCount !== undefined && this.location) this.location.likeCount = res.likeCount;
        this.likeMessage = res.message;
        setTimeout(() => (this.likeMessage = ''), 3000);
      },
      error: (err) => console.error(err)
    });
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  onSave(): void {
    const touristId = this.authService.touristId;
    if (!touristId || !this.location) { this.router.navigate(['/login']); return; }

    this.locationService.saveLocation(this.location.id, touristId).subscribe({
      next: (res) => {
        if (res.saveCount !== undefined && this.location) this.location.saveCount = res.saveCount;
        this.saveMessage = res.message;
        setTimeout(() => (this.saveMessage = ''), 3000);
      },
      error: (err) => console.error(err)
    });
  }

  // ── Review ────────────────────────────────────────────────────────────────
  submitReview(): void {
    const touristId = this.authService.touristId;
    if (!touristId || !this.location) return;

    this.reviewError = '';
    this.reviewSuccess = '';
    this.isSubmittingReview = true;

    this.locationService.addReview(this.location.id, touristId, this.newRating, this.newComment).subscribe({
      next: (review) => {
        this.reviews.unshift(review);
        this.reviewSuccess = 'Review submitted!';
        this.newRating = 5;
        this.newComment = '';
        this.isSubmittingReview = false;
        this.showReviewForm = false;
        if (this.location) this.location.reviewCount++;
      },
      error: (err) => {
        this.reviewError = err?.error?.message || 'Error submitting review.';
        this.isSubmittingReview = false;
      }
    });
  }

  getStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  goBack(): void {
    window.history.back();
  }

  getDirections(): void {
    if (this.location?.lat && this.location?.lng) {
      window.open(`https://maps.google.com/?q=${this.location.lat},${this.location.lng}`, '_blank');
    }
  }
}
