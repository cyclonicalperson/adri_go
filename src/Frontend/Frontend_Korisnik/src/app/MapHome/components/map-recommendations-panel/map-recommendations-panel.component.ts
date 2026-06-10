import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Location } from '../../../services/location.service';
import { DEFAULT_LOCATION_IMAGE } from '../../../utils/backend-url.utils';
import { LocationRecommendation } from '../../../services/recommendation.service';
import { formatPostType } from '../../../utils/post-type.utils';
import { SiteTranslateService } from '../../../services/site-translate.service';

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
  @Input() resolveImage: (location: Location) => string = () => DEFAULT_LOCATION_IMAGE;

  @Output() tabSelected = new EventEmitter<RecommendationTab>();
  @Output() locationSelected = new EventEmitter<Location>();

  constructor(private siteTranslate: SiteTranslateService) {}

  formatPostType(type?: string | null): string {
    return this.siteTranslate.instant(formatPostType(type));
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = DEFAULT_LOCATION_IMAGE;
    img.onerror = null;
  }

  trackByRecommendation(index: number, recommendation: LocationRecommendation): number {
    return recommendation.location.id || index;
  }
}
