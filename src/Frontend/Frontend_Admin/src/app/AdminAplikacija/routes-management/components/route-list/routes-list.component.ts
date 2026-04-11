import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouteService } from '@core/services/route.service';
import { RegionService } from '@core/services/region.service';
import { TouristRoute, RouteType, RouteDifficulty } from '@core/models/route.model';
import { Region } from '@core/models/region.model';
import { PageRequest } from '@core/models/api-response.model';
import { SearchBarComponent } from '@shared/components/search-bar/search-bar.component';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { BadgeComponent, BadgeVariant } from '@shared/components/badge/badge.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-routes-list',
  standalone: true,
  imports: [
    SearchBarComponent,
    PaginationComponent,
    BadgeComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './routes-list.component.html',
  styleUrl: './routes-list.component.scss',
})

export class RoutesListComponent implements OnInit {
  routes: TouristRoute[] = [];
  destinations: Region[] = [];
  total = 0;
  totalPages = 1;

  req: PageRequest & {
    regionId?: number;
    difficulty?: string;
    routeType?: string;
  } = { page: 1, pageSize: 12, sortBy: 'name', sortDir: 'asc' };

  deleteTarget: TouristRoute | null = null;
  loading = true;

  readonly difficultyOptions = [
    { value: '', label: 'Sve težine' },
    { value: 'easy', label: 'Lako' },
    { value: 'moderate', label: 'Srednje' },
    { value: 'hard', label: 'Teško' },
    { value: 'expert', label: 'Ekspertsko' },
  ];

  readonly typeOptions = [
    { value: '', label: 'Svi tipovi' },
    { value: 'HIKING', label: 'Pešačenje' },
    { value: 'CYCLING', label: 'Biciklizam' },
    { value: 'WALKING', label: 'Šetnja' },
    { value: 'DRIVING', label: 'Automobilom' },
    { value: 'OTHER', label: 'Ostalo' },
  ];

  constructor(
    private service: RouteService,
    private destService: RegionService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.destService.getAll({ page: 1, pageSize: 100 }).subscribe((res: { data: Region[]; }) => {
      this.destinations = res.data;
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getAll(this.req).subscribe({
      next: (res: { data: TouristRoute[]; total: number; totalPages: number; }) => {
        this.routes = res.data;
        this.total = res.total;
        this.totalPages = res.totalPages;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onSearch(q: string): void {
    this.req = { ...this.req, search: q, page: 1 };
    this.load();
  }

  onDifficultyChange(val: string): void {
    this.req = { ...this.req, difficulty: val || undefined, page: 1 };
    this.load();
  }

  onTypeChange(val: string): void {
    this.req = { ...this.req, routeType: val || undefined, page: 1 };
    this.load();
  }

  onDestinationChange(id: string): void {
    this.req = { ...this.req, regionId: id ? +id : undefined, page: 1 };
    this.load();
  }

  onSort(col: string): void {
    const dir = this.req.sortBy === col && this.req.sortDir === 'asc' ? 'desc' : 'asc';
    this.req = { ...this.req, sortBy: col, sortDir: dir, page: 1 };
    this.load();
  }

  onPage(p: number): void {
    this.req = { ...this.req, page: p };
    this.load();
  }

  goNew(): void { this.router.navigate(['/admin/routes-mgmt/new']); }
  goEdit(r: TouristRoute): void { this.router.navigate(['/admin/routes-mgmt', r.routeId, 'edit']); }
  confirmDelete(r: TouristRoute): void { this.deleteTarget = r; }
  cancelDelete(): void { this.deleteTarget = null; }

  doDelete(): void {
    if (!this.deleteTarget) return;
    this.service.delete(this.deleteTarget.routeId).subscribe(() => {
      this.deleteTarget = null;
      this.load();
    });
  }

  difficultyBadge(d: RouteDifficulty): BadgeVariant {
    const map: Record<string, BadgeVariant> = {
      easy: 'success', moderate: 'info', hard: 'warning', expert: 'danger',
    };
    return map[d] ?? 'default';
  }

  difficultyLabel(d: RouteDifficulty): string {
    const found = this.difficultyOptions.find(o => o.value === d);
    return found?.label ?? d;
  }

  typeLabel(t: RouteType): string {
    const found = this.typeOptions.find(o => o.value === t);
    return found?.label ?? t;
  }

  sortIcon(col: string): string {
    if (this.req.sortBy !== col) return '↕';
    return this.req.sortDir === 'asc' ? '↑' : '↓';
  }

  formatDuration(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
}
