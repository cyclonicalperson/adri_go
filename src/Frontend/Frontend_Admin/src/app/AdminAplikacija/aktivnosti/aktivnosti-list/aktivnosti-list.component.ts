import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '@env/environment';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { MapComponent, MapMarker } from '@shared/components/map/map.component';

// Backend ActivitiesController vraća tagove sa category='aktivnost'
// Polje 'category' u tagu je slobodan string (npr. 'ADVENTURE', 'SPORT', 'aktivnost')
// a 'color' je hex boja za UI

interface BackendActivity {
  id: number;            // tag.id
  activityId?: number;   // alias (mock koristi activityId)
  name: string;
  category: string;      // tag.category — može biti SPORT, ADVENTURE, aktivnost...
  description?: string;
  lat?: number | null;
  lng?: number | null;
  locationName?: string;
  color?: string;        // tag.color
  status?: string;       // iz mock-a
  viewCount?: number;
}

@Component({
  selector: 'app-aktivnosti-list',
  templateUrl: './aktivnosti-list.component.html',
  styleUrl: './aktivnosti-list.component.scss',
  imports: [
    FormsModule, TruncatePipe, ConfirmDialogComponent, MapComponent],
})
export class AktivnostiListComponent implements OnInit {
  activities: BackendActivity[] = [];
  total = 0;
  totalPages = 1;
  page = 1;
  pageSize = 10;
  loading = true;

  searchQuery = '';
  activeCategory = '';   // prazan string = sve kategorije
  activeStatus = '';     // prazan string = svi statusi ('approved' | 'pending' | '')
  sortBy = 'name';
  sortDir: 'asc' | 'desc' = 'asc';

  // Stat counts — izračunati iz svih učitanih aktivnosti
  sportCount = 0;
  natureCount = 0;
  wellnessCount = 0;
  pendingCount = 0;

  // Detail / Map / Delete paneli
  detailActivity: BackendActivity | null = null;
  detailOpen = false;
  mapActivity: BackendActivity | null = null;
  mapOpen = false;
  deleteTarget: BackendActivity | null = null;

  // Kategorije koje komponenta prikazuje u filterima
  // Backend ActivitiesController filtrira po category query param
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

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit(): void { this.initSearch(); this.load(); }

  load(): void {
    this.loading = true;

    let params = new HttpParams()
      .set('page', this.page)
      .set('pageSize', this.pageSize)
      .set('sortBy', this.sortBy)
      .set('sortDir', this.sortDir);

    if (this.searchQuery) params = params.set('search', this.searchQuery);
    // Backend ActivitiesController prihvata category param i filtrira po t.Category
    if (this.activeCategory) params = params.set('category', this.activeCategory);
    if (this.activeStatus) params = params.set('status', this.activeStatus);

    this.http.get<{ data: BackendActivity[]; total: number; totalPages: number }>(
      `${environment.apiUrl}/activities`, { params }
    ).subscribe({
      next: res => {
        this.activities = (res.data ?? []).map(a => ({
          ...a,
          // Normalizujemo id — backend vraća 'id', mock može imati 'activityId'
          id: a.id ?? a.activityId ?? 0,
          activityId: a.id ?? a.activityId ?? 0,
        }));
        this.total = res.total;
        this.totalPages = res.totalPages;

        // Računamo stat counts iz svih učitanih aktivnosti
        // (kada nema filtera — prikazujemo ukupne; kad je filter aktivan — djelimične)
        // Koristimo backend counts koji su uvek tačni (sve stavke, ne samo tekuća stranica)
        this.sportCount = (res as any).sportCount ?? this.activities.filter(a => this.inferCat(a) === 'SPORT').length;
        this.natureCount = (res as any).natureCount ?? this.activities.filter(a => this.inferCat(a) === 'ADVENTURE').length;
        this.wellnessCount = (res as any).wellnessCount ?? this.activities.filter(a => this.inferCat(a) === 'WELLNESS').length;
        this.pendingCount = (res as any).pendingCount ?? this.activities.filter(a => a.status === 'pending').length;

        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  // Normalizujemo category string na uppercase za prikaz
  normCat(cat: string | undefined): string {
    return (cat ?? '').toUpperCase();
  }

  private search$ = new Subject<string>();

  private initSearch(): void {
    this.search$.pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(q => { this.searchQuery = q; this.page = 1; this.load(); });
  }

  onSearch(q: string): void { this.search$.next(q); }
  setCategory(c: string): void { this.activeCategory = c; this.page = 1; this.load(); }
  setStatus(s: string): void { this.activeStatus = s; this.page = 1; this.load(); }
  onStatusChange(val: string): void { this.setStatus(val); }

  get sortValue(): string { return `${this.sortBy}:${this.sortDir}`; }
  set sortValue(val: string) { this.onSortChange(val); }

  onSortChange(val: string): void {
    const [sortBy, sortDir] = val.split(':') as [string, 'asc' | 'desc'];
    this.sortBy = sortBy; this.sortDir = sortDir; this.page = 1; this.load();
  }

  onSortCol(col: string): void {
    this.sortDir = this.sortBy === col && this.sortDir === 'asc' ? 'desc' : 'asc';
    this.sortBy = col; this.page = 1; this.load();
  }

  onPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) { this.page = p; this.load(); }
  }

  editActivity(a: BackendActivity): void {
    this.router.navigate(['/admin/aktivnosti', a.id ?? a.activityId, 'edit']);
  }

  // ── Detail panel ──────────────────────────────────────────────────────
  openDetail(a: BackendActivity): void { this.detailActivity = a; this.detailOpen = true; }
  closeDetail(): void { this.detailOpen = false; this.detailActivity = null; }

  // ── Map panel ─────────────────────────────────────────────────────────
  showOnMap(a: BackendActivity): void { this.mapActivity = a; this.mapOpen = true; }
  closeMap(): void { this.mapOpen = false; this.mapActivity = null; }

  get mapMarkers(): MapMarker[] {
    if (!this.mapActivity?.lat || !this.mapActivity?.lng) return [];
    return [{
      id: this.mapActivity.id,
      lat: this.mapActivity.lat,
      lng: this.mapActivity.lng,
      label: this.mapActivity.name,
      category: this.categoryLabel(this.mapActivity),
    }];
  }

  // ── Delete ────────────────────────────────────────────────────────────
  confirmDelete(a: BackendActivity): void { this.deleteTarget = a; }
  cancelDelete(): void { this.deleteTarget = null; }

  doDelete(): void {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget.id ?? this.deleteTarget.activityId;
    this.http.delete(`${environment.apiUrl}/activities/${id}`).subscribe({
      next: () => {
        this.deleteTarget = null;
        // Ukloni lokalno odmah, pa osvježi stranicu
        this.activities = this.activities.filter(a => (a.id ?? a.activityId) !== id);
        this.total = Math.max(0, this.total - 1);
        this.load();
      },
      error: () => { this.deleteTarget = null; },
    });
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

  // ── Display helpers ───────────────────────────────────────────────────
  // Backend now returns actual subcategory in 'category' field (stored in tag.Color).
  // We still use inferCat as fallback for old tags that have no subcategory stored.
  private inferCat(a: BackendActivity): string {
    // If category is a known subcategory, use it directly
    const known = ['SPORT', 'ADVENTURE', 'WELLNESS', 'SHOPPING', 'DINING', 'NIGHTLIFE', 'SIGHTSEEING', 'CULTURE'];
    if (known.includes((a.category ?? '').toUpperCase())) return a.category!.toUpperCase();
    // Fallback: infer from name
    const n = (a.name ?? '').toLowerCase();
    if (/ski|snowboard|sport|tenis|fudbal|košarka|plivanje|planinar|bicikl|ronjenje|surfing|golf|trčanje/.test(n)) return 'SPORT';
    if (/rafting|treking|planin|penjanje|avantur|zipline|paraglajd|kajak|jezer|priroda/.test(n)) return 'ADVENTURE';
    if (/wellness|spa|masaž|relaks|yoga|meditacija|sauna/.test(n)) return 'WELLNESS';
    if (/shoppin|kupovina|suveniri|tržnica|prodavnica/.test(n)) return 'SHOPPING';
    if (/restoran|kafić|kulinar|hrana|degustaci|vinski|gastro|večera/.test(n)) return 'DINING';
    if (/noćn|klub|muzika|koncert|zabav/.test(n)) return 'NIGHTLIFE';
    if (/razgledanje|tura|vođen|muzej|galerija|fotograf|historij/.test(n)) return 'SIGHTSEEING';
    if (/kultura|pozorište|festival|izložba/.test(n)) return 'CULTURE';
    return 'OTHER';
  }

  categoryIcon(a: BackendActivity): string {
    const map: Record<string, string> = {
      SPORT: '🏊', ADVENTURE: '⛰️', WELLNESS: '💆',
      SHOPPING: '🛍️', DINING: '🍽️', NIGHTLIFE: '🎶',
      SIGHTSEEING: '📸', CULTURE: '🎭', OTHER: '🎯',
    };
    return map[this.inferCat(a)] ?? '🎯';
  }

  categoryLabel(a: BackendActivity): string {
    const map: Record<string, string> = {
      SPORT: 'Sport', ADVENTURE: 'Priroda / Avantura', WELLNESS: 'Wellness',
      SHOPPING: 'Shopping', DINING: 'Ishrana', NIGHTLIFE: 'Noćni život',
      SIGHTSEEING: 'Razgledanje', CULTURE: 'Kultura', OTHER: 'Aktivnost',
    };
    return map[this.inferCat(a)] ?? 'Aktivnost';
  }

  typeBadgeClass(a: BackendActivity): string {
    const map: Record<string, string> = {
      SPORT: 'type-sport', ADVENTURE: 'type-priroda', WELLNESS: 'type-wellness',
      SHOPPING: 'type-shopping', DINING: 'type-restoran', NIGHTLIFE: 'type-noćni',
      SIGHTSEEING: 'type-kultura', CULTURE: 'type-kultura', OTHER: 'type-ostalo',
    };
    return map[this.inferCat(a)] ?? 'type-ostalo';
  }

  gpsText(a: BackendActivity): string {
    if (a.lat && a.lng) return `${Number(a.lat).toFixed(4)}°N, ${Number(a.lng).toFixed(4)}°E`;
    return '';
  }

  locationName(a: BackendActivity): string {
    return a.locationName ?? '—';
  }
}
