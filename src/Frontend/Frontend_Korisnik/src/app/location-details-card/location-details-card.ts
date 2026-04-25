import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { Router } from '@angular/router'; // 1. Uvezi Router

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

  // 2. Dodaj Router u konstruktor
  constructor(private router: Router) {}

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
    
    // 3. Odradi prelazak na sledeću komponentu direktno odavde!
    if (this.locationData && this.locationData.id) {
      this.router.navigate(['/location-details', this.locationData.id]);
    } else {
      // Ako u mock podacima nisi stavio ID, možemo ga proslediti "na silu" čisto da radi
      this.router.navigate(['/location-details', 1]);
    }
    
    this.onViewDetails.emit(); // Opciono: javi mapi da je kliknuto ako joj treba ta info
  }
}