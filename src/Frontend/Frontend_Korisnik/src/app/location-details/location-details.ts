import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LocationService, Location, Review } from '../services/location.service';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

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
  showAllHours       = false;
  showReviewForm     = false;
  distanceKm: number | null = null;
  newRating          = 5;
  newComment         = '';
  reviewError        = '';
  reviewSuccess      = '';
  isSubmittingReview = false;

  calendarMessage = '';
  showAuthModal = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private locationService: LocationService,
    public authService: AuthService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/location-list']); return; }

    // Request user geolocation for distance display
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;
          if (this.location) {
            const lat = (this.location as any).lat ?? (this.location as any).latitude;
            const lng = (this.location as any).lng ?? (this.location as any).longitude;
            if (lat && lng) this.distanceKm = this.haversineKm(userLat, userLng, lat, lng);
          } else {
            // Save for later when location loads
            (this as any)._userPos = [userLat, userLng];
          }
          this.cdr.markForCheck();
        },
        () => {}
      );
    }

    this.locationService.getLocationById(id).subscribe({
      next: (loc) => {
        this.location = loc;
        this.images   = this.locationService.parseImages(loc.images);

        if (!this.authService.isLoggedIn) {
          // Guest: read like/save state from localStorage
          const likedIds: number[] = JSON.parse(localStorage.getItem('guest_liked_ids') || '[]');
          const savedIds: number[] = JSON.parse(localStorage.getItem('guest_saved_ids') || '[]');
          this.location.isLiked          = likedIds.includes(loc.id);
          (this.location as any).isSaved = savedIds.includes(loc.id);
        } else {
          // Logged-in: API returns isLiked and isSaved from DB
          // isLiked is already on Location interface
          // isSaved comes from API as well — normalize to boolean
          if ((loc as any).isSaved !== undefined) {
            (this.location as any).isSaved = !!(loc as any).isSaved;
          } else {
            (this.location as any).isSaved = false;
          }
          if (loc.isLiked === undefined) {
            this.location.isLiked = false;
          }
        }

        // If geolocation came first, calculate distance now
        const savedPos = (this as any)._userPos as [number, number] | undefined;
        if (savedPos) {
          const lat = (loc as any).lat ?? (loc as any).latitude;
          const lng = (loc as any).lng ?? (loc as any).longitude;
          if (lat && lng) this.distanceKm = this.haversineKm(savedPos[0], savedPos[1], lat, lng);
        }

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('getLocationById error:', err);
        this.errorMessage = 'Location not found.';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });

    this.locationService.getReviews(id).subscribe({
      next: (res) => {
        this.reviews = res.data ?? [];
        // Sync reviewCount with the actual count returned by the API
        if (this.location && res.total !== undefined) {
          this.location.reviewCount = res.total;
        }
        this.cdr.markForCheck();
      },
      error: (err) => console.error('getReviews error:', err)
    });

    // Register view only for logged-in users
    const touristId = this.authService.touristId;
    if (touristId) {
      this.locationService.registerView(id, touristId).subscribe({
        error: (err) => console.warn('registerView:', err.status)
      });
    }
  }

  openAuthModal(): void  { this.showAuthModal = true; }
  closeAuthModal(): void { this.showAuthModal = false; }
  goToLoginFromModal(): void { this.router.navigate(['/login']); }

  // ── LIKE ─────────────────────────────────────────────────────────
  onLike(): void {
    if (!this.location) return;

    if (!this.authService.isLoggedIn) {
      this.toggleGuestLike(this.location.id);
      return;
    }

    // Logged-in: use API — always update count locally to avoid stale-overwrite bug
    if (this.location.isLiked) {
      this.locationService.unlikeLocation(this.location.id).subscribe({
        next: () => {
          if (this.location) {
            this.location.isLiked = false;
            this.location.likeCount = Math.max(0, (this.location.likeCount || 0) - 1);
          }
          this.likeMessage = 'Like removed';
          setTimeout(() => (this.likeMessage = ''), 3000);
          this.cdr.markForCheck();
        },
        error: (err) => console.error('unlike error:', err)
      });
    } else {
      this.locationService.likeLocation(this.location.id).subscribe({
        next: () => {
          if (this.location) {
            this.location.isLiked = true;
            this.location.likeCount = (this.location.likeCount || 0) + 1;
          }
          this.likeMessage = '❤️ Liked!';
          setTimeout(() => (this.likeMessage = ''), 3000);
          this.cdr.markForCheck();
        },
        error: (err) => console.error('like error:', err)
      });
    }
  }

  private toggleGuestLike(id: number): void {
    const liked: number[] = JSON.parse(localStorage.getItem('guest_liked_ids') || '[]');
    const idx = liked.indexOf(id);
    if (idx >= 0) {
      liked.splice(idx, 1);
      this.likeMessage = 'Like removed';
      if (this.location) {
        this.location.isLiked = false;
        this.location.likeCount = Math.max(0, (this.location.likeCount || 0) - 1);
      }
    } else {
      liked.push(id);
      this.likeMessage = '❤️ Liked!';
      if (this.location) {
        this.location.isLiked = true;
        this.location.likeCount = (this.location.likeCount || 0) + 1;
      }
    }
    localStorage.setItem('guest_liked_ids', JSON.stringify(liked));
    setTimeout(() => (this.likeMessage = ''), 3000);
    this.cdr.markForCheck();
  }

  // ── SAVE ─────────────────────────────────────────────────────────
  onSave(): void {
    if (!this.location) return;

    if (!this.authService.isLoggedIn) {
      this.toggleGuestSave(this.location.id);
      return;
    }

    // Logged-in: toggle via API — update saveCount locally (API doesn't return it)
    this.locationService.toggleSaveLocation(this.location.id).subscribe({
      next: (res) => {
        if (this.location) {
          (this.location as any).isSaved = res.isSaved;
          if (res.isSaved) {
            this.location.saveCount = (this.location.saveCount || 0) + 1;
          } else {
            this.location.saveCount = Math.max(0, (this.location.saveCount || 0) - 1);
          }
        }
        this.saveMessage = res.isSaved ? '🔖 Saved!' : 'Removed from saved';
        setTimeout(() => (this.saveMessage = ''), 3000);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Save error:', err);
        if (err.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
      }
    });
  }

  private toggleGuestSave(id: number): void {
    const saved: number[] = JSON.parse(localStorage.getItem('guest_saved_ids') || '[]');
    const idx = saved.indexOf(id);
    if (idx >= 0) {
      saved.splice(idx, 1);
      this.saveMessage = 'Removed from saved';
      if (this.location) {
        (this.location as any).isSaved = false;
        this.location.saveCount = Math.max(0, (this.location.saveCount || 0) - 1);
      }
    } else {
      saved.push(id);
      this.saveMessage = '🔖 Saved!';
      if (this.location) {
        (this.location as any).isSaved = true;
        this.location.saveCount = (this.location.saveCount || 0) + 1;
      }
    }
    localStorage.setItem('guest_saved_ids', JSON.stringify(saved));
    setTimeout(() => (this.saveMessage = ''), 3000);
    this.cdr.markForCheck();
  }

  // ── WORKING HOURS ─────────────────────────────────────────────────
  parseOpeningHours(raw?: string): { day: string; hours: string }[] {
    if (!raw) return [];
    try {
      const obj = JSON.parse(raw);
      const dayNames: Record<string, string> = {
        mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
        thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
      };
      return Object.entries(obj).map(([k, v]) => ({
        day:   dayNames[k.toLowerCase()] || k,
        hours: String(v)
      }));
    } catch {
      // Not JSON — return raw string as-is
      return [{ day: '', hours: raw }];
    }
  }

  get isCurrentlyOpen(): boolean {
    if (!this.location?.openingHours) return false;
    try {
      const obj = JSON.parse(this.location.openingHours);
      const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const todayKey = dayKeys[new Date().getDay()];
      const hours: string = obj[todayKey];
      if (!hours || hours === 'closed') return false;
      if (hours === '00:00-24:00' || hours === '0:00-24:00') return true;
      const [openStr, closeStr] = hours.split('-');
      const toMins = (t: string) => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m; };
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const openMins = toMins(openStr);
      const closeMins = toMins(closeStr);
      // Handle overnight hours (e.g. 22:00–06:00): closeMins < openMins
      if (closeMins <= openMins) {
        return nowMins >= openMins || nowMins < closeMins;
      }
      return nowMins >= openMins && nowMins < closeMins;
    } catch { return false; }
  }

  get isEvent(): boolean {
    return (this.location?.postType || '').toLowerCase() === 'event';
  }

  // ── REVIEWS ───────────────────────────────────────────────────────
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
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.reviewError = err?.error?.message || 'Error submitting review.';
        this.isSubmittingReview = false;
        this.cdr.markForCheck();
      }
    });
  }

  getStars(rating: number): string {
    const r = Math.min(5, Math.max(0, Math.round(rating)));
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  }

  goToLogin(): void { this.showAuthModal = true; }

  goBack(): void { window.history.back(); }

  getDirections(): void {
    const lat = this.location?.lat ?? (this.location as any)?.latitude;
    const lng = this.location?.lng ?? (this.location as any)?.longitude;
    if (lat != null && lng != null) {
      this.router.navigate(['/map-home'], {
        queryParams: {
          directTo: `${lat},${lng}`,
          destTitle: this.location?.title || ''
        }
      });
    }
  }

  shareLocation(): void {
    const url = window.location.href;
    const title = this.location?.title || 'Check this location on AdriGo';
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        this.saveMessage = '🔗 Link copied to clipboard!';
        setTimeout(() => (this.saveMessage = ''), 3000);
        this.cdr.markForCheck();
      }).catch(() => {
        // Last resort: prompt
        prompt('Copy this link:', url);
      });
    }
  }

  addToCalendar(): void {
    if (!this.location) return;

    if (!this.authService.isLoggedIn) {
      this.showAuthModal = true;
      return;
    }

    this.userService.addToCalendar(this.location.id).subscribe({
      next: (res) => {
        this.calendarMessage = res?.alreadyAdded
          ? '📅 Already in your calendar'
          : '📅 Added to your calendar!';
        setTimeout(() => { this.calendarMessage = ''; this.cdr.markForCheck(); }, 3500);
        this.cdr.markForCheck();
      },
      error: () => {
        this.calendarMessage = 'Could not add to calendar.';
        setTimeout(() => { this.calendarMessage = ''; this.cdr.markForCheck(); }, 3000);
        this.cdr.markForCheck();
      }
    });
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
  }
}
