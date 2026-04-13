import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { Post, PostStatus } from '@core/models/post.model';
import { Region } from '@core/models/region.model';
import { PageRequest } from '@core/models/api-response.model';
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
  totalPages = 1;
  loading = true;
  viewMode: ViewMode = 'table';
  deleteTarget: Post | null = null;

  upcomingCount = 0;
  ongoingCount = 0;
  pastCount = 0;
  draftCount = 0;
  activeStatusFilter = '';

  // Detail panel
  detailEvent: Post | null = null;
  detailOpen = false;

  // Map panel
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
    { value: 'draft', label: '📝 Nacrt' },
    { value: 'archived', label: '📦 Arhivirano' },
  ];

  constructor(
    private http: HttpClient,
    private regionService: RegionService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.regionService.getAll({ page: 1, pageSize: 100 }).subscribe(res => {
      this.regions = res.data;
    });
    this.load();
  }

  load(): void {
    this.loading = true;

    let params = new HttpParams()
      .set('postType', 'event')
      .set('page', this.req.page)
      .set('pageSize', this.req.pageSize);

    if (this.req.sortBy) params = params.set('sortBy', this.req.sortBy);
    if (this.req.sortDir) params = params.set('sortDir', this.req.sortDir!);
    if (this.req.search) params = params.set('search', this.req.search);
    if (this.req.regionId) params = params.set('regionId', this.req.regionId);
    if (this.req.status) params = params.set('status', this.req.status);
    if (this.req.category) params = params.set('category', this.req.category);

    this.http.get<{ data: Post[]; total: number; totalPages: number }>(
      `${environment.apiUrl}/posts`, { params }
    ).subscribe({
      next: res => {
        this.events = res.data;
        this.total = res.total;
        this.totalPages = res.totalPages;

        const now = new Date();
        this.upcomingCount = res.data.filter(e => this.eventStart(e) > now).length;
        this.ongoingCount = res.data.filter(e => this.eventStart(e) <= now && this.eventEnd(e) >= now).length;
        this.pastCount = res.data.filter(e => this.eventEnd(e) < now).length;
        this.draftCount = res.data.filter(e => e.status === 'draft').length;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  // ── Event date helpers ────────────────────────────────────────────────────
  eventStart(e: Post): Date {
    const ds = e.details as any;
    return ds?.eventStart ? new Date(ds.eventStart) : new Date(e.createdAt);
  }

  eventEnd(e: Post): Date {
    const ds = e.details as any;
    return ds?.eventEnd ? new Date(ds.eventEnd) : new Date(e.createdAt);
  }

  isUpcoming(e: Post): boolean { return this.eventStart(e) > new Date(); }
  isOngoing(e: Post): boolean {
    const n = new Date();
    return this.eventStart(e) <= n && this.eventEnd(e) >= n;
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  onSearch(q: string): void {
    this.req = { ...this.req, search: q, page: 1 }; this.load();
  }

  onCategoryChange(cat: string): void {
    this.req = { ...this.req, category: cat || undefined, page: 1 }; this.load();
  }

  onRegionChange(id: string): void {
    this.req = { ...this.req, regionId: id ? +id : undefined, page: 1 }; this.load();
  }

  onStatusFilter(val: string): void {
    this.req = { ...this.req, status: (val as PostStatus) || undefined, page: 1 }; this.load();
  }

  filterByStatus(status: string): void {
    this.activeStatusFilter = status;
    this.req = { ...this.req, status: (status as PostStatus) || undefined, page: 1 };
    this.load();
  }

  onSortCol(col: string): void {
    const dir = this.req.sortBy === col && this.req.sortDir === 'asc' ? 'desc' : 'asc';
    this.req = { ...this.req, sortBy: col, sortDir: dir, page: 1 };
    this.load();
  }

  onPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) { this.req = { ...this.req, page: p }; this.load(); }
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────
  goNew(): void { this.router.navigate(['/admin/events/new']); }
  goEdit(e: Post): void { this.router.navigate(['/admin/events', e.postId, 'edit']); }
  confirmDelete(e: Post): void { this.deleteTarget = e; }
  cancelDelete(): void { this.deleteTarget = null; }

  // ── Detail panel ────────────────────────────────────────────────────────
  openDetail(e: Post): void { this.detailEvent = e; this.detailOpen = true; }
  closeDetail(): void { this.detailOpen = false; this.detailEvent = null; }

  // ── Map panel ───────────────────────────────────────────────────────────
  showOnMap(e: Post): void { this.mapEvent = e; this.mapOpen = true; }
  closeMap(): void { this.mapOpen = false; this.mapEvent = null; }

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
    this.http.delete(`${environment.apiUrl}/posts/${this.deleteTarget.postId}`)
      .subscribe(() => { this.deleteTarget = null; this.load(); });
  }

  printReport(): void { window.print(); }

  exportCsv(): void {
    const header = ['ID', 'Naslov', 'Kategorija', 'Status', 'Region', 'Datum'];
    const rows = this.events.map(e => [
      e.postId, e.title, this.eventCategory(e),
      e.status, e.region?.name ?? '—', e.createdAt,
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dogadjaji_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  get pageStart(): number { return (this.req.page - 1) * this.req.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.req.page * this.req.pageSize, this.total); }
  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = Math.max(1, this.req.page - 2); i <= Math.min(this.totalPages, this.req.page + 2); i++) pages.push(i);
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
    return '✔ Završen';
  }

  eventCategory(e: Post): string {
    return (e.details as any)?.category ?? '';
  }

  categoryIcon(cat: string): string {
    const map: Record<string, string> = {
      CONCERT: '🎵', FESTIVAL: '🎪', SPORT: '⚽', EXHIBITION: '🖼️',
      TOUR: '🗺️', THEATER: '🎭', CONFERENCE: '💼', OTHER: '📌',
    };
    return map[cat] ?? '🎟️';
  }

  categoryLabel(cat: string): string {
    const found = this.categoryOptions.find(o => o.value === cat);
    return found?.label.replace(/^[^\s]+ /, '') ?? (cat || 'Dogadjaj');
  }

  catBadgeClass(cat: string): string {
    const map: Record<string, string> = {
      CONCERT: 'type-noćni', FESTIVAL: 'type-ostalo', SPORT: 'type-sport',
      EXHIBITION: 'type-kultura', TOUR: 'type-priroda', THEATER: 'type-kultura',
      CONFERENCE: 'type-soba', OTHER: 'type-ostalo',
    };
    return map[cat] ?? 'type-ostalo';
  }

  postStatusBadgeClass(status: PostStatus): string {
    return { published: 'badge-green', draft: 'badge-amber', archived: 'badge-gray' }[status] ?? 'badge-gray';
  }

  postStatusLabel(status: PostStatus): string {
    return { published: '✅ Objavljeno', draft: '📝 Nacrt', archived: '📦 Arhivirano' }[status] ?? status;
  }
}
