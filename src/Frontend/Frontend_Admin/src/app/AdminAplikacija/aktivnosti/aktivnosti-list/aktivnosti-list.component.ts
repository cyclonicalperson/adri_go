import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { AdminListStateService } from '@core/services/admin-list-state.service';
import { ActivityService } from '@core/services/activity.service';
import { CsvExportService } from '@core/services/csv-export.service';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { MapComponent, MapMarker } from '@shared/components/map/map.component';

interface BackendActivity {
  id: number;
  activityId?: number;
  name: string;
  category: string;
  description?: string;
  lat?: number | null;
  lng?: number | null;
  locationName?: string;
  color?: string;
  status?: string;
  viewCount?: number;
}

interface ActivitiesListState {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  activeCategory?: string;
  activeStatus?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

@Component({
  selector: 'app-aktivnosti-list',
  templateUrl: './aktivnosti-list.component.html',
  styleUrl: './aktivnosti-list.component.scss',
  imports: [FormsModule, TruncatePipe, ConfirmDialogComponent, MapComponent],
})
export class AktivnostiListComponent implements OnInit {
  activities: BackendActivity[] = [];
  total = 0;
  globalTotal = 0;
  totalPages = 1;
  page = 1;
  pageSize = 10;
  loading = true;

  searchQuery = '';
  activeCategory = '';
  activeStatus = '';
  sortBy = 'name';
  sortDir: 'asc' | 'desc' = 'asc';

  sportCount = 0;
  natureCount = 0;
  wellnessCount = 0;
  pendingCount = 0;

  detailActivity: BackendActivity | null = null;
  detailOpen = false;
  mapActivity: BackendActivity | null = null;
  mapOpen = false;
  deleteTarget: BackendActivity | null = null;

  readonly categoryOptions = [
    { value: '', label: 'Sve' },
    { value: 'SPORT', label: '🏊 Sport' },
    { value: 'ADVENTURE', label: '🌿 Priroda / Avantura' },
    { value: 'WELLNESS', label: '💆 Wellness' },
    { value: 'SHOPPING', label: '🛍️ Shopping' },
    { value: 'DINING', label: '🍴 Ishrana' },
    { value: 'SIGHTSEEING', label: '📸 Razgledanje' },
    { value: 'NIGHTLIFE', label: '🎶 Klupsko' },
    { value: 'CULTURE', label: '🎭 Kultura' },
    { value: 'OTHER', label: '➕ Ostalo' },
  ];

  private search$ = new Subject<string>();
  private readonly stateKey = 'activities';

  constructor(
    private activityService: ActivityService,
    private router: Router,
    private auth: AuthService,
    private csv: CsvExportService,
    private listState: AdminListStateService,
  ) {}

  ngOnInit(): void {
    this.restoreListState();
    this.initSearch();
    this.loadGlobalTotal();
    this.load();
  }

  get canManageActivities(): boolean {
    return this.auth.hasPermission('manage_tags');
  }

  private loadGlobalTotal(): void {
    this.activityService.getAll({ page: 1, pageSize: 1 }).subscribe({
      next: res => {
        this.globalTotal = res.total ?? 0;
      },
    });
  }

  clearAllFilters(): void {
    this.activeCategory = '';
    this.activeStatus = '';
    this.page = 1;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.persistListState();

    this.activityService.getAll({
      page: this.page,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
      search: this.searchQuery || undefined,
      category: this.activeCategory || undefined,
      status: this.activeStatus || undefined,
    }).subscribe({
      next: res => {
        this.activities = (res.data ?? []).map(a => ({
          ...a,
          id: (a as any).id ?? a.activityId ?? 0,
          activityId: (a as any).id ?? a.activityId ?? 0,
        }));
        this.total = res.total;
        this.totalPages = res.totalPages;

        this.sportCount = res.sportCount ?? this.activities.filter(a => this.inferCat(a) === 'SPORT').length;
        this.natureCount = res.natureCount ?? this.activities.filter(a => this.inferCat(a) === 'ADVENTURE').length;
        this.wellnessCount = res.wellnessCount ?? this.activities.filter(a => this.inferCat(a) === 'WELLNESS').length;
        this.pendingCount = res.pendingCount ?? this.activities.filter(a => a.status === 'pending').length;

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  normCat(cat: string | undefined): string {
    return (cat ?? '').toUpperCase();
  }

  private initSearch(): void {
    this.search$.pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(q => {
        this.searchQuery = q;
        this.page = 1;
        this.load();
      });
  }

  onSearch(q: string): void {
    this.searchQuery = q;
    this.search$.next(q);
  }

  setCategory(category: string): void {
    this.activeCategory = category;
    this.page = 1;
    this.load();
  }

  setStatus(status: string): void {
    this.activeStatus = status;
    this.page = 1;
    this.load();
  }

  onStatusChange(val: string): void {
    this.setStatus(val);
  }

  get sortValue(): string {
    return `${this.sortBy}:${this.sortDir}`;
  }

  set sortValue(val: string) {
    this.onSortChange(val);
  }

  onSortChange(val: string): void {
    const [sortBy, sortDir] = val.split(':') as [string, 'asc' | 'desc'];
    this.sortBy = sortBy;
    this.sortDir = sortDir;
    this.page = 1;
    this.load();
  }

  onSortCol(col: string): void {
    this.sortDir = this.sortBy === col && this.sortDir === 'asc' ? 'desc' : 'asc';
    this.sortBy = col;
    this.page = 1;
    this.load();
  }

  onPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.page = p;
      this.load();
    }
  }

  approveActivity(activity: BackendActivity): void {
    this.activityService.updateStatus(activity.id, 'approved').subscribe({
      next: () => {
        activity.status = 'approved';
        this.loadGlobalTotal();
        this.load();
      },
    });
  }

  rejectActivity(activity: BackendActivity): void {
    const id = activity.id ?? activity.activityId;
    this.activityService.delete(id).subscribe({
      next: () => {
        this.activities = this.activities.filter(x => (x.id ?? x.activityId) !== id);
        this.total = Math.max(0, this.total - 1);
        this.loadGlobalTotal();
        this.load();
      },
    });
  }

  editActivity(activity: BackendActivity): void {
    this.router.navigate(['/admin/aktivnosti', activity.id ?? activity.activityId, 'edit']);
  }

  openDetail(activity: BackendActivity): void {
    this.detailActivity = activity;
    this.detailOpen = true;
  }

  closeDetail(): void {
    this.detailOpen = false;
    this.detailActivity = null;
  }

  showOnMap(activity: BackendActivity): void {
    this.mapActivity = activity;
    this.mapOpen = true;
  }

  closeMap(): void {
    this.mapOpen = false;
    this.mapActivity = null;
  }

  get mapMarkers(): MapMarker[] {
    if (!this.mapActivity?.lat || !this.mapActivity?.lng) return [];
    return [{
      id: this.mapActivity.id,
      lat: this.mapActivity.lat,
      lng: this.mapActivity.lng,
      label: this.mapActivity.name,
      category: 'sports_facility',
    }];
  }

  confirmDelete(activity: BackendActivity): void {
    this.deleteTarget = activity;
  }

  cancelDelete(): void {
    this.deleteTarget = null;
  }

  doDelete(): void {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget.id ?? this.deleteTarget.activityId;
    this.activityService.delete(id).subscribe({
      next: () => {
        this.deleteTarget = null;
        this.activities = this.activities.filter(a => (a.id ?? a.activityId) !== id);
        this.total = Math.max(0, this.total - 1);
        this.load();
      },
      error: () => {
        this.deleteTarget = null;
      },
    });
  }

  openNew(): void {
    this.router.navigate(['/admin/aktivnosti', 'new']);
  }

  printReport(): void {
    window.print();
  }

  exportCsv(): void {
    const today = new Date().toISOString().split('T')[0];
    this.csv.download(
      `aktivnosti_${today}.csv`,
      ['ID', 'Naziv', 'Kategorija', 'Status', 'Lokacija', 'GPS Lat', 'GPS Lng', 'Pregledi'],
      this.activities.map(a => [
        a.id ?? a.activityId,
        a.name,
        this.categoryLabel(a),
        a.status ?? '—',
        this.locationName(a),
        a.lat ?? '',
        a.lng ?? '',
        a.viewCount ?? 0,
      ]),
    );
  }

  get pageStart(): number {
    return this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = Math.max(1, this.page - 2); i <= Math.min(this.totalPages, this.page + 2); i += 1) {
      pages.push(i);
    }
    return pages;
  }

  private inferCat(activity: BackendActivity): string {
    const known = ['SPORT', 'ADVENTURE', 'WELLNESS', 'SHOPPING', 'DINING', 'NIGHTLIFE', 'SIGHTSEEING', 'CULTURE'];
    if (known.includes((activity.category ?? '').toUpperCase())) return activity.category!.toUpperCase();

    const name = (activity.name ?? '').toLowerCase();
    if (/ski|snowboard|sport|tenis|fudbal|košarka|plivanje|planinar|bicikl|ronjenje|surfing|golf|trčanje/.test(name)) return 'SPORT';
    if (/rafting|treking|planin|penjanje|avantur|zipline|paraglajd|kajak|jezer|priroda/.test(name)) return 'ADVENTURE';
    if (/wellness|spa|masaž|relaks|yoga|meditacija|sauna/.test(name)) return 'WELLNESS';
    if (/shoppin|kupovina|suveniri|tržnica|prodavnica/.test(name)) return 'SHOPPING';
    if (/restoran|kafić|kulinar|hrana|degustaci|vinski|gastro|večera/.test(name)) return 'DINING';
    if (/noćn|klub|muzika|koncert|zabav/.test(name)) return 'NIGHTLIFE';
    if (/razgledanje|tura|vođen|muzej|galerija|fotograf|historij/.test(name)) return 'SIGHTSEEING';
    if (/kultura|pozorište|festival|izložba/.test(name)) return 'CULTURE';
    return 'OTHER';
  }

  categoryIcon(activity: BackendActivity): string {
    const map: Record<string, string> = {
      SPORT: '🏊',
      ADVENTURE: '⛰️',
      WELLNESS: '💆',
      SHOPPING: '🛍️',
      DINING: '🍽️',
      NIGHTLIFE: '🎶',
      SIGHTSEEING: '📸',
      CULTURE: '🎭',
      OTHER: '🎯',
    };
    return map[this.inferCat(activity)] ?? '🎯';
  }

  categoryLabel(activity: BackendActivity): string {
    const map: Record<string, string> = {
      SPORT: 'Sport',
      ADVENTURE: 'Priroda / Avantura',
      WELLNESS: 'Wellness',
      SHOPPING: 'Shopping',
      DINING: 'Ishrana',
      NIGHTLIFE: 'Noćni život',
      SIGHTSEEING: 'Razgledanje',
      CULTURE: 'Kultura',
      OTHER: 'Aktivnost',
    };
    return map[this.inferCat(activity)] ?? 'Aktivnost';
  }

  typeBadgeClass(activity: BackendActivity): string {
    const map: Record<string, string> = {
      SPORT: 'type-sport',
      ADVENTURE: 'type-priroda',
      WELLNESS: 'type-wellness',
      SHOPPING: 'type-shopping',
      DINING: 'type-restoran',
      NIGHTLIFE: 'type-nocni',
      SIGHTSEEING: 'type-kultura',
      CULTURE: 'type-kultura',
      OTHER: 'type-ostalo',
    };
    return map[this.inferCat(activity)] ?? 'type-ostalo';
  }

  gpsText(activity: BackendActivity): string {
    if (activity.lat && activity.lng) {
      return `${Number(activity.lat).toFixed(4)}°N, ${Number(activity.lng).toFixed(4)}°E`;
    }
    return '';
  }

  private restoreListState(): void {
    const state = this.listState.read<ActivitiesListState>(this.stateKey);
    this.page = Number(state.page ?? this.page) || 1;
    this.pageSize = Number(state.pageSize ?? this.pageSize) || 10;
    this.searchQuery = state.searchQuery ?? this.searchQuery;
    this.activeCategory = state.activeCategory ?? this.activeCategory;
    this.activeStatus = state.activeStatus ?? this.activeStatus;
    this.sortBy = state.sortBy ?? this.sortBy;
    this.sortDir = state.sortDir ?? this.sortDir;
  }

  private persistListState(): void {
    this.listState.save<ActivitiesListState>(this.stateKey, {
      page: this.page,
      pageSize: this.pageSize,
      searchQuery: this.searchQuery,
      activeCategory: this.activeCategory,
      activeStatus: this.activeStatus,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
    });
  }

  locationName(activity: BackendActivity): string {
    return activity.locationName ?? '—';
  }
}
