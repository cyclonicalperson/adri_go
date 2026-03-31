import { Routes } from '@angular/router';
import { ReviewsListComponent } from './components/review-list/reviews-list.component';

export const REVIEWS_ROUTES: Routes = [
  {
    path: '',
    component: ReviewsListComponent,
  },
];
