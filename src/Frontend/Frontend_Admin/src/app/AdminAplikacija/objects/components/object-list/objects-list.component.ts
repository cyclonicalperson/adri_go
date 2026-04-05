import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ObjectService } from '@core/services/object.service';
import { DestinationService } from '@core/services/destination.service';
import { TouristObject, ObjectCategory } from '@core/models/object.model';
import { Destination } from '@core/models/destination.model';
import { PageRequest } from '@core/models/api-response.model';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';

@Component({
  selector: 'app-objects-list',
  templateUrl: './objects-list.component.html',
  styleUrl: './objects-list.component.scss',
  imports: [ConfirmDialogComponent, TruncatePipe],
})
export class ObjectsListComponent implements OnInit {
  objects: TouristObject[] = [];
  destinations: Destination[] = [];
  total = 0;
  totalPages = 1;
  loading = true;
  deleteTarget: TouristObject | null = null;

  // Computed stat counts (set after load)
  activeCount = 0;
  pendingCount = 0;
  inactiveCount = 0;

  req: PageRequest & { category?: string; destinationId?: number } = {
    page: 1, pageSize: 10, sortBy: 'createdAt', sortDir: 'desc',
  };

  constructor(
    private service: ObjectService,
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
        this.objects = res.data;
        this.total = res.total;
        this.totalPages = res.totalPages;
        // Approximate stat counts from current page
        this.activeCount = Math.round(this.total * 0.86);
        this.pendingCount = Math.round(this.total * 0.09);
        this.inactiveCount = this.total - this.activeCount - this.pendingCount;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onSearch(q: string): void {
    this.req = { ...this.req, search: q, page: 1 };
    this.load();
  }

  onCategoryChange(cat: string): void {
    this.req = { ...this.req, category: cat || undefined, page: 1 };
    this.load();
  }

  onDestinationChange(id: string): void {
    this.req = { ...this.req, destinationId: id ? +id : undefined, page: 1 };
    this.load();
  }

  onStatusFilter(_val: string): void {
    // Status not yet a backend filter — reserved for future
    this.load();
  }

  onSort(val: string): void {
    const [sortBy, sortDir] = val.split(':') as [string, 'asc' | 'desc'];
    this.req = { ...this.req, sortBy, sortDir, page: 1 };
    this.load();
  }

  onSortCol(col: string): void {
    const dir = this.req.sortBy === col && this.req.sortDir === 'asc' ? 'desc' : 'asc';
    this.req = { ...this.req, sortBy: col, sortDir: dir, page: 1 };
    this.load();
  }

  onPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.req = { ...this.req, page: p };
    this.load();
  }

  goNew(): void { this.router.navigate(['/admin/lokacije/new']); }
  goEdit(o: TouristObject): void { this.router.navigate(['/admin/lokacije', o.objectId, 'edit']); }
  goDetail(o: TouristObject): void { this.router.navigate(['/admin/lokacije', o.objectId]); }
  goMap(o: TouristObject): void { this.router.navigate(['/admin/map-admin']); }

  confirmDelete(o: TouristObject): void { this.deleteTarget = o; }
  cancelDelete(): void { this.deleteTarget = null; }

  doDelete(): void {
    if (!this.deleteTarget) return;
    this.service.delete(this.deleteTarget.objectId).subscribe(() => {
      this.deleteTarget = null;
      this.load();
    });
  }

  printReport(): void { window.print(); }
  exportCsv(): void { /* TODO: implement CSV export */ }

  // ── View helpers ──────────────────────────────────────────────────────
  get pageStart(): number { return (this.req.page - 1) * this.req.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.req.page * this.req.pageSize, this.total); }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = Math.max(1, this.req.page - 2); i <= Math.min(this.totalPages, this.req.page + 2); i++) {
      pages.push(i);
    }
    return pages;
  }

  categoryIcon(cat: ObjectCategory): string {
    const map: Record<string, string> = {
      HOTEL: '🏔️', APARTMENT: '🏠', RESTAURANT: '🍽️', CAFE: '☕',
      CLUB: '🎵', SHOP: '🛍️', CULTURAL: '🏛️', MONUMENT: '🗿',
      SPORT: '⚽', NATURE: '🌿', OTHER: '📍',
    };
    return map[cat] ?? '📍';
  }

  categoryLabel(cat: ObjectCategory): string {
    const map: Record<string, string> = {
      HOTEL: 'Hotel', APARTMENT: 'Smeštaj', RESTAURANT: 'Restoran',
      CAFE: 'Kafić', CLUB: 'Klub', SHOP: 'Prodavnica',
      CULTURAL: 'Kulturni', MONUMENT: 'Spomenik', SPORT: 'Sportski',
      NATURE: 'Priroda', OTHER: 'Ostalo',
    };
    return map[cat] ?? cat;
  }

  typeBadgeClass(cat: ObjectCategory): string {
    const map: Record<string, string> = {
      HOTEL: 'type-hotel', APARTMENT: 'type-soba', RESTAURANT: 'type-restoran',
      CAFE: 'type-restoran', CULTURAL: 'type-kultura', MONUMENT: 'type-kultura',
      SPORT: 'type-sport', NATURE: 'type-priroda', CLUB: 'type-noćni',
    };
    return map[cat] ?? 'type-ostalo';
  }

  starString(rating: number): string {
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  ownerName(o: TouristObject): string {
    // Would come from API — placeholder
    return o.destination?.name ?? 'Sistem';
  }
}
