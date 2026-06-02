import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Location, LocationService } from '../services/location.service';
import { TouristRouteItem, TouristRoutesService } from '../services/tourist-routes.service';
import { MyReviewItem, UserService } from '../services/user.service';
import { MobileTouristNavComponent } from '../shared/mobile-tourist-nav.component';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';
import { formatPostType } from '../utils/post-type.utils';
import { SiteTranslateService } from '../services/site-translate.service';

type ReviewTab = 'all' | 'place' | 'route' | 'activity';
type ReviewSort = 'newest' | 'oldest' | 'rating-desc' | 'rating-asc';
type ReviewCategory = Exclude<ReviewTab, 'all'>;
type ReviewCommentFilter = 'all' | 'with-comment';

interface DisplayReview extends MyReviewItem {
  category: ReviewCategory;
  typeLabel: string;
  thumbnailUrl: string;
  summaryText: string;
  canOpen: boolean;
  filterCategoryId: string;
  hasComment: boolean;
}

interface RatingBreakdownItem {
  stars: number;
  count: number;
  widthPercent: number;
}

interface MonthlyReviewPoint {
  label: string;
  value: number;
  x: number;
  y: number;
}

interface ReviewFilterCategoryOption {
  id: string;
  label: string;
  color: string;
  icon: string;
}

interface ReviewMiniFilterState {
  activeCategories: string[];
  minRating: number;
  commentMode: ReviewCommentFilter;
}

const FALLBACK_IMAGES: Record<ReviewCategory, string> = {
  place: 'assets/Kotor.jpg',
  route: 'assets/Durmitor.jpg',
  activity: 'assets/plaza.jpg',
};

const REVIEW_FILTER_CATEGORIES: ReviewFilterCategoryOption[] = [
  { id: 'attraction', label: 'Attractions', color: '#10b981', icon: '🏖️' },
  { id: 'restaurant', label: 'Restaurants', color: '#ef4444', icon: '🍴' },
  { id: 'cultural_site', label: 'Culture', color: '#f59e0b', icon: '🏛️' },
  { id: 'monument', label: 'Monuments', color: '#d97706', icon: '🗿' },
  { id: 'club', label: 'Nightlife', color: '#8b5cf6', icon: '🎉' },
  { id: 'sports_facility', label: 'Activities', color: '#22c55e', icon: '🎡' },
  { id: 'event', label: 'Events', color: '#ec4899', icon: '📅' },
  { id: 'accommodation', label: 'Accommodation', color: '#3b82f6', icon: '🏨' },
  { id: 'shop', label: 'Shopping', color: '#f97316', icon: '🛍️' },
];

function createDefaultReviewFilters(): ReviewMiniFilterState {
  return {
    activeCategories: [],
    minRating: 0,
    commentMode: 'all',
  };
}

@Component({
  selector: 'app-my-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileTouristNavComponent, AppHeaderComponent],
  templateUrl: './my-reviews.component.html',
  styleUrls: ['./my-reviews.component.css']
})
export class MyReviewsComponent implements OnInit {
  isLoading = true;
  reviews: DisplayReview[] = [];
  searchQuery = '';
  activeTab: ReviewTab = 'all';
  sortOption: ReviewSort = 'newest';
  sortMenuOpen = false;
  reviewFiltersOpen = false;
  appliedFilters: ReviewMiniFilterState = createDefaultReviewFilters();
  draftFilters: ReviewMiniFilterState = createDefaultReviewFilters();

  readonly sortOptions: { value: ReviewSort; label: string }[] = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'rating-desc', label: 'Highest rating' },
    { value: 'rating-asc', label: 'Lowest rating' },
  ];

  readonly tabs: { value: ReviewTab; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'place', label: 'Places' },
    { value: 'route', label: 'Routes' },
    { value: 'activity', label: 'Activities' },
  ];

  readonly reviewFilterCategories = REVIEW_FILTER_CATEGORIES;
  readonly commentOptions: { value: ReviewCommentFilter; label: string }[] = [
    { value: 'all', label: 'All reviews' },
    { value: 'with-comment', label: 'With comment only' },
  ];

  constructor(
    private router: Router,
    private userService: UserService,
    private authService: AuthService,
    private locationService: LocationService,
    private routesService: TouristRoutesService,
    private cdr: ChangeDetectorRef,
    private siteTranslate: SiteTranslateService,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadReviews();
  }

  @HostListener('document:click')
  closeMenus(): void {
    if (!this.sortMenuOpen) return;
    this.sortMenuOpen = false;
    this.cdr.markForCheck();
  }

  get visibleReviews(): DisplayReview[] {
    const q = this.searchQuery.trim().toLowerCase();
    const filtered = this.getReviewsMatchingSearchAndFilters(q).filter(review =>
      this.activeTab === 'all' || review.category === this.activeTab,
    );

    return this.sortReviews(filtered);
  }

  get averageRating(): number {
    if (this.reviews.length === 0) return 0;
    const total = this.reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
    return total / this.reviews.length;
  }

  get ratingBreakdown(): RatingBreakdownItem[] {
    const total = this.reviews.length || 1;
    return [5, 4, 3, 2, 1].map(stars => {
      const count = this.reviews.filter(review => Math.round(review.rating) === stars).length;
      return {
        stars,
        count,
        widthPercent: total > 0 ? (count / total) * 100 : 0,
      };
    });
  }

  get monthlyReviewPoints(): MonthlyReviewPoint[] {
    const months = this.buildMonthBuckets();
    const maxValue = Math.max(...months.map(item => item.value), 1);
    const width = 320;
    const height = 150;
    const paddingX = 10;
    const paddingTop = 16;
    const paddingBottom = 18;
    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingTop - paddingBottom;

    return months.map((month, index) => {
      const x = months.length === 1
        ? width / 2
        : paddingX + (usableWidth * index) / (months.length - 1);
      const y = paddingTop + usableHeight - (month.value / maxValue) * usableHeight;
      return {
        label: month.label,
        value: month.value,
        x,
        y,
      };
    });
  }

  get chartPolylinePoints(): string {
    return this.monthlyReviewPoints.map(point => `${point.x},${point.y}`).join(' ');
  }

  get chartAreaPoints(): string {
    const points = this.monthlyReviewPoints;
    if (points.length === 0) return '';
    const first = points[0];
    const last = points[points.length - 1];
    return `0,150 ${first.x},${first.y} ${this.chartPolylinePoints} ${last.x},150`;
  }

  get tabCounts(): Record<ReviewTab, number> {
    const filteredReviews = this.getReviewsMatchingSearchAndFilters(this.searchQuery.trim().toLowerCase());

    return {
      all: filteredReviews.length,
      place: filteredReviews.filter(review => review.category === 'place').length,
      route: filteredReviews.filter(review => review.category === 'route').length,
      activity: filteredReviews.filter(review => review.category === 'activity').length,
    };
  }

  get hasActiveReviewFilters(): boolean {
    return this.appliedFilters.activeCategories.length > 0
      || this.appliedFilters.minRating > 0
      || this.appliedFilters.commentMode !== 'all';
  }

  loadReviews(): void {
    this.isLoading = true;

    this.userService.getMyReviews().subscribe({
      next: reviews => {
        if (reviews.length === 0) {
          this.reviews = [];
          this.isLoading = false;
          this.cdr.detectChanges();
          return;
        }

        const uniquePostIds = [...new Set(
          reviews
            .map(review => review.postId)
            .filter((id): id is number => typeof id === 'number' && id > 0),
        )];
        const needsRoutes = reviews.some(review => typeof review.routeId === 'number' && review.routeId > 0);

        const postRequests: Record<string, any> = {};
        uniquePostIds.forEach(postId => {
          postRequests[postId] = this.locationService.getLocationById(postId).pipe(
            catchError(() => of(null)),
          );
        });

        forkJoin({
          postsById: uniquePostIds.length > 0 ? forkJoin(postRequests) : of({}),
          routes: needsRoutes
            ? this.routesService.getRoutes().pipe(catchError(() => of([] as TouristRouteItem[])))
            : of([] as TouristRouteItem[]),
        }).subscribe({
          next: ({ postsById, routes }) => {
            this.reviews = this.buildDisplayReviews(
              reviews,
              postsById as Record<string, Location | null>,
              routes,
            );
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.handleLoadError(err);
          },
        });
      },
      error: (err) => {
        this.handleLoadError(err);
      }
    });
  }

  setTab(tab: ReviewTab): void {
    this.activeTab = tab;
  }

  onReviewSearchChanged(query: string): void {
    this.searchQuery = query;
    this.cdr.markForCheck();
  }

  setSortOption(option: ReviewSort, event?: Event): void {
    event?.stopPropagation();
    this.sortOption = option;
    this.sortMenuOpen = false;
  }

  toggleSortMenu(event: Event): void {
    event.stopPropagation();
    this.sortMenuOpen = !this.sortMenuOpen;
    this.reviewFiltersOpen = false;
  }

  openReviewFilters(event: Event): void {
    event.stopPropagation();
    this.sortMenuOpen = false;
    this.draftFilters = this.cloneReviewFilters(this.appliedFilters);
    this.reviewFiltersOpen = true;
  }

  closeReviewFilters(): void {
    this.reviewFiltersOpen = false;
  }

  clearReviewFilters(): void {
    this.draftFilters = createDefaultReviewFilters();
  }

  applyReviewFilters(): void {
    this.appliedFilters = this.cloneReviewFilters(this.draftFilters);
    this.reviewFiltersOpen = false;
  }

  toggleReviewCategory(categoryId: string): void {
    const nextCategories = this.draftFilters.activeCategories.includes(categoryId)
      ? this.draftFilters.activeCategories.filter(id => id !== categoryId)
      : [...this.draftFilters.activeCategories, categoryId];

    this.draftFilters = {
      ...this.draftFilters,
      activeCategories: nextCategories,
    };
  }

  setDraftMinRating(rating: number): void {
    this.draftFilters = {
      ...this.draftFilters,
      minRating: this.draftFilters.minRating === rating ? 0 : rating,
    };
  }

  setDraftCommentMode(mode: ReviewCommentFilter): void {
    this.draftFilters = {
      ...this.draftFilters,
      commentMode: mode,
    };
  }

  goBack(): void {
    window.history.back();
  }

  goToNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  canOpenReview(review: DisplayReview): boolean {
    return review.canOpen;
  }

  openReviewTarget(review: DisplayReview): void {
    if (!review.canOpen || !review.postId) return;
    this.router.navigate(['/location-details', review.postId]);
  }

  getSelectedSortLabel(): string {
    return this.translateLabel(this.sortOptions.find(option => option.value === this.sortOption)?.label ?? 'Newest first');
  }

  translateLabel(value: string | null | undefined): string {
    return this.siteTranslate.instant(value ?? '');
  }

  isDraftCategorySelected(categoryId: string): boolean {
    return this.draftFilters.activeCategories.includes(categoryId);
  }

  formatStatus(status?: string | null): string {
    const normalized = this.normalizeStatus(status);
    if (normalized === 'approved') return 'Approved';
    if (normalized === 'pending') return 'Pending';
    if (normalized === 'rejected') return 'Rejected';
    return 'Unknown';
  }

  formatStatusTone(status?: string | null): string {
    const normalized = this.normalizeStatus(status);
    if (normalized === 'approved') return 'approved';
    if (normalized === 'pending') return 'pending';
    if (normalized === 'rejected') return 'rejected';
    return 'neutral';
  }

  getCategoryIcon(review: DisplayReview): string {
    if (review.category === 'route') {
      return 'route';
    }

    if (review.category === 'activity') {
      return 'activity';
    }

    return 'place';
  }

  onThumbnailError(event: Event, category: ReviewCategory): void {
    const target = event.target as HTMLImageElement | null;
    if (!target) return;
    target.src = FALLBACK_IMAGES[category];
  }

  private buildDisplayReviews(
    reviews: MyReviewItem[],
    postsById: Record<string, Location | null>,
    routes: TouristRouteItem[],
  ): DisplayReview[] {
    const routesById = new Map<number, TouristRouteItem>(routes.map(route => [route.id, route]));

    return reviews.map(review => {
      const post = review.postId ? postsById[String(review.postId)] : null;
      const route = review.routeId ? routesById.get(review.routeId) ?? null : null;
      const category = this.resolveCategory(review, post);
      const typeLabel = this.resolveTypeLabel(category, post);
      const comment = (review.comment || '').trim();

      return {
        ...review,
        entityTitle: review.entityTitle || post?.title || route?.name || 'Untitled review target',
        category,
        typeLabel,
        thumbnailUrl: this.resolveThumbnail(category, post),
        summaryText: comment || 'No comment left.',
        canOpen: category !== 'route' && typeof review.postId === 'number' && review.postId > 0,
        filterCategoryId: this.resolveFilterCategoryId(review, post),
        hasComment: comment.length > 0,
      };
    });
  }

  private resolveCategory(review: MyReviewItem, post: Location | null): ReviewCategory {
    if (typeof review.routeId === 'number' && review.routeId > 0) {
      return 'route';
    }

    const normalizedType = (post?.postType || '').toLowerCase().replace(/\s+/g, '_');
    if (normalizedType === 'activity' || normalizedType === 'sports_facility') {
      return 'activity';
    }

    return 'place';
  }

  private resolveTypeLabel(category: ReviewCategory, post: Location | null): string {
    if (category === 'route') return this.translateLabel('Route');
    if (category === 'activity') return this.translateLabel('Activity');
    return this.translateLabel(formatPostType(post?.postType, 'Place'));
  }

  private resolveFilterCategoryId(review: MyReviewItem, post: Location | null): string {
    if (typeof review.routeId === 'number' && review.routeId > 0) {
      return 'route';
    }

    const normalizedType = (post?.postType || post?.category || '').toLowerCase().replace(/\s+/g, '_');
    if (normalizedType === 'activity') return 'sports_facility';
    return normalizedType;
  }

  private resolveThumbnail(category: ReviewCategory, post: Location | null): string {
    const firstImage = this.getFirstImage(post);
    return firstImage || FALLBACK_IMAGES[category];
  }

  private getFirstImage(post: Partial<Location> | null): string {
    if (!post?.images) return '';

    if (Array.isArray(post.images)) {
      return post.images[0] || '';
    }

    try {
      const parsed = JSON.parse(post.images);
      return Array.isArray(parsed) ? parsed[0] || '' : post.images;
    } catch {
      return post.images;
    }
  }

  private sortReviews(reviews: DisplayReview[]): DisplayReview[] {
    const sorted = [...reviews];

    switch (this.sortOption) {
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'rating-desc':
        return sorted.sort((a, b) => b.rating - a.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'rating-asc':
        return sorted.sort((a, b) => a.rating - b.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      default:
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  private buildMonthBuckets(): { label: string; value: number }[] {
    const months: { label: string; value: number; year: number; month: number }[] = [];
    const baseDate = new Date();

    for (let offset = 5; offset >= 0; offset -= 1) {
      const point = new Date(baseDate.getFullYear(), baseDate.getMonth() - offset, 1);
      months.push({
        label: point.toLocaleDateString('en-US', { month: 'short' }),
        value: 0,
        year: point.getFullYear(),
        month: point.getMonth(),
      });
    }

    this.reviews.forEach(review => {
      const created = new Date(review.createdAt);
      const bucket = months.find(item => item.year === created.getFullYear() && item.month === created.getMonth());
      if (bucket) {
        bucket.value += 1;
      }
    });

    return months.map(({ label, value }) => ({ label, value }));
  }

  private getReviewsMatchingSearchAndFilters(query: string): DisplayReview[] {
    return this.reviews.filter(review => {
      if (this.appliedFilters.activeCategories.length > 0 && !this.appliedFilters.activeCategories.includes(review.filterCategoryId)) {
        return false;
      }

      if (this.appliedFilters.minRating > 0 && Number(review.rating || 0) < this.appliedFilters.minRating) {
        return false;
      }

      if (this.appliedFilters.commentMode === 'with-comment' && !review.hasComment) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        review.entityTitle,
        review.typeLabel,
        review.category,
        review.status,
        review.summaryText,
        review.comment,
      ]
        .filter(Boolean)
        .map(value => String(value).toLowerCase())
        .join(' ');

      return searchable.includes(query);
    });
  }

  private cloneReviewFilters(filters: ReviewMiniFilterState): ReviewMiniFilterState {
    return {
      activeCategories: [...filters.activeCategories],
      minRating: filters.minRating,
      commentMode: filters.commentMode,
    };
  }

  private normalizeStatus(status?: string | null): 'approved' | 'pending' | 'rejected' | 'unknown' {
    const normalized = (status || '').trim().toLowerCase();
    if (normalized === 'approved' || normalized === 'pending' || normalized === 'rejected') {
      return normalized;
    }
    if (!normalized) return 'unknown';
    return 'unknown';
  }

  private handleLoadError(err: any): void {
    this.isLoading = false;
    if (err?.status === 401) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
    this.cdr.detectChanges();
  }
}
