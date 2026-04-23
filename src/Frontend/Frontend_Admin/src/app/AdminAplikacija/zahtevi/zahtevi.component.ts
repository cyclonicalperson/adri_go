import { Component, OnInit } from '@angular/core';
import { BadgeService } from '@core/services/badge.service';
import { UserService } from '@core/services/user.service';
import { RegistrationRequest } from '@core/models/user.model';
import { DateLocalPipe } from '@shared/pipes/date-local.pipe';
import { FormsModule } from '@angular/forms';
import { environment } from '@env/environment';

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

  pendingCount = 0;
  activeAdminCount = 0;
  suspendedAdminCount = 0;
  allCount = 0;
  approvedCount = 0;
  rejectedCount = 0;

  activeStatus: FilterStatus = 'pending';
  searchQuery = '';

  page = 1;
  pageSize = 10;

  rejectDialogOpen = false;
  rejectReason = '';
  rejectTarget: RegistrationRequest | null = null;
  processing = false;

  constructor(
    private service: UserService,
    private badgeService: BadgeService,
  ) { }

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
      search: this.searchQuery || undefined,
    }).subscribe({
      next: res => {
        this.requests = res.data;
        this.total = res.total;
        this.totalPages = res.totalPages;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private loadCounts(): void {
    this.service.getRegistrationRequests({ page: 1, pageSize: 1, status: 'pending' })
      .subscribe(r => {
        this.pendingCount = r.total;
        this.recomputeAll();
      });

    this.service.getRegistrationRequests({ page: 1, pageSize: 1, status: 'approved' })
      .subscribe(r => {
        this.approvedCount = r.total;
        this.recomputeAll();
      });

    this.service.getRegistrationRequests({ page: 1, pageSize: 1, status: 'rejected' })
      .subscribe(r => {
        this.rejectedCount = r.total;
        this.recomputeAll();
      });

    this.service.getAll({ page: 1, pageSize: 1, accountStatus: 'active' }).subscribe(res => {
      this.activeAdminCount = res.total;
    });

    this.service.getAll({ page: 1, pageSize: 1, accountStatus: 'suspended' }).subscribe(res => {
      this.suspendedAdminCount = res.total;
    });
  }

  private recomputeAll(): void {
    this.allCount = this.pendingCount + this.approvedCount + this.rejectedCount;
  }

  onSearch(query: string): void {
    this.searchQuery = query;
    this.page = 1;
    this.load();
  }

  clearFilters(): void {
    this.activeStatus = '';
    this.searchQuery = '';
    this.page = 1;
    this.load();
  }

  setStatus(status: FilterStatus): void {
    this.activeStatus = status;
    this.page = 1;
    this.load();
  }

  onPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.page = page;
    this.load();
  }

  openDetail(request: RegistrationRequest): void {
    this.selected = request;
    this.detailOpen = true;
  }

  closeDetail(): void {
    this.detailOpen = false;
    this.selected = null;
  }

  approve(request: RegistrationRequest): void {
    this.processing = true;
    this.service.approveRegistration(request.id).subscribe({
      next: () => {
        this.processing = false;
        this.closeDetail();
        this.load();
        this.loadCounts();
        this.badgeService.refresh();
      },
      error: () => {
        this.processing = false;
      },
    });
  }

  openRejectDialog(request: RegistrationRequest): void {
    this.rejectTarget = request;
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
        this.badgeService.refresh();
      },
      error: () => {
        this.processing = false;
      },
    });
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = Math.max(1, this.page - 2); i <= Math.min(this.totalPages, this.page + 2); i += 1) {
      pages.push(i);
    }
    return pages;
  }

  get pageStart(): number {
    return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  initials(name: string): string {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  statusLabel(status: string): string {
    return { pending: '⏳ Na čekanju', approved: '✅ Odobreno', rejected: '❌ Odbijeno' }[status] ?? status;
  }

  statusClass(status: string): string {
    return { pending: 'badge-amber', approved: 'badge-green', rejected: 'badge-red' }[status] ?? 'badge-gray';
  }

  typeLabel(request: RegistrationRequest): string {
    if (request.isIndividual) return '👤 Fizičko lice';
    return `🏢 ${request.organizationName ?? 'Organizacija'}`;
  }

  reviewedByLabel(request: RegistrationRequest): string {
    return request.reviewedBy ? `Superadmin #${request.reviewedBy}` : '—';
  }

  hasDocument(request: RegistrationRequest): boolean {
    return !!request.documentUrl;
  }

  documentUrl(request: RegistrationRequest): string {
    const raw = request.documentUrl;
    if (!raw) return '';
    // Ako backend već vrati apsolutni URL (http://...) — koristi ga direktno
    if (raw.startsWith('http')) return raw;
    // Inače — sagradi apsolutni URL iz API baze (ukloni /api sufiks)
    const apiBase = environment.apiUrl.replace(/\/api$/, '');
    return `${apiBase}${raw.startsWith('/') ? '' : '/'}${raw}`;
  }
}
