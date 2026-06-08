import { Component, Input, Output, EventEmitter, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, PendingSchedule } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { DEFAULT_LOCATION_IMAGE, resolveBackendAssetUrl } from '../utils/backend-url.utils';
import { formatPostType } from '../utils/post-type.utils';
import { SiteTranslateService } from '../services/site-translate.service';

@Component({
  selector: 'app-location-details-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-details-card.html',
  styleUrls: ['./location-details-card.css']
})
export class LocationDetailsCardComponent implements OnDestroy {
  @Input() locationData: any;
  @Output() onClose = new EventEmitter<void>();
  @Output() onViewDetails = new EventEmitter<void>();
  @Output() onAddToRoute = new EventEmitter<void>();

  defaultImage = DEFAULT_LOCATION_IMAGE;
  calendarMessage = '';
  showAuthModal = false;

  constructor(
    private router: Router,
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private siteTranslate: SiteTranslateService
  ) {}
  get displayImage(): string {
    if (this.locationData?.imageUrl) {
      return resolveBackendAssetUrl(this.locationData.imageUrl, this.defaultImage);
    }
    const images = this.locationData?.images;
    if (!images) return this.defaultImage;
    let firstImg = '';
    if (typeof images === 'string') {
      try { const p = JSON.parse(images); firstImg = p[0] || ''; } catch { firstImg = images; }
    } else if (Array.isArray(images) && images.length > 0) {
      firstImg = images[0];
    }
    return resolveBackendAssetUrl(firstImg, this.defaultImage);
  }

  get displayCategory(): string {
    return this.siteTranslate.instant(formatPostType(this.locationData?.postType || this.locationData?.category));
  }

  get displayRating(): number | null {
    return this.locationData?.avgRating ?? this.locationData?.rating ?? null;
  }

  get displayReviews(): number | null {
    return this.locationData?.reviewCount ?? this.locationData?.reviews ?? null;
  }

  onCloseClick(event: Event): void {
    event.stopPropagation();
    this.onClose.emit();
  }

  onViewDetailsClick(event: Event): void {
    event.stopPropagation();
    if (this.locationData?.id) {
      this.router.navigate(['/location-details', this.locationData.id]);
    } else {
      this.router.navigate(['/location-details', 1]);
    }
    this.onViewDetails.emit();
  }

  onAddToRouteClick(event: Event): void {
    event.stopPropagation();
    this.onAddToRoute.emit();
  }

  /**
   * Starts the calendar-scheduling flow: navigates to the Calendar page where
   * the user picks the day/time. Events carry their date window.
   */
  openCalendarScheduler(event: Event): void {
    event.stopPropagation();
    if (!this.locationData?.id) return;
    if (!this.authService.isLoggedIn) {
      this.showAuthModal = true;
      this.cdr.detectChanges();
      return;
    }

    const range = this.getEventRange();
    const pending: PendingSchedule = {
      kind: 'post',
      postId: this.locationData.id,
      title: this.locationData.title || '',
      postType: this.locationData.postType || this.locationData.category || '',
      isEvent: this.isEvent,
      eventStart: this.isEvent ? (range?.start ?? null) : null,
      eventEnd:   this.isEvent ? (range?.end ?? null) : null,
      address:    this.locationData.address || this.locationData.regionName || '',
      imageUrl:   this.locationData.imageUrl ?? null,
    };

    this.router.navigate(['/calendar'], { state: { pendingSchedule: pending } });
  }

  /** Parses the event start/end window from the post details JSON, if present. */
  private getEventRange(): { start: string | null; end: string | null } | null {
    const raw = this.locationData?.details;
    if (!raw) return null;
    try {
      const details = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const start = details?.startAt ? new Date(details.startAt) : null;
      const end   = details?.endAt ? new Date(details.endAt) : null;
      return {
        start: start && !isNaN(start.getTime()) ? start.toISOString() : null,
        end:   end && !isNaN(end.getTime()) ? end.toISOString() : null,
      };
    } catch {
      return null;
    }
  }

  get isEvent(): boolean {
    return (this.locationData?.postType || '').toLowerCase() === 'event';
  }

  closeAuthModal(event?: Event): void {
    event?.stopPropagation();
    this.showAuthModal = false;
    this.cdr.detectChanges();
  }

  goToLogin(event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
  }
}
