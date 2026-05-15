import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { AdminListStateService } from '@core/services/admin-list-state.service';
import { CsvExportService } from '@core/services/csv-export.service';
import { ObjectService } from '@core/services/object.service';
import { RegionService } from '@core/services/region.service';
import { TouristObject, ObjectCategory } from '@core/models/object.model';
import { Region } from '@core/models/region.model';
import { PageRequest } from '@core/models/api-response.model';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';

interface ObjectsListState {
  req?: Partial<PageRequest & { category?: string; regionId?: number; status?: string }>;
  activeStatusFilter?: string;
}

@Component({
  selector: 'app-objects-list',
  templateUrl: './objects-list.component.html',
  styleUrl: './objects-list.component.scss',
  imports: [ConfirmDialogComponent, TruncatePipe],
})
export class ObjectsListComponent implements OnInit {
  objects: TouristObject[] = [];
  regions: Region[] = [];
  total = 0;
  totalPages = 1;
  loading = true;
  deleteTarget: TouristObject | null = null;
  activeStatusFilter = '';

  activeCount = 0;
  pendingCount = 0;
  inactiveCount = 0;
  globalTotal = 0;

  req: PageRequest & { category?: string; regionId?: number; status?: string } = {
    page: 1,
    pageSize: 10,
    sortBy: 'createdAt',
    sortDir: 'desc',
  };
  private readonly stateKey = 'objects';

  constructor(
    private service: ObjectService,
    private regionService: RegionService,
    private router: Router,
    private auth: AuthService,
    private csv: CsvExportService,
    private listState: AdminListStateService,
  ) {}

  ngOnInit(): void {
    this.restoreListState();
    this.regionService.getAll({ page: 1, pageSize: 100 }).subscribe(res => {
      this.regions = res.data;
    });
    this.load();
    this.loadGlobalCounts();
  }

  get canManageObjects(): boolean {
    return this.auth.hasPermission('manage_own_posts');
  }

  private recomputeGlobalTotal(): void {
    this.globalTotal = this.activeCount + this.pendingCount + this.inactiveCount;
  }

  load(): void {
    this.loading = true;
    this.persistListState();
    this.service.getAll(this.req).subscribe({
      next: res => {
        this.objects = res.data;
        this.total = res.total;
        this.totalPages = res.totalPages;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private loadGlobalCounts(): void {
    this.service.getAll({ page: 1, pageSize: 1, status: 'published' }).subscribe(res => {
      this.activeCount = res.total;
      this.recomputeGlobalTotal();
    });
    this.service.getAll({ page: 1, pageSize: 1, status: 'draft' }).subscribe(res => {
      this.pendingCount = res.total;
      this.recomputeGlobalTotal();
    });
    this.service.getAll({ page: 1, pageSize: 1, status: 'archived' }).subscribe(res => {
      this.inactiveCount = res.total;
      this.recomputeGlobalTotal();
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
    this.req = { ...this.req, regionId: id ? +id : undefined, page: 1 };
    this.load();
  }

  onStatusFilter(val: string): void {
    this.activeStatusFilter = val;
    const statusMap: Record<string, string> = {
      active: 'published',
      pending: 'draft',
      inactive: 'archived',
    };
    const mapped = statusMap[val];
    const { status: _removed, ...rest } = this.req as any;
    this.req = mapped ? { ...rest, status: mapped, page: 1 } : { ...rest, page: 1 };
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

  goNew(): void {
    this.router.navigate(['/admin/lokacije/new']);
  }

  goEdit(objectItem: TouristObject): void {
    this.router.navigate(['/admin/lokacije', objectItem.objectId, 'edit']);
  }

  goDetail(objectItem: TouristObject): void {
    this.router.navigate(['/admin/lokacije', objectItem.objectId]);
  }

  goMap(objectItem: TouristObject): void {
    this.router.navigate(['/admin/map-admin'], {
      queryParams: { focusPostId: objectItem.objectId },
    });
  }

  get activeSortValue(): string {
    return `${this.req.sortBy ?? 'createdAt'}:${this.req.sortDir ?? 'desc'}`;
  }

  confirmDelete(objectItem: TouristObject): void {
    this.deleteTarget = objectItem;
  }

  cancelDelete(): void {
    this.deleteTarget = null;
  }

  doDelete(): void {
    if (!this.deleteTarget) return;
    this.service.delete(this.deleteTarget.objectId).subscribe(() => {
      this.deleteTarget = null;
      this.load();
      this.loadGlobalCounts();
    });
  }

  approveTarget: TouristObject | null = null;
  rejectTarget: TouristObject | null = null;

  confirmApprove(objectItem: TouristObject): void {
    if (this.objectStatus(objectItem) === 'draft') {
      this.approveTarget = objectItem;
    }
  }

  cancelApprove(): void {
    this.approveTarget = null;
  }

  doApprove(): void {
    if (!this.approveTarget) return;
    const objectItem = this.approveTarget;
    this.approveTarget = null;
    this.service.update(objectItem.objectId, { status: 'published' }).subscribe({
      next: () => {
        (objectItem as any).status = 'published';
        this.load();
        this.loadGlobalCounts();
      },
    });
  }

  confirmReject(objectItem: TouristObject): void {
    if (this.objectStatus(objectItem) === 'draft') {
      this.rejectTarget = objectItem;
    }
  }

  cancelReject(): void {
    this.rejectTarget = null;
  }

  doReject(): void {
    if (!this.rejectTarget) return;
    const objectItem = this.rejectTarget;
    this.rejectTarget = null;
    this.service.update(objectItem.objectId, { status: 'archived' }).subscribe({
      next: () => {
        (objectItem as any).status = 'archived';
        this.load();
        this.loadGlobalCounts();
      },
    });
  }

  approve(objectItem: TouristObject): void {
    this.confirmApprove(objectItem);
  }

  reject(objectItem: TouristObject): void {
    this.confirmReject(objectItem);
  }

  printReport(): void {
    window.print();
  }

  exportCsv(): void {
    const today = new Date().toISOString().split('T')[0];
    this.csv.download(
      `lokacije_${today}.csv`,
      ['ID', 'Naziv', 'Kategorija', 'Adresa', 'Region', 'GPS Lat', 'GPS Lng', 'Ocena', 'Recenzije'],
      this.objects.map(o => [
        o.objectId,
        o.name,
        o.category,
        o.address || '—',
        o.region?.name ?? o.destination?.name ?? '—',
        o.latitude || '',
        o.longitude || '',
        o.averageRating != null ? o.averageRating.toFixed(1) : '—',
        o.reviewCount ?? 0,
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

  categoryIcon(cat: ObjectCategory): string {
    const map: Record<string, string> = {
      HOTEL: '🏨',       // accommodation
      APARTMENT: '🏠',   // accommodation (legacy)
      RESTAURANT: '🍽️',
      CAFE: '☕',
      CLUB: '🎵',
      SHOP: '🛍️',
      CULTURAL: '🏛️',   // cultural_site
      MONUMENT: '🗿',
      SPORT: '⚽',        // sports_facility
      NATURE: '🌿',       // attraction
      OTHER: '📍',
    };
    return map[cat] ?? '📍';
  }

  categoryLabel(cat: ObjectCategory): string {
    const map: Record<string, string> = {
      HOTEL: 'Smeštaj',
      APARTMENT: 'Smeštaj',
      RESTAURANT: 'Restoran',
      CAFE: 'Kafić',
      CLUB: 'Klub',
      SHOP: 'Prodavnica',
      CULTURAL: 'Kulturni',
      MONUMENT: 'Spomenik',
      SPORT: 'Sportski',
      NATURE: 'Atrakcija',
      OTHER: 'Ostalo',
    };
    return map[cat] ?? cat;
  }

  typeBadgeClass(cat: ObjectCategory): string {
    const map: Record<string, string> = {
      HOTEL: 'type-hotel',
      APARTMENT: 'type-hotel',
      RESTAURANT: 'type-restoran',
      CAFE: 'type-restoran',
      CULTURAL: 'type-kultura',
      MONUMENT: 'type-kultura',
      SPORT: 'type-sport',
      NATURE: 'type-priroda',
      CLUB: 'type-nocni',
      SHOP: 'type-shop',
    };
    return map[cat] ?? 'type-ostalo';
  }

  starString(rating: number): string {
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  ownerName(objectItem: TouristObject): string {
    return objectItem.destination?.name ?? objectItem.region?.name ?? 'Sistem';
  }

  objectStatus(objectItem: TouristObject): string {
    return (objectItem as any).status ?? 'published';
  }

  private restoreListState(): void {
    const state = this.listState.read<ObjectsListState>(this.stateKey);
    if (state.req) {
      this.req = {
        ...this.req,
        ...state.req,
        page: Number(state.req.page ?? this.req.page) || 1,
        pageSize: Number(state.req.pageSize ?? this.req.pageSize) || 10,
      };
    }

    this.activeStatusFilter = state.activeStatusFilter ?? this.statusFilterFromApiStatus(this.req.status);
  }

  private persistListState(): void {
    this.listState.save<ObjectsListState>(this.stateKey, {
      req: this.req,
      activeStatusFilter: this.activeStatusFilter,
    });
  }

  private statusFilterFromApiStatus(status?: string): string {
    const map: Record<string, string> = {
      published: 'active',
      draft: 'pending',
      archived: 'inactive',
    };
    return status ? (map[status] ?? '') : '';
  }
}
