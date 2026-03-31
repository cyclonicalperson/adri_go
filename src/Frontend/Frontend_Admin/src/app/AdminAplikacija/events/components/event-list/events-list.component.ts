import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EventService } from '@core/services/event.service';
import { DestinationService } from '@core/services/destination.service';
import { TouristEvent, EventCategory } from '@core/models/event.model';
import { Destination } from '@core/models/destination.model';
import { PageRequest } from '@core/models/api-response.model';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { DateLocalPipe } from '@shared/pipes/date-local.pipe';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';
import { EventCalendarComponent } from '../event-calendar/event-calendar.component';
import { BadgeVariant } from '@shared/components/badge/badge.component';

type ViewMode = 'table' | 'calendar';

@Component({
  selector: 'app-events-list',
  templateUrl: './events-list.component.html',
  styleUrl: './events-list.component.scss',
  imports: [ConfirmDialogComponent, DateLocalPipe, TruncatePipe, EventCalendarComponent],
})
export class EventsListComponent implements OnInit {
  events: TouristEvent[] = [];
  destinations: Destination[] = [];
  total = 0;
  totalPages = 1;
  loading = true;
  viewMode: ViewMode = 'table';
  deleteTarget: TouristEvent | null = null;

  upcomingCount = 0;
  ongoingCount = 0;
  pastCount = 0;

  req: PageRequest & { destinationId?: number; category?: string } = {
    page: 1, pageSize: 10, sortBy: 'startAt', sortDir: 'asc',
  };

  readonly categoryOptions = [
    { value: '', label: 'Svi' },
    { value: 'CONCERT', label: '🎵 Koncert' },
    { value: 'FESTIVAL', label: '🎪 Festival' },
    { value: 'SPORT', label: '⚽ Takmičenje' },
    { value: 'EXHIBITION', label: '🖼 Izložba' },
    { value: 'TOUR', label: '🗺 Tura' },
    { value: 'THEATER', label: '🎭 Pozorište' },
    { value: 'CONFERENCE', label: '💼 Konferencija' },
    { value: 'OTHER', label: '📌 Ostalo' },
  ];

  constructor(
    private service: EventService,
    private destService: DestinationService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.destService.getAll({ page: 1, pageSize: 200 }).subscribe(res => {
      this.destinations = res.data;
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getAll(this.req).subscribe({
      next: res => {
        this.events = res.data;
        this.total = res.total;
        this.totalPages = res.totalPages;
        const now = new Date();
        this.upcomingCount = res.data.filter(e => new Date(e.startAt) > now).length;
        this.ongoingCount = res.data.filter(e => new Date(e.startAt) <= now && new Date(e.endAt) >= now).length;
        this.pastCount = res.data.filter(e => new Date(e.endAt) < now).length;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onSearch(q: string): void { this.req = { ...this.req, search: q, page: 1 }; this.load(); }
  onCategoryChange(c: string): void { this.req = { ...this.req, category: c || undefined, page: 1 }; this.load(); }
  onDestinationChange(id: string): void { this.req = { ...this.req, destinationId: id ? +id : undefined, page: 1 }; this.load(); }
  onStatusFilter(_v: string): void { this.load(); }
  onSortCol(col: string): void {
    const dir = this.req.sortBy === col && this.req.sortDir === 'asc' ? 'desc' : 'asc';
    this.req = { ...this.req, sortBy: col, sortDir: dir, page: 1 };
    this.load();
  }
  onPage(p: number): void { if (p >= 1 && p <= this.totalPages) { this.req = { ...this.req, page: p }; this.load(); } }

  goNew(): void { this.router.navigate(['/admin/events/new']); }
  goEdit(e: TouristEvent): void { this.router.navigate(['/admin/events', e.eventId, 'edit']); }
  confirmDelete(e: TouristEvent): void { this.deleteTarget = e; }
  cancelDelete(): void { this.deleteTarget = null; }
  doDelete(): void {
    if (!this.deleteTarget) return;
    this.service.delete(this.deleteTarget.eventId).subscribe(() => { this.deleteTarget = null; this.load(); });
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

  isUpcoming(e: TouristEvent): boolean { return new Date(e.startAt) > new Date(); }
  isOngoing(e: TouristEvent): boolean { const n = new Date(); return new Date(e.startAt) <= n && new Date(e.endAt) >= n; }

  statusBadge(e: TouristEvent): string {
    if (this.isOngoing(e)) return 'badge-green';
    if (this.isUpcoming(e)) return 'badge-blue';
    return 'badge-gray';
  }

  statusLabel(e: TouristEvent): string {
    if (this.isOngoing(e)) return '🟢 U toku';
    if (this.isUpcoming(e)) return '📅 Predstojeći';
    return '✔ Završen';
  }

  categoryIcon(cat: EventCategory): string {
    const map: Record<string, string> = {
      CONCERT: '🎵', FESTIVAL: '🎪', SPORT: '⚽', EXHIBITION: '🖼',
      TOUR: '🗺', THEATER: '🎭', CONFERENCE: '💼', OTHER: '📌',
    };
    return map[cat] ?? '📌';
  }

  categoryLabel(cat: EventCategory): string {
    const found = this.categoryOptions.find(o => o.value === cat);
    return found?.label.replace(/^[^ ]+ /, '') ?? cat;
  }

  catBadgeClass(cat: EventCategory): string {
    const map: Record<string, string> = {
      CONCERT: 'type-noćni', FESTIVAL: 'type-ostalo', SPORT: 'type-sport',
      EXHIBITION: 'type-kultura', TOUR: 'type-priroda', THEATER: 'type-kultura',
      CONFERENCE: 'type-soba', OTHER: 'type-ostalo',
    };
    return map[cat] ?? 'type-ostalo';
  }
}
