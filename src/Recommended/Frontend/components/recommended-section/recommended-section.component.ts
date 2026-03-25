import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { CrossCategoryRecommendation } from '../../models/recommendation.model';
import { RecommendationService } from '../../services/recommendation.service';

@Component({
  selector: 'app-recommended-section',
  templateUrl: './recommended-section.component.html',
  styleUrls: ['./recommended-section.component.css']
})
export class RecommendedSectionComponent implements OnChanges {
  @Input() sourceCategory!: string;
  @Input() destinationId!: number;

  recommendations: CrossCategoryRecommendation[] = [];
  isLoading = false;

  constructor(
    private recommendationService: RecommendationService,
    private router: Router
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (this.sourceCategory && this.destinationId > 0) {
      this.loadRecommendations();
    }
  }

  loadRecommendations(): void {
    this.isLoading = true;

    this.recommendationService
      .getCrossCategoryRecommendations(this.sourceCategory, this.destinationId)
      .subscribe({
        next: (data) => {
          this.recommendations = data;
          this.isLoading = false;
        },
        error: () => {
          this.recommendations = [];
          this.isLoading = false;
        }
      });
  }

  openRecommendation(item: CrossCategoryRecommendation): void {
    this.router.navigateByUrl(item.navigationUrl);
  }
}