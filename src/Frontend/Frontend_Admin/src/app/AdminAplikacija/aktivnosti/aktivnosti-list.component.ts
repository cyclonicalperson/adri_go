import { Component, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Activity, ActivityCategory } from '@core/models/activity.model';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';

@Component({
  selector: 'app-aktivnosti-list',
  templateUrl: './aktivnosti-list.component.html',
  styleUrl: './aktivnosti-list.component.scss',
  imports: [TruncatePipe, DecimalPipe],
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

  readonly categoryOptions = [
    { value: '', label: 'Sve' },
    { value: 'SPORT', label: '🏊 Sport' },
    { value: 'ADVENTURE', label: '🌿 Priroda' },
    { value: 'WELLNESS', label: '💆 Wellness' },
    { value: 'SHOPPING', label: '🛍️ Shopping' },
    { value: 'DINING', label: '🍴 Ishrana' },
    { value: 'NIGHTLIFE', label: '🎶 Klupsko' },
    { value: 'BUSINESS', label: '💼 Poslovno' },
    { value: 'OTHER', label: '➕ Ostalo' },
  ];

  constructor(private http: HttpClient) { }

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

  editActivity(a: Activity): void { /* TODO: navigate to edit form */ }
  deleteActivity(a: Activity): void { /* TODO: confirm + delete */ }
  openNew(): void { /* TODO: navigate to new activity form */ }
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
      BUSINESS: '💼', OTHER: '📌',
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

  locationName(_a: Activity): string { return 'Srbija'; }
  gpsText(_a: Activity): string { return ''; }
}
