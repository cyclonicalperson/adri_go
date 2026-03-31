import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Review } from '@core/models/review.model';
import { ReviewCardComponent } from '@shared/components/review-card/review-card.component';

@Component({
  selector: 'app-recent-reviews',
  standalone: true,
  imports: [ReviewCardComponent, RouterLink],
  templateUrl: './recent-reviews.component.html',
  styleUrl: './recent-reviews.component.scss',
})

export class RecentReviewsComponent {
  @Input() reviews: Review[] = [];
}
