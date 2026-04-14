import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LocationService, Location, Review } from '../services/location.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-location-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './location-details.html',
  styleUrls: ['./location-details.css']
})
export class LocationDetailsComponent implements OnInit {

  location: Location | null = null;
  reviews: Review[] = [];
  images: string[] = [];
  isLoading = true;
  errorMessage = '';
  likeMessage  = '';
  saveMessage  = '';
  showReviewForm     = false;
  newRating          = 5;
  newComment         = '';
  reviewError        = '';
  reviewSuccess      = '';
  isSubmittingReview = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private locationService: LocationService,
    public  authService: AuthService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/location-list']); return; }

    this.locationService.getLocationById(id).subscribe({
      next: (loc) => {
        this.location  = loc;
        this.images    = this.locationService.parseImages(loc.images);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('getLocationById error:', err);
        this.errorMessage = 'Lokacija nije pronađena.';
        this.isLoading    = false;
      }
    });

    this.locationService.getReviews(id).subscribe({
      next:  (res) => { this.reviews = res.data ?? []; },
      error: (err) => console.error('getReviews error:', err)
    });

    const touristId = this.authService.touristId;
    if (touristId) {
      this.locationService.registerView(id, touristId).subscribe({
        error: (err) => console.warn('registerView:', err.status)
      });
    }
  }

  onLike(): void {
    const touristId = this.authService.touristId;
    if (!touristId || !this.location) { this.router.navigate(['/login']); return; }
    this.locationService.likeLocation(this.location.id, touristId).subscribe({
      next: (res) => {
        if (res.likeCount !== undefined && this.location) this.location.likeCount = res.likeCount;
        this.likeMessage = res.message;
        setTimeout(() => (this.likeMessage = ''), 3000);
      },
      error: (err) => console.error('like error:', err)
    });
  }

  onSave(): void {
    const touristId = this.authService.touristId;
    if (!touristId || !this.location) { this.router.navigate(['/login']); return; }
    this.locationService.saveLocation(this.location.id, touristId).subscribe({
      next: (res) => {
        if (res.saveCount !== undefined && this.location) this.location.saveCount = res.saveCount;
        this.saveMessage = res.message;
        setTimeout(() => (this.saveMessage = ''), 3000);
      },
      error: (err) => console.error('save error:', err)
    });
  }

  submitReview(): void {
    const touristId = this.authService.touristId;
    if (!touristId || !this.location) return;
    this.reviewError   = '';
    this.reviewSuccess = '';
    this.isSubmittingReview = true;
    this.locationService.addReview(this.location.id, touristId, this.newRating, this.newComment).subscribe({
      next: (review) => {
        this.reviews.unshift(review);
        this.reviewSuccess = 'Review submitted!';
        this.newRating  = 5;
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
    const r = Math.min(5, Math.max(0, Math.round(rating)));
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  }

  goToLogin(): void { this.router.navigate(['/login']); }

  goBack(): void { window.history.back(); }

  getDirections(): void {
    const lat = this.location?.lat ?? (this.location as any)?.latitude;
    const lng = this.location?.lng ?? (this.location as any)?.longitude;
    if (lat && lng) window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
  }
}
