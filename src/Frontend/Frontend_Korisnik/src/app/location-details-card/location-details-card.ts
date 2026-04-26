import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-location-details-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-details-card.html',
  styleUrls: ['./location-details-card.css']
})
export class LocationDetailsCardComponent {
  @Input() locationData: any;
  @Output() onClose = new EventEmitter<void>();
  @Output() onViewDetails = new EventEmitter<void>();

  defaultImage = 'assets/plaza.jpg';
  calendarMessage = '';

  constructor(
    private router: Router,
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  readonly IMAGE_BASE_URL = 'http://localhost:5125/';

  get displayImage(): string {
    if (this.locationData?.imageUrl) return this.locationData.imageUrl;
    const images = this.locationData?.images;
    if (!images) return this.defaultImage;
    let firstImg = '';
    if (typeof images === 'string') {
      try { const p = JSON.parse(images); firstImg = p[0] || ''; } catch { firstImg = images; }
    } else if (Array.isArray(images) && images.length > 0) {
      firstImg = images[0];
    }
    if (!firstImg) return this.defaultImage;
    if (!firstImg.startsWith('http')) {
      const clean = firstImg.startsWith('/') ? firstImg.substring(1) : firstImg;
      return `${this.IMAGE_BASE_URL}${clean}`;
    }
    return firstImg;
  }

  get displayCategory(): string {
    return this.locationData?.postType || this.locationData?.category || 'General';
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

  addToCalendar(event: Event): void {
    event.stopPropagation();
    if (!this.locationData?.id) return;

    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    this.userService.addToCalendar(this.locationData.id).subscribe({
      next: (res) => {
        this.calendarMessage = res?.alreadyAdded ? '📅 Already in calendar' : '📅 Added to calendar!';
        this.cdr.detectChanges();
        setTimeout(() => { this.calendarMessage = ''; this.cdr.detectChanges(); }, 3000);
      },
      error: () => {
        this.calendarMessage = 'Could not add to calendar.';
        this.cdr.detectChanges();
        setTimeout(() => { this.calendarMessage = ''; this.cdr.detectChanges(); }, 2500);
      }
    });
  }

  get isEvent(): boolean {
    return (this.locationData?.postType || '').toLowerCase() === 'event';
  }
}