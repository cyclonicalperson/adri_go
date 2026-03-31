import { Component, OnInit } from '@angular/core';
import { ReviewService } from '@core/services/review.service';
import { Review, ReviewStatus, ReviewEntityType } from '@core/models/review.model';
import { PageRequest } from '@core/models/api-response.model';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';
import { DateLocalPipe } from '@shared/pipes/date-local.pipe';
import { ReviewModerationComponent } from '../review-moderation/review-moderation.component';

@Component({
  selector: 'app-reviews-list',
  templateUrl: './reviews-list.component.html',
  styleUrl: './reviews-list.component.scss',
  imports: [TruncatePipe, DateLocalPipe, ReviewModerationComponent],
})
export class ReviewsListComponent implements OnInit {
  reviews: Review[] = [];
  total = 0;
  totalPages = 1;
  loading = true;
  moderateTarget: Review | null = null;

  pendingCount = 0;
  rejectedCount = 0;

  req: PageRequest & { status?: string; entityType?: string } = {
    page: 1, pageSize: 10, sortBy: 'createdAt', sortDir: 'desc',
  };

  constructor(private service: ReviewService) { }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.service.getAll(this.req).subscribe({
      next: res => {
        this.reviews = res.data;
        this.total = res.total;
        this.totalPages = res.totalPages;
        this.pendingCount = res.data.filter(r => r.status === 'PENDING').length;
        this.rejectedCount = res.data.filter(r => r.status === 'REJECTED').length;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onSearch(q: string): void { this.req = { ...this.req, search: q, page: 1 }; this.load(); }
  onStatusChange(s: string): void { this.req = { ...this.req, status: s || undefined, page: 1 }; this.load(); }
  onEntityTypeChange(t: string): void { this.req = { ...this.req, entityType: t || undefined, page: 1 }; this.load(); }
  onSortChange(val: string): void {
    const [sortBy, sortDir] = val.split(':') as [string, 'asc' | 'desc'];
    this.req = { ...this.req, sortBy, sortDir, page: 1 };
    this.load();
  }
  onPage(p: number): void { if (p >= 1 && p <= this.totalPages) { this.req = { ...this.req, page: p }; this.load(); } }

  openModeration(r: Review): void { this.moderateTarget = r; }
  closeModeration(): void { this.moderateTarget = null; }

  updateStatus(r: Review, status: ReviewStatus): void {
    this.service.updateStatus(r.reviewId, { status }).subscribe(() => this.load());
  }

  onStatusUpdated(payload: { review: Review; status: ReviewStatus }): void {
    this.updateStatus(payload.review, payload.status);
    this.moderateTarget = null;
  }

  deleteReview(r: Review): void {
    this.service.delete(r.reviewId).subscribe(() => this.load());
  }

  printReport(): void { window.print(); }
  exportCsv(): void { /* TODO */ }

  get pageStart(): number { return (this.req.page - 1) * this.req.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.req.page * this.req.pageSize, this.total); }
  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = Math.max(1, this.req.page - 2); i <= Math.min(this.totalPages, this.req.page + 2); i++) pages.push(i);
    return pages;
  }

  statusBadgeClass(s: ReviewStatus): string {
    return { PENDING: 'badge-amber', APPROVED: 'badge-green', REJECTED: 'badge-red' }[s] ?? 'badge-gray';
  }

  statusLabel(s: ReviewStatus): string {
    return { PENDING: '⏳ Na čekanju', APPROVED: '✅ Odobrena', REJECTED: '❌ Odbijena' }[s] ?? s;
  }

  entityTypeLabel(t?: ReviewEntityType): string {
    return { OBJECT: '🏢 Lokacija', EVENT: '🎟 Dogadjaj', ROUTE: '🗺 Ruta' }[t ?? ''] ?? '—';
  }

  starString(rating: number): string {
    const f = Math.round(rating);
    return '★'.repeat(f) + '☆'.repeat(5 - f);
  }

  initials(name?: string): string {
    return (name ?? '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }
}
