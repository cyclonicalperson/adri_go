import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Location } from '../../../services/location.service';
import { LocationRecommendation } from '../../../services/recommendation.service';

export type RecommendationTab = 'personalized' | 'global';

@Component({
  selector: 'app-map-recommendations-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-recommendations-panel.component.html',
  styleUrls: ['./map-recommendations-panel.component.css'],
})
export class MapRecommendationsPanelComponent {
  @Input() recommendationCards: LocationRecommendation[] = [];
  @Input() hasPersonalizedRecommendations = false;
  @Input() activeRecommendationTab: RecommendationTab = 'personalized';
  @Input() resolveImage: (location: Location) => string = () => 'assets/placeholder.jpg';

  @Output() tabSelected = new EventEmitter<RecommendationTab>();
  @Output() locationSelected = new EventEmitter<Location>();

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='52' height='52' viewBox='0 0 52 52'%3E%3Crect width='52' height='52' fill='%23f1f5f9'/%3E%3Cpath d='M20 34l6-8 4 5 3-4 5 7H14z' fill='%23cbd5e1'/%3E%3Ccircle cx='33' cy='20' r='3' fill='%23cbd5e1'/%3E%3C/svg%3E`;
    img.onerror = null;
  }

  trackByRecommendation(index: number, recommendation: LocationRecommendation): number {
    return recommendation.location.id || index;
  }
}
