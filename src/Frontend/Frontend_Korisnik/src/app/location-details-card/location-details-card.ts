import { Component, Input, Output, EventEmitter, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, CalendarMutationResult } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { resolveBackendAssetUrl } from '../utils/backend-url.utils';
import { formatPostType } from '../utils/post-type.utils';

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

  defaultImage = 'assets/Budva.jpg';
  calendarMessage = '';
  showAuthModal = false;

  showCalendarScheduler = false;
  selectedCalendarDateTime = '';
  calendarScheduleError = '';

  constructor(
    private router: Router,
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
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
    return formatPostType(this.locationData?.postType || this.locationData?.category);
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

  openCalendarScheduler(event: Event): void {
    event.stopPropagation();
    if (!this.locationData?.id) return;
    if (!this.authService.isLoggedIn) {
      this.showAuthModal = true;
      this.cdr.detectChanges();
      return;
    }

    this.selectedCalendarDateTime = this.calendarMinDateTime;
    this.calendarScheduleError = '';
    this.showCalendarScheduler = true;
    this.setBodyScrollLock(true);
  }

  closeCalendarScheduler(): void {
    this.showCalendarScheduler = false;
    this.calendarScheduleError = '';
    this.setBodyScrollLock(false);
  }

  openDateTimePicker(input: HTMLInputElement): void {
    const anyInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof anyInput.showPicker === 'function') {
      try { anyInput.showPicker(); return; } catch { /* fall through */ }
    }
    input.focus();
  }

  addToCalendar(): void {
    if (!this.locationData?.id) return;
    if (!this.selectedCalendarDateTime) {
      this.calendarScheduleError = 'Choose date and time.';
      return;
    }

    const selectedDate = new Date(this.selectedCalendarDateTime);
    if (isNaN(selectedDate.getTime())) {
      this.calendarScheduleError = 'Choose a valid date and time.';
      return;
    }
    if (selectedDate < new Date()) {
      this.calendarScheduleError = 'Choose a future date and time.';
      return;
    }

    this.userService.addLocationToCalendar({
      id: this.locationData.id,
      title: this.locationData.title || '',
      postType: this.locationData.postType || this.locationData.category || '',
      address: this.locationData.address || this.locationData.regionName || '',
      regionName: this.locationData.regionName,
      images: this.locationData.images,
      imageUrl: this.locationData.imageUrl,
    }, { scheduledAt: this.selectedCalendarDateTime }).subscribe({
      next: (res) => {
        this.calendarMessage = res.alreadyAdded
          ? '📅 Already in calendar'
          : (res.localOnly ? '📅 Saved locally!' : '📅 Added to calendar!');
        this.closeCalendarScheduler();
        this.cdr.detectChanges();
        setTimeout(() => { this.calendarMessage = ''; this.cdr.detectChanges(); }, 3000);
      },
      error: () => {
        this.calendarMessage = 'Could not add to calendar.';
        this.closeCalendarScheduler();
        this.cdr.detectChanges();
        setTimeout(() => { this.calendarMessage = ''; this.cdr.detectChanges(); }, 2500);
      }
    });
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

  get calendarMinDateTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  ngOnDestroy(): void {
    this.setBodyScrollLock(false);
  }

  private setBodyScrollLock(locked: boolean): void {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = locked ? 'hidden' : '';
    document.body.style.touchAction = locked ? 'none' : '';
  }
}
