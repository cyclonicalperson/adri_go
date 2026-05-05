import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Post, PostStatus } from '@core/models/post.model';
import { Region } from '@core/models/region.model';
import { PageRequest } from '@core/models/api-response.model';
import { AuthService } from '@core/auth/auth.service';
import { CsvExportService } from '@core/services/csv-export.service';
import { PostService } from '@core/services/post.service';
import { RegionService } from '@core/services/region.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';
import { DateLocalPipe } from '@shared/pipes/date-local.pipe';
import { MapComponent, MapMarker } from '@shared/components/map/map.component';
import { EventCalendarComponent } from '../event-calendar/event-calendar.component';

type ViewMode = 'table' | 'calendar';

@Component({
  selector: 'app-events-list',
  templateUrl: './events-list.component.html',
  styleUrl: './events-list.component.scss',
  imports: [ConfirmDialogComponent, TruncatePipe, DateLocalPipe, MapComponent, EventCalendarComponent],
})
export class EventsListComponent implements OnInit {
  events: Post[] = [];
  regions: Region[] = [];
  total = 0;
  globalTotal = 0;
  totalPages = 1;
  loading = true;
  viewMode: ViewMode = 'table';
  deleteTarget: Post | null = null;

  publishedCount = 0;
  archivedCount = 0;
  draftCount = 0;
  activeStatusFilter = '';

  detailEvent: Post | null = null;
  detailOpen = false;

  mapEvent: Post | null = null;
  mapOpen = false;

  req: PageRequest & {
    regionId?: number;
    status?: PostStatus;
    category?: string;
  } = { page: 1, pageSize: 10, sortBy: 'createdAt', sortDir: 'desc' };

  readonly categoryOptions = [
    { value: '', label: 'Svi tipovi' },
    { value: 'CONCERT', label: '🎵 Koncert' },
    { value: 'FESTIVAL', label: '🎪 Festival' },
    { value: 'SPORT', label: '⚽ Takmičenje' },
    { value: 'EXHIBITION', label: '🖼️ Izložba' },
    { value: 'TOUR', label: '🗺️ Tura' },
    { value: 'THEATER', label: '🎭 Pozorište' },
    { value: 'CONFERENCE', label: '💼 Konferencija' },
    { value: 'OTHER', label: '📌 Ostalo' },
  ];

  readonly statusOptions = [
    { value: '', label: 'Svi statusi' },
    { value: 'published', label: '✅ Objavljeno' },
    { value: 'draft', label: '⏳ Na čekanju' },
    { value: 'archived', label: '📦 Arhivirano' },
  ];

  private search$ = new Subject<string>();

  constructor(
    private postService: PostService,
    private regionService: RegionService,
    private router: Router,
    private auth: AuthService,
    private csv: CsvExportService,
  ) {}

  ngOnInit(): void {
    this.initSearch();
    this.regionService.getAll({ page: 1, pageSize: 100 }).subscribe(res => {
      this.regions = res.data;
    });
    this.loadCounts();
    this.load();
  }

  get canManageEvents(): boolean {
    return this.auth.hasPermission('manage_own_posts');
  }

  get canCreateEvents(): boolean {
    return this.auth.hasPermission('create_event');
  }

  private recomputeGlobalTotal(): void {
    this.globalTotal = this.publishedCount + this.draftCount + this.archivedCount;
  }

  private loadCounts(): void {
    this.postService.getAll({ type: 'event', status: 'published', page: 1, pageSize: 1 })
      .subscribe(res => {
        this.publishedCount = res.total ?? 0;
        this.recomputeGlobalTotal();
      });

    this.postService.getAll({ type: 'event', status: 'draft', page: 1, pageSize: 1 })
      .subscribe(res => {
        this.draftCount = res.total ?? 0;
        this.recomputeGlobalTotal();
      });

    this.postService.getAll({ type: 'event', status: 'archived', page: 1, pageSize: 1 })
      .subscribe(res => {
        this.archivedCount = res.total ?? 0;
        this.recomputeGlobalTotal();
      });
  }

  load(): void {
    this.loading = true;
    const fetchSize = this.req.category ? 100 : this.req.pageSize;

    this.postService.getAll({
      type: 'event',
      page: this.req.category ? 1 : this.req.page,
      pageSize: fetchSize,
      sortBy: this.req.sortBy,
      sortDir: this.req.sortDir,
      search: this.req.search,
      regionId: this.req.regionId,
      status: this.req.status,
    }).subscribe({
      next: res => {
        let all: Post[] = res.data ?? [];

        if (this.req.category) {
          all = all.filter(e => this.eventCategory(e) === this.req.category);
        }

        if (this.req.category) {
          this.total = all.length;
          this.totalPages = Math.max(1, Math.ceil(all.length / this.req.pageSize));
          if (this.req.page > this.totalPages) {
            this.req = { ...this.req, page: 1 };
          }
          const start = (this.req.page - 1) * this.req.pageSize;
          this.events = all.slice(start, start + this.req.pageSize);
        } else {
          this.events = all;
          this.total = res.total;
          this.totalPages = res.totalPages;
        }

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private parseDet(e: Post): any {
    let det = e.details as any;
    if (typeof det === 'string') {
      try {
        det = JSON.parse(det);
      } catch {
        det = {};
      }
    }
    return det ?? {};
  }

  eventStart(e: Post): Date {
    const ds = this.parseDet(e);
    return ds?.startAt ? new Date(ds.startAt) : (ds?.eventStart ? new Date(ds.eventStart) : new Date(e.createdAt));
  }

  eventEnd(e: Post): Date {
    const ds = this.parseDet(e);
    return ds?.endAt ? new Date(ds.endAt) : (ds?.eventEnd ? new Date(ds.eventEnd) : new Date(e.createdAt));
  }

  isUpcoming(e: Post): boolean {
    return this.eventStart(e) > new Date();
  }

  isOngoing(e: Post): boolean {
    const now = new Date();
    return this.eventStart(e) <= now && this.eventEnd(e) >= now;
  }

  private initSearch(): void {
    this.search$.pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(q => {
        this.req = { ...this.req, search: q, page: 1 };
        this.load();
      });
  }

  onSearch(q: string): void {
    this.search$.next(q);
  }

  onCategoryChange(cat: string): void {
    this.req = { ...this.req, category: cat || undefined, page: 1 };
    this.load();
  }

  onRegionChange(id: string): void {
    this.req = { ...this.req, regionId: id ? +id : undefined, page: 1 };
    this.load();
  }

  onStatusFilter(val: string): void {
    this.activeStatusFilter = val;
    this.req = { ...this.req, status: (val as PostStatus) || undefined, page: 1 };
    this.load();
  }

  filterByStatus(status: string): void {
    this.onStatusFilter(status);
  }

  onSortCol(col: string): void {
    const dir = this.req.sortBy === col && this.req.sortDir === 'asc' ? 'desc' : 'asc';
    this.req = { ...this.req, sortBy: col, sortDir: dir, page: 1 };
    this.load();
  }

  onPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.req = { ...this.req, page: p };
      this.load();
    }
  }

  goNew(): void {
    this.router.navigate(['/admin/events/new']);
  }

  goEdit(e: Post): void {
    this.router.navigate(['/admin/events', e.postId, 'edit']);
  }

  confirmDelete(e: Post): void {
    this.deleteTarget = e;
  }

  cancelDelete(): void {
    this.deleteTarget = null;
  }

  openDetail(e: Post): void {
    this.detailEvent = e;
    this.detailOpen = true;
  }

  closeDetail(): void {
    this.detailOpen = false;
    this.detailEvent = null;
  }

  showOnMap(e: Post): void {
    this.mapEvent = e;
    this.mapOpen = true;
  }

  closeMap(): void {
    this.mapOpen = false;
    this.mapEvent = null;
  }

  get mapMarkers(): MapMarker[] {
    if (!this.mapEvent || !this.mapEvent.lat || !this.mapEvent.lng) return [];
    return [{
      id: this.mapEvent.postId,
      lat: this.mapEvent.lat,
      lng: this.mapEvent.lng,
      label: this.mapEvent.title,
      category: this.categoryLabel(this.eventCategory(this.mapEvent)),
    }];
  }

  doDelete(): void {
    if (!this.deleteTarget) return;
    this.postService.delete(this.deleteTarget.postId)
      .subscribe(() => {
        this.deleteTarget = null;
        this.load();
        this.loadCounts();
      });
  }

  statusChangeTarget: Post | null = null;
  statusChangeValue: PostStatus | null = null;

  requestStatusChange(e: Post, status: PostStatus): void {
    this.statusChangeTarget = e;
    this.statusChangeValue = status;
  }

  cancelStatusChange(): void {
    this.statusChangeTarget = null;
    this.statusChangeValue = null;
  }

  doStatusChange(): void {
    const event = this.statusChangeTarget;
    const status = this.statusChangeValue;
    this.statusChangeTarget = null;
    this.statusChangeValue = null;

    if (!event || !status) return;

    this.postService.update(event.postId, { status }).subscribe({
      next: () => {
        event.status = status;
        this.load();
        this.loadCounts();
      },
    });
  }

  setEventStatus(e: Post, status: PostStatus): void {
    this.requestStatusChange(e, status);
  }

  printReport(): void {
    window.print();
  }

  exportCsv(): void {
    const today = new Date().toISOString().split('T')[0];
    this.csv.download(
      `dogadjaji_${today}.csv`,
      ['ID', 'Naslov', 'Kategorija', 'Status', 'Region', 'Kreirano', 'Pregledi', 'Recenzije'],
      this.events.map(e => [
        e.postId,
        e.title,
        this.eventCategory(e),
        e.status,
        e.region?.name ?? '—',
        e.createdAt,
        e.viewCount,
        e.reviewCount,
      ]),
    );
  }

  get pageStart(): number {
    return this.total === 0 ? 0 : (this.req.page - 1) * this.req.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.req.page * this.req.pageSize, this.total);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = Math.max(1, this.req.page - 2); i <= Math.min(this.totalPages, this.req.page + 2); i += 1) {
      pages.push(i);
    }
    return pages;
  }

  statusBadge(e: Post): string {
    if (this.isOngoing(e)) return 'badge-green';
    if (this.isUpcoming(e)) return 'badge-blue';
    return 'badge-gray';
  }

  statusLabel(e: Post): string {
    if (this.isOngoing(e)) return '🟢 U toku';
    if (this.isUpcoming(e)) return '📅 Predstojeći';
    return '✔ Završeno';
  }

  eventCategory(e: Post): string {
    let det = e.details as any;
    if (typeof det === 'string') {
      try {
        det = JSON.parse(det);
      } catch {
        return '';
      }
    }
    return det?.category ?? '';
  }

  categoryIcon(cat: string): string {
    const map: Record<string, string> = {
      CONCERT: '🎵',
      FESTIVAL: '🎪',
      SPORT: '⚽',
      EXHIBITION: '🖼️',
      TOUR: '🗺️',
      THEATER: '🎭',
      CONFERENCE: '💼',
      OTHER: '📌',
    };
    return map[cat] ?? '🎟️';
  }

  categoryLabel(cat: string): string {
    const found = this.categoryOptions.find(o => o.value === cat);
    return found?.label.replace(/^[^\s]+ /, '') ?? (cat || 'Događaj');
  }

  catBadgeClass(cat: string): string {
    const map: Record<string, string> = {
      CONCERT: 'type-nocni',
      FESTIVAL: 'type-ostalo',
      SPORT: 'type-sport',
      EXHIBITION: 'type-kultura',
      TOUR: 'type-priroda',
      THEATER: 'type-kultura',
      CONFERENCE: 'type-soba',
      OTHER: 'type-ostalo',
    };
    return map[cat] ?? 'type-ostalo';
  }

  postStatusBadgeClass(status: PostStatus): string {
    return { published: 'badge-green', draft: 'badge-amber', archived: 'badge-gray' }[status] ?? 'badge-gray';
  }

  postStatusLabel(status: PostStatus): string {
    return { published: '✅ Objavljeno', draft: '⏳ Na čekanju', archived: '📦 Arhivirano' }[status] ?? status;
  }
}
