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

  get displayImage(): string {
    return this.locationData?.imageUrl ? this.locationData.imageUrl : this.defaultImage;
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