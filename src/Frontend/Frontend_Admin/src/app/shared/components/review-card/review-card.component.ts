import { Component, Input } from '@angular/core';
import { DateLocalPipe } from '../../pipes/date-local.pipe';
import { StarRatingComponent } from '../star-rating/star-rating.component';
import { BadgeComponent, BadgeVariant } from '../badge/badge.component';
import { Review } from '@core/models/review.model';

@Component({
  selector: 'app-review-card',
  standalone: true,
  imports: [DateLocalPipe, StarRatingComponent, BadgeComponent],
  templateUrl: './review-card.component.html',
  styleUrl: './review-card.component.scss',
})
export class ReviewCardComponent {
  @Input({ required: true }) review!: Review;
  @Input() showStatus = false;

  get initials(): string {
    const name = this.review.user?.fullName ?? '?';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  get statusVariant(): BadgeVariant {
    const map: Record<string, BadgeVariant> = {
      APPROVED: 'success',
      PENDING: 'warning',
      REJECTED: 'danger',
    };
    return map[this.review.status] ?? 'default';
  }

  get statusLabel(): string {
    const map: Record<string, string> = {
      APPROVED: 'Odobrena',
      PENDING: 'Na čekanju',
      REJECTED: 'Odbijena',
    };
    return map[this.review.status] ?? this.review.status;
  }
}
