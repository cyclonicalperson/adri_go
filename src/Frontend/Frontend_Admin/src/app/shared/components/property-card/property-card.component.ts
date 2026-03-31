import { Component, Input, Output, EventEmitter } from '@angular/core';
import { StarRatingComponent } from '../star-rating/star-rating.component';
import { BadgeComponent } from '../badge/badge.component';
import { TruncatePipe } from '../../pipes/truncate.pipe';
import { TouristObject } from '@core/models/object.model';

@Component({
  selector: 'app-property-card',
  standalone: true,
  imports: [StarRatingComponent, BadgeComponent, TruncatePipe],
  templateUrl: './property-card.component.html',
  styleUrl: './property-card.component.scss',
})
export class PropertyCardComponent {
  @Input({ required: true }) object!: TouristObject;
  @Input() showActions = false;
  @Output() cardClicked = new EventEmitter<TouristObject>();
  @Output() editClicked = new EventEmitter<TouristObject>();
  @Output() deleteClicked = new EventEmitter<TouristObject>();

  get thumbnail(): string {
    return this.object.media?.[0]?.url ?? 'assets/images/placeholder.png';
  }

  get categoryLabel(): string {
    const map: Record<string, string> = {
      HOTEL: 'Hotel',
      APARTMENT: 'Apartman',
      RESTAURANT: 'Restoran',
      CAFE: 'Kafić',
      CLUB: 'Klub',
      SHOP: 'Prodavnica',
      CULTURAL: 'Kulturni objekat',
      MONUMENT: 'Spomenik',
      SPORT: 'Sportski objekat',
      NATURE: 'Priroda',
      OTHER: 'Ostalo',
    };
    return map[this.object.category] ?? this.object.category;
  }
}
