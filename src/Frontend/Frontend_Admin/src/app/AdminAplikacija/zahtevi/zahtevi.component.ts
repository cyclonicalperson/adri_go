import { Component, OnInit } from '@angular/core';
import { UserService } from '@core/services/user.service';
import { RegistrationRequest } from '@core/models/user.model';
import { DateLocalPipe } from '@shared/pipes/date-local.pipe';
import { FormsModule } from '@angular/forms';

type FilterStatus = '' | 'pending' | 'approved' | 'rejected';

@Component({
  selector: 'app-zahtevi',
  templateUrl: './zahtevi.component.html',
  styleUrl: './zahtevi.component.scss',
  imports: [DateLocalPipe, FormsModule],
})
export class ZahteviComponent implements OnInit {

  requests: RegistrationRequest[] = [];
  total = 0;
  totalPages = 1;
  loading = true;

  selected: RegistrationRequest | null = null;
  detailOpen = false;

  // Counts per status
  pendingCount = 0;
  approvedCount = 0;
  rejectedCount = 0;
  allCount = 0;

  // Filters
  activeStatus: FilterStatus = 'pending';
  searchQuery = '';

  page = 1;
  pageSize = 10;

  // Reject flow
  rejectDialogOpen = false;
  rejectReason = '';
  rejectTarget: RegistrationRequest | null = null;
  processing = false;

  constructor(private service: UserService) { }

  ngOnInit(): void {
    this.load();
    this.loadCounts();
  }

  load(): void {
    this.loading = true;
    this.service.getRegistrationRequests({
      page: this.page,
      pageSize: this.pageSize,
      status: this.activeStatus || undefined,
    }).subscribe({
      next: res => {
        this.requests = res.data;
        this.total = res.total;
        this.totalPages = res.totalPages;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  private loadCounts(): void {
    this.service.getRegistrationRequests({ page: 1, pageSize: 1, status: 'pending' })
      .subscribe(r => { this.pendingCount = r.total; this.recomputeAll(); });
    this.service.getRegistrationRequests({ page: 1, pageSize: 1, status: 'approved' })
      .subscribe(r => { this.approvedCount = r.total; this.recomputeAll(); });
    this.service.getRegistrationRequests({ page: 1, pageSize: 1, status: 'rejected' })
      .subscribe(r => { this.rejectedCount = r.total; this.recomputeAll(); });
  }

  private recomputeAll(): void {
    this.allCount = this.pendingCount + this.approvedCount + this.rejectedCount;
  }

  setStatus(s: FilterStatus): void {
    this.activeStatus = s;
    this.page = 1;
    this.load();
  }

  onPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.load();
  }

  openDetail(r: RegistrationRequest): void {
    this.selected = r;
    this.detailOpen = true;
  }

  closeDetail(): void {
    this.detailOpen = false;
    this.selected = null;
  }

  approve(r: RegistrationRequest): void {
    this.processing = true;
    this.service.approveRegistration(r.id).subscribe({
      next: () => {
        this.processing = false;
        this.closeDetail();
        this.load();
        this.loadCounts();
      },
      error: () => { this.processing = false; },
    });
  }

  openRejectDialog(r: RegistrationRequest): void {
    this.rejectTarget = r;
    this.rejectReason = '';
    this.rejectDialogOpen = true;
  }

  cancelReject(): void {
    this.rejectDialogOpen = false;
    this.rejectTarget = null;
    this.rejectReason = '';
  }

  submitReject(): void {
    if (!this.rejectTarget) return;
    this.processing = true;
    this.service.rejectRegistration(this.rejectTarget.id, { rejectionReason: this.rejectReason }).subscribe({
      next: () => {
        this.processing = false;
        this.rejectDialogOpen = false;
        this.rejectTarget = null;
        this.closeDetail();
        this.load();
        this.loadCounts();
      },
      error: () => { this.processing = false; },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = Math.max(1, this.page - 2); i <= Math.min(this.totalPages, this.page + 2); i++) {
      pages.push(i);
    }
    return pages;
  }

  get pageStart(): number { return (this.page - 1) * this.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.total); }

  initials(name: string): string {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  statusLabel(s: string): string {
    return { pending: '⏳ Na čekanju', approved: '✅ Odobreno', rejected: '❌ Odbijeno' }[s] ?? s;
  }

  statusClass(s: string): string {
    return { pending: 'badge-amber', approved: 'badge-green', rejected: 'badge-red' }[s] ?? 'badge-gray';
  }

  typeLabel(r: RegistrationRequest): string {
    if (r.isIndividual) return '👤 Fizičko lice';
    return `🏢 ${r.organizationName ?? 'Organizacija'}`;
  }

  /** Check if request has an attached document (mock: always true for demo) */
  hasDocument(r: RegistrationRequest): boolean {
    return !!(r as any).documentUrl;
  }

  documentUrl(r: RegistrationRequest): string {
    return (r as any).documentUrl ?? '';
  }
}
