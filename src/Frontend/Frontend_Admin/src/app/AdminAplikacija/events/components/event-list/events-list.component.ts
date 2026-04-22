import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
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
  globalTotal = 0;  // uvijek ukupan broj svih dogadjaja, ne mijenja se pri filteru
  totalPages = 1;
  loading = true;
  viewMode: ViewMode = 'table';
  deleteTarget: Post | null = null;

  upcomingCount = 0;  // published
  ongoingCount = 0;
  pastCount = 0;      // archived
  draftCount = 0;     // draft (= Na čekanju)
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
    this.initSearch();
    this.regionService.getAll({ page: 1, pageSize: 100 }).subscribe(res => {
      this.regions = res.data;
    });
    this.loadCounts();
    this.load();
  }

  private loadCounts(): void {
    // Stabilni countovi — nezavisni od aktivnih filtera, uvijek tačni
    const base = new HttpParams().set('type', 'event').set('page', 1).set('pageSize', 1);
    this.http.get<any>(`${environment.apiUrl}/posts`, { params: base })
      .subscribe(r => { this.globalTotal = r.total ?? 0; });
    this.http.get<any>(`${environment.apiUrl}/posts`, { params: base.set('status', 'published') })
      .subscribe(r => { this.upcomingCount = r.total ?? 0; this.ongoingCount = r.total ?? 0; });
    this.http.get<any>(`${environment.apiUrl}/posts`, { params: base.set('status', 'draft') })
      .subscribe(r => { this.draftCount = r.total ?? 0; });
    this.http.get<any>(`${environment.apiUrl}/posts`, { params: base.set('status', 'archived') })
      .subscribe(r => { this.pastCount = r.total ?? 0; });
  }

  load(): void {
    this.loading = true;

    // Kada je aktivan category filter, učitavamo max dozvoljenih 100 zapisa
    // jer backend čuva category unutar JSON details polja i ne može filtrirati na njemu.
    // Manuelna paginacija se primjenjuje client-side na filtriranom skupu.
    const fetchSize = this.req.category ? 100 : this.req.pageSize;

    let params = new HttpParams()
      .set('type', 'event')
      .set('page', this.req.category ? 1 : this.req.page)
      .set('pageSize', fetchSize);

    if (this.req.sortBy) params = params.set('sortBy', this.req.sortBy);
    if (this.req.sortDir) params = params.set('sortDir', this.req.sortDir!);
    if (this.req.search) params = params.set('search', this.req.search);
    if (this.req.regionId) params = params.set('region_id', this.req.regionId);
    if (this.req.status) params = params.set('status', this.req.status);

    this.http.get<{ data: any[]; total: number; totalPages: number }>(
      `${environment.apiUrl}/posts`, { params }
    ).subscribe({
      next: res => {
        // Normalize: backend returns 'id', model uses 'postId'
        const normalize = (p: any): Post => ({ ...p, postId: p.postId ?? p.id });
        let all: Post[] = (res.data ?? []).map(normalize);

        // Client-side category filter (backend can't filter on JSON details field)
        if (this.req.category) {
          all = all.filter(e => this.eventCategory(e) === this.req.category);
        }

        // Manuelna paginacija kada je category filter aktivan
        if (this.req.category) {
          this.total = all.length;
          this.totalPages = Math.max(1, Math.ceil(all.length / this.req.pageSize));
          // Osiguraj da page nije van opsega nakon filtera
          if (this.req.page > this.totalPages) this.req = { ...this.req, page: 1 };
          const start = (this.req.page - 1) * this.req.pageSize;
          this.events = all.slice(start, start + this.req.pageSize);
        } else {
          this.events = all;
          this.total = res.total;
          this.totalPages = res.totalPages;
        }

        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  // ── Event date helpers ────────────────────────────────────────────────────
  private parseDet(e: Post): any {
    let det = e.details as any;
    if (typeof det === 'string') { try { det = JSON.parse(det); } catch { det = {}; } }
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

  isUpcoming(e: Post): boolean { return this.eventStart(e) > new Date(); }
  isOngoing(e: Post): boolean {
    const n = new Date();
    return this.eventStart(e) <= n && this.eventEnd(e) >= n;
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  private search$ = new Subject<string>();

  private initSearch(): void {
    this.search$.pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(q => { this.req = { ...this.req, search: q, page: 1 }; this.load(); });
  }

  onSearch(q: string): void {
    this.search$.next(q);
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

  // ── Status change with ConfirmDialog ───────────────────────────────────
  statusChangeTarget: Post | null = null;
  statusChangeValue: PostStatus | null = null;

  requestStatusChange(e: Post, status: PostStatus): void {
    this.statusChangeTarget = e;
    this.statusChangeValue = status;
  }
  cancelStatusChange(): void { this.statusChangeTarget = null; this.statusChangeValue = null; }

  doStatusChange(): void {
    const e = this.statusChangeTarget;
    const status = this.statusChangeValue;
    this.statusChangeTarget = null;
    this.statusChangeValue = null;
    if (!e || !status) return;
    this.http.put(`${environment.apiUrl}/posts/${e.postId}`, { status }).subscribe({
      next: () => {
        e.status = status;
        this.load();
        this.loadCounts();  // ažuriraj kockice (draftCount, upcomingCount itd.)
      },
    });
  }

  // Kept for HTML backward compat — now opens ConfirmDialog instead
  setEventStatus(e: Post, status: PostStatus): void { this.requestStatusChange(e, status); }

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
    let det = e.details as any;
    if (typeof det === 'string') {
      try { det = JSON.parse(det); } catch { return ''; }
    }
    return det?.category ?? '';
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
