import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common'; 

@Component({
  selector: 'app-location-details-card',
  standalone: true, 
  imports: [CommonModule], 
  templateUrl: './location-details-card.html', // (ako ti je fajl .component.html, dodaj to ovde)
  styleUrls: ['./location-details-card.css']
})
export class LocationDetailsCardComponent {   // <-- OVO IME SE SADA POKLAPA SA TVOJIM IMPORTOM
  @Input() locationData: any;
  @Output() onClose = new EventEmitter<void>();

  constructor() { }

  onCloseClick(): void {
    console.log('Kliknuto X unutar kartice');
    this.onClose.emit(); 
  }

  getStars(rating: number): string {
    return '⭐'.repeat(Math.round(rating));
  }
}