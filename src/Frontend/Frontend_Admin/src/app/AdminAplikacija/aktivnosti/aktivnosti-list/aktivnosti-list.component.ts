import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
// already imported
import { environment } from '@env/environment';
import { Activity, ActivityCategory } from '@core/models/activity.model';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { MapComponent, MapMarker } from '@shared/components/map/map.component';

@Component({
  selector: 'app-aktivnosti-list',
  templateUrl: './aktivnosti-list.component.html',
  styleUrl: './aktivnosti-list.component.scss',
  imports: [TruncatePipe, ConfirmDialogComponent, MapComponent],
})
export class AktivnostiListComponent implements OnInit {
  activities: Activity[] = [];
  total = 0;
  totalPages = 1;
  page = 1;
  pageSize = 10;
  loading = true;

  searchQuery = '';
  activeCategory = '';
  sortBy = 'createdAt';
  sortDir: 'asc' | 'desc' = 'desc';

  // Approximate stat counts
  sportCount = 38;
  natureCount = 29;
  wellnessCount = 22;
  totalViews = 8294;

  // Detail panel
  detailActivity: Activity | null = null;
  detailOpen = false;

  // Map panel
  mapActivity: Activity | null = null;
  mapOpen = false;

  // Delete dialog
  deleteTarget: Activity | null = null;

  readonly categoryOptions = [
    { value: '', label: 'Sve' },
    { value: 'SPORT', label: '🏊 Sport' },
    { value: 'ADVENTURE', label: '🌿 Priroda' },
    { value: 'WELLNESS', label: '💆 Wellness' },
    { value: 'SHOPPING', label: '🛍️ Shopping' },
    { value: 'DINING', label: '🍴 Ishrana' },
    { value: 'SIGHTSEEING', label: '📸 Razgledanje' },
    { value: 'NIGHTLIFE', label: '🎶 Klupsko' },
    { value: 'BUSINESS', label: '💼 Poslovno' },
    { value: 'OTHER', label: '➕ Ostalo' },
  ];

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const params: Record<string, string> = {
      page: String(this.page),
      pageSize: String(this.pageSize),
      sortBy: this.sortBy,
      sortDir: this.sortDir,
    };
    if (this.searchQuery) params['search'] = this.searchQuery;
    if (this.activeCategory) params['category'] = this.activeCategory;

    const query = new URLSearchParams(params).toString();
    this.http.get<{ data: Activity[]; total: number; totalPages: number }>(
      `${environment.apiUrl}/activities?${query}`
    ).subscribe({
      next: res => {
        this.activities = res.data;
        this.total = res.total;
        this.totalPages = res.totalPages;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onSearch(q: string): void { this.searchQuery = q; this.page = 1; this.load(); }
  setCategory(c: string): void { this.activeCategory = c; this.page = 1; this.load(); }
  onCityChange(_v: string): void { this.load(); }
  onStatusChange(_v: string): void { this.load(); }
  onSortChange(val: string): void {
    const [sortBy, sortDir] = val.split(':') as [string, 'asc' | 'desc'];
    this.sortBy = sortBy; this.sortDir = sortDir; this.page = 1; this.load();
  }
  onSortCol(col: string): void {
    this.sortDir = this.sortBy === col && this.sortDir === 'asc' ? 'desc' : 'asc';
    this.sortBy = col; this.page = 1; this.load();
  }
  onPage(p: number): void { if (p >= 1 && p <= this.totalPages) { this.page = p; this.load(); } }

  editActivity(a: Activity): void { this.router.navigate(['/admin/aktivnosti', a.activityId, 'edit']); }

  // ── Detail panel ────────────────────────────────────────────────────────
  openDetail(a: Activity): void { this.detailActivity = a; this.detailOpen = true; }
  closeDetail(): void { this.detailOpen = false; this.detailActivity = null; }

  // ── Map panel ───────────────────────────────────────────────────────────
  showOnMap(a: Activity): void { this.mapActivity = a; this.mapOpen = true; }
  closeMap(): void { this.mapOpen = false; this.mapActivity = null; }

  get mapMarkers(): MapMarker[] {
    if (!this.mapActivity || !this.mapActivity.lat || !this.mapActivity.lng) return [];
    return [{
      id: this.mapActivity.activityId,
      lat: this.mapActivity.lat,
      lng: this.mapActivity.lng,
      label: this.mapActivity.name,
      category: this.categoryLabel(this.mapActivity.category),
    }];
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  confirmDelete(a: Activity): void { this.deleteTarget = a; }
  cancelDelete(): void { this.deleteTarget = null; }
  doDelete(): void {
    if (!this.deleteTarget) return;
    this.http.delete(`${environment.apiUrl}/activities/${this.deleteTarget.activityId}`)
      .subscribe(() => { this.deleteTarget = null; this.load(); });
  }

  openNew(): void { this.router.navigate(['/admin/aktivnosti', 'new']); }
  printReport(): void { window.print(); }
  exportCsv(): void { /* TODO */ }

  get pageStart(): number { return (this.page - 1) * this.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.total); }
  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = Math.max(1, this.page - 2); i <= Math.min(this.totalPages, this.page + 2); i++) pages.push(i);
    return pages;
  }

  categoryIcon(cat: string): string {
    const map: Record<string, string> = {
      SPORT: '🎾', ADVENTURE: '⛰️', WELLNESS: '💆',
      SHOPPING: '🛍️', DINING: '🍽️', NIGHTLIFE: '🎶',
      SIGHTSEEING: '📸', BUSINESS: '💼', OTHER: '📌',
    };
    return map[cat] ?? '📌';
  }

  categoryLabel(cat: string): string {
    const found = this.categoryOptions.find(o => o.value === cat);
    return found?.label.replace(/^[^ ]+ /, '') ?? cat;
  }

  typeBadgeClass(cat: string): string {
    const map: Record<string, string> = {
      SPORT: 'type-sport', ADVENTURE: 'type-priroda', WELLNESS: 'type-wellness',
      SHOPPING: 'type-shopping', DINING: 'type-restoran', NIGHTLIFE: 'type-noćni',
    };
    return map[cat] ?? 'type-ostalo';
  }

  locationName(a: Activity): string { return (a as any).locationName ?? 'Srbija'; }
  gpsText(a: Activity): string {
    if (a.lat && a.lng) return `${a.lat.toFixed(4)}°N, ${a.lng.toFixed(4)}°E`;
    return '';
  }
}
