import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Review, ReviewStatus } from '@core/models/review.model';
import { ReviewCardComponent } from '@shared/components/review-card/review-card.component';
import { BadgeComponent } from '@shared/components/badge/badge.component';

@Component({
  selector: 'app-review-moderation',
  standalone: true,
  imports: [ReviewCardComponent, BadgeComponent],
  templateUrl: './review-moderation.component.html',
  styleUrl: './review-moderation.component.scss',
})

export class ReviewModerationComponent {
  @Input({ required: true }) review!: Review;
  @Output() statusUpdated = new EventEmitter<{ review: Review; status: ReviewStatus }>();
  @Output() closed = new EventEmitter<void>();

  entityTypeLabel(type?: string): string {
    const map: Record<string, string> = {
      OBJECT: 'Lokacija',
      EVENT: 'Dogadjaj',
      ROUTE: 'Ruta',
    };
    return type ? (map[type] ?? type) : '';
  }

  approve(): void {
    this.statusUpdated.emit({ review: this.review, status: 'APPROVED' });
  }

  reject(): void {
    this.statusUpdated.emit({ review: this.review, status: 'REJECTED' });
  }

  pending(): void {
    this.statusUpdated.emit({ review: this.review, status: 'PENDING' });
  }
}
