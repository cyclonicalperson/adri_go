import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MyReviewItem, UserService } from '../services/user.service';

@Component({
  selector: 'app-my-reviews',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-reviews.component.html',
  styleUrls: ['./my-reviews.component.css']
})
export class MyReviewsComponent implements OnInit {
  isLoading = true;
  reviews: MyReviewItem[] = [];

  constructor(
    private router: Router,
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadReviews();
  }

  loadReviews(): void {
    this.isLoading = true;
    this.userService.getMyReviews().subscribe({
      next: (reviews) => {
        this.reviews = reviews;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        if (err?.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        this.cdr.detectChanges();
      }
    });
  }

  goBack(): void {
    window.history.back();
  }

  canOpenReview(review: MyReviewItem): boolean {
    return typeof review.postId === 'number' && review.postId > 0;
  }

  openReviewTarget(review: MyReviewItem): void {
    if (!this.canOpenReview(review)) {
      return;
    }

    this.router.navigate(['/location-details', review.postId]);
  }

  formatStatus(status?: string | null): string {
    return (status || 'UNKNOWN').toUpperCase();
  }
}
