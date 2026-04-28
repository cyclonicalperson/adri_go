import { Component, OnInit } from '@angular/core';
import { ReviewService } from '@core/services/review.service';
import { BadgeService } from '@core/services/badge.service';
import { AuthService } from '@core/auth/auth.service';
import { CsvExportService } from '@core/services/csv-export.service';
import { Review, ReviewStatus, ReviewEntityType } from '@core/models/review.model';
import { PageRequest } from '@core/models/api-response.model';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';
import { DateLocalPipe } from '@shared/pipes/date-local.pipe';
import { ReviewModerationComponent } from '../review-moderation/review-moderation.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-reviews-list',
  templateUrl: './reviews-list.component.html',
  styleUrl: './reviews-list.component.scss',
  imports: [TruncatePipe, DateLocalPipe, ReviewModerationComponent, ConfirmDialogComponent],
})
export class ReviewsListComponent implements OnInit {
  reviews: Review[] = [];
  total = 0;
  totalAll = 0;  // ukupan broj svih recenzija, bez filtera
  totalPages = 1;
  loading = true;
  moderateTarget: Review | null = null;
  deleteTarget: Review | null = null;

  pendingCount = 0;
  approvedCount = 0;
  rejectedCount = 0;

  req: PageRequest & {
    status?: ReviewStatus;
    entityType?: ReviewEntityType;
    minRating?: number;
  } = { page: 1, pageSize: 10, sortBy: 'createdAt', sortDir: 'desc' };

  constructor(
    private service: ReviewService,
    private auth: AuthService,
    private badges: BadgeService,
    private csv: CsvExportService,
  ) { }

  get canDelete(): boolean { return this.auth.isSuperAdmin; }

  ngOnInit(): void { this.load(); this.loadCounts(); this.loadTotalAll(); }

  load(): void {
    this.loading = true;
    this.service.getAll(this.req).subscribe({
      next: res => {
        this.reviews = res.data;
        this.total = res.total;
        this.totalPages = res.totalPages;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  private loadTotalAll(): void {
    this.service.getAll({ page: 1, pageSize: 1 }).subscribe(r => { this.totalAll = r.total; });
  }

  private loadCounts(): void {
    this.service.getAll({ page: 1, pageSize: 1, status: 'PENDING' })
      .subscribe(r => { this.pendingCount = r.total; });
    this.service.getAll({ page: 1, pageSize: 1, status: 'APPROVED' })
      .subscribe(r => { this.approvedCount = r.total; });
    this.service.getAll({ page: 1, pageSize: 1, status: 'REJECTED' })
      .subscribe(r => { this.rejectedCount = r.total; });
  }

  onSearch(q: string): void {
    this.req = { ...this.req, search: q, page: 1 }; this.load();
  }

  onStatusChange(s: string): void {
    this.req = { ...this.req, status: (s as ReviewStatus) || undefined, page: 1 };
    this.load();
  }

  onEntityTypeChange(t: string): void {
    this.req = { ...this.req, entityType: (t as ReviewEntityType) || undefined, page: 1 };
    this.load();
  }

  onRatingChange(val: string): void {
    const minRating = val ? +val : undefined;
    this.req = { ...this.req, minRating, page: 1 };
    this.load();
  }

  onSortChange(val: string): void {
    const [sortBy, sortDir] = val.split(':') as [string, 'asc' | 'desc'];
    this.req = { ...this.req, sortBy, sortDir, page: 1 };
    this.load();
  }

  onPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.req = { ...this.req, page: p };
    this.load();
  }

  openModeration(r: Review): void { this.moderateTarget = r; }
  closeModeration(): void { this.moderateTarget = null; }

  /** Inline quick-approve — azurira status i reload-uje */
  updateStatus(r: Review, status: ReviewStatus): void {
    this.service.updateStatus(r.reviewId, { status }).subscribe({
      next: () => {
        setTimeout(() => {
          this.load();
          this.loadCounts();
          this.loadTotalAll();
        }, 150);
        this.badges.refresh();
      },
      error: () => { },
    });
  }

  /** Iz moderation panela — zatvori panel i reload */
  onStatusUpdated(payload: { review: Review; status: ReviewStatus }): void {
    this.service.updateStatus(payload.review.reviewId, { status: payload.status })
      .subscribe({
        next: () => {
          this.moderateTarget = null;
          setTimeout(() => {
            this.load();
            this.loadCounts();
            this.loadTotalAll();
          }, 150);
          this.badges.refresh();
        },
        error: () => { this.moderateTarget = null; },
      });
  }

  deleteReview(r: Review): void {
    if (!this.canDelete) return;
    this.deleteTarget = r;
  }

  cancelDelete(): void { this.deleteTarget = null; }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    const r = this.deleteTarget;
    this.deleteTarget = null;
    this.service.delete(r.reviewId).subscribe({
      next: () => {
        this.reviews = this.reviews.filter(x => x.reviewId !== r.reviewId);
        this.total = Math.max(0, this.total - 1);
        this.loadCounts();
        this.loadTotalAll();
        this.badges.refresh();
      },
      error: () => { },
    });
  }

  printReport(): void { window.print(); }

  exportCsv(): void {
    const today = new Date().toISOString().split('T')[0];
    this.csv.download(
      `recenzije_${today}.csv`,
      ['ID', 'Turista', 'Entitet', 'Tip', 'Ocena', 'Komentar', 'Status', 'Datum'],
      this.reviews.map(r => [
        r.reviewId,
        r.touristName ?? r.user?.fullName ?? 'Anoniman',
        r.entityName ?? '—',
        r.entityType ?? '—',
        r.rating,
        r.comment ?? '',
        r.status,
        r.createdAt,
      ]),
    );
  }

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

  entityTypeLabel(t?: ReviewEntityType | null): string {
    return { OBJECT: '🏢 Lokacija', EVENT: '🎟️ Dogadjaj', ROUTE: '🗺️ Ruta' }[t ?? ''] ?? '—';
  }

  entityTypeBadge(t?: ReviewEntityType | null): string {
    return { OBJECT: 'badge-green', EVENT: 'badge-blue', ROUTE: 'badge-purple' }[t ?? ''] ?? 'badge-gray';
  }

  starString(rating: number): string {
    const f = Math.round(rating);
    return '★'.repeat(f) + '☆'.repeat(5 - f);
  }

  initials(name?: string | null): string {
    return (name ?? '?').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  }
}
