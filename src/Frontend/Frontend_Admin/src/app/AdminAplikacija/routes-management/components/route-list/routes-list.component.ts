import { SlicePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { PageRequest } from '@core/models/api-response.model';
import { Region } from '@core/models/region.model';
import { RouteDifficulty, RouteStatus, TouristRoute } from '@core/models/route.model';
import { AdminListStateService } from '@core/services/admin-list-state.service';
import { RegionService } from '@core/services/region.service';
import { RouteService } from '@core/services/route.service';
import { BadgeComponent, BadgeVariant } from '@shared/components/badge/badge.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';

type StatusFilter = '' | RouteStatus;

interface RoutesListState {
  req?: Partial<PageRequest & { regionId?: number; difficulty?: string; status?: StatusFilter }>;
}

@Component({
  selector: 'app-routes-list',
  standalone: true,
  imports: [
    SlicePipe,
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
    status?: StatusFilter;
  } = { page: 1, pageSize: 12, sortBy: 'name', sortDir: 'asc' };
  private readonly stateKey = 'routes-management';

  summary = {
    total: 0,
    published: 0,
    pending: 0,
    archived: 0,
  };

  approveTarget: TouristRoute | null = null;
  rejectTarget: TouristRoute | null = null;
  deleteTarget: TouristRoute | null = null;
  loading = true;

  readonly difficultyOptions = [
    { value: '', label: 'Sve tezine' },
    { value: 'easy', label: 'Lako' },
    { value: 'moderate', label: 'Srednje' },
    { value: 'hard', label: 'Tesko' },
    { value: 'expert', label: 'Ekspertsko' },
  ];

  readonly sortOptions = [
    { value: 'name:asc', label: 'Naziv A-Z' },
    { value: 'name:desc', label: 'Naziv Z-A' },
    { value: 'distanceKm:desc', label: 'Distanca opadajuce' },
    { value: 'distanceKm:asc', label: 'Distanca rastuce' },
    { value: 'durationMin:desc', label: 'Trajanje opadajuce' },
    { value: 'durationMin:asc', label: 'Trajanje rastuce' },
    { value: 'createdAt:desc', label: 'Najnovije prvo' },
  ];

  constructor(
    private service: RouteService,
    private destService: RegionService,
    private router: Router,
    private auth: AuthService,
    private listState: AdminListStateService,
  ) {}

  ngOnInit(): void {
    this.restoreListState();
    this.destService.getAll({ page: 1, pageSize: 100 }).subscribe((res: { data: Region[] }) => {
      this.destinations = res.data;
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.persistListState();

    const baseSummaryRequest = this.buildBaseRequest();

    forkJoin({
      list: this.service.getAll({ ...this.req }),
      totalSummary: this.service.getAll(baseSummaryRequest),
      publishedSummary: this.service.getAll({ ...baseSummaryRequest, status: 'published' }),
      pendingSummary: this.service.getAll({ ...baseSummaryRequest, status: 'draft' }),
      archivedSummary: this.service.getAll({ ...baseSummaryRequest, status: 'archived' }),
    }).subscribe({
      next: ({ list, totalSummary, publishedSummary, pendingSummary, archivedSummary }) => {
        this.routes = list.data;
        this.total = list.total;
        this.totalPages = list.totalPages;
        this.summary = {
          total: totalSummary.total,
          published: publishedSummary.total,
          pending: pendingSummary.total,
          archived: archivedSummary.total,
        };
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onSearch(value: string): void {
    this.req = { ...this.req, search: value, page: 1 };
    this.load();
  }

  onDifficultyChange(value: string): void {
    this.req = { ...this.req, difficulty: value || undefined, page: 1 };
    this.load();
  }

  onDestinationChange(value: string): void {
    this.req = { ...this.req, regionId: value ? Number(value) : undefined, page: 1 };
    this.load();
  }

  onStatusChange(status: StatusFilter): void {
    this.req = { ...this.req, status: status || undefined, page: 1 };
    this.load();
  }

  onSortChange(value: string): void {
    const [sortBy, sortDir] = value.split(':');
    this.req = { ...this.req, sortBy, sortDir: sortDir as 'asc' | 'desc', page: 1 };
    this.load();
  }

  onPage(page: number): void {
    this.req = { ...this.req, page };
    this.load();
  }

  get canCreateRoutes(): boolean {
    return this.auth.hasPermission('manage_own_posts') &&
      this.auth.hasPermission('create_route');
  }

  get canModerateRoutes(): boolean {
    return this.auth.currentUser?.role === 'superadmin' || this.auth.hasPermission('manage_own_posts');
  }

  canManageRoute(route: TouristRoute): boolean {
    return this.auth.isSuperAdmin ||
      (
        this.auth.hasPermission('manage_own_posts', this.routeScopeRegionId(route)) &&
        route.createdBy === this.auth.currentUser?.userId
      );
  }

  get activeSortValue(): string {
    return `${this.req.sortBy ?? 'name'}:${this.req.sortDir ?? 'asc'}`;
  }

  goNew(): void {
    if (!this.canCreateRoutes) return;
    void this.router.navigate(['/admin/routes-management/new']);
  }

  goDetails(route: TouristRoute): void {
    void this.router.navigate(['/admin/routes-management', route.routeId]);
  }

  goEdit(route: TouristRoute): void {
    if (!this.canManageRoute(route)) return;
    void this.router.navigate(['/admin/routes-management', route.routeId, 'edit']);
  }

  confirmApprove(route: TouristRoute): void {
    if (route.status === 'draft' && this.canManageRoute(route)) {
      this.approveTarget = route;
    }
  }

  cancelApprove(): void {
    this.approveTarget = null;
  }

  doApprove(): void {
    if (!this.approveTarget || !this.canManageRoute(this.approveTarget)) return;

    const route = this.approveTarget;
    this.approveTarget = null;

    this.service.update(route.routeId, { status: 'published' }).subscribe(() => {
      this.load();
    });
  }

  confirmReject(route: TouristRoute): void {
    if (route.status === 'draft' && this.canManageRoute(route)) {
      this.rejectTarget = route;
    }
  }

  cancelReject(): void {
    this.rejectTarget = null;
  }

  doReject(): void {
    if (!this.rejectTarget || !this.canManageRoute(this.rejectTarget)) return;

    const route = this.rejectTarget;
    this.rejectTarget = null;

    this.service.update(route.routeId, { status: 'archived' }).subscribe(() => {
      this.load();
    });
  }

  confirmDelete(route: TouristRoute): void {
    if (!this.canManageRoute(route)) return;
    this.deleteTarget = route;
  }

  cancelDelete(): void {
    this.deleteTarget = null;
  }

  doDelete(): void {
    if (!this.deleteTarget || !this.canManageRoute(this.deleteTarget)) return;

    const route = this.deleteTarget;
    this.deleteTarget = null;

    this.service.delete(route.routeId).subscribe(() => {
      this.load();
    });
  }

  difficultyBadge(difficulty: RouteDifficulty): BadgeVariant {
    const map: Record<string, BadgeVariant> = {
      easy: 'success',
      moderate: 'info',
      hard: 'warning',
      expert: 'danger',
    };

    return map[difficulty.toLowerCase()] ?? 'default';
  }

  difficultyLabel(difficulty: RouteDifficulty): string {
    const map: Record<string, string> = {
      easy: 'Lako',
      moderate: 'Srednje',
      hard: 'Tesko',
      expert: 'Ekspertsko',
    };

    return map[difficulty.toLowerCase()] ?? difficulty;
  }

  statusLabel(status?: RouteStatus): string {
    const map: Record<RouteStatus, string> = {
      published: 'Objavljena',
      draft: 'Na cekanju',
      archived: 'Arhivirana',
    };

    return status ? map[status] : 'Na cekanju';
  }

  statusBadgeClass(status?: RouteStatus): string {
    switch (status) {
      case 'published':
        return 'badge-green';
      case 'draft':
        return 'badge-amber';
      case 'archived':
        return 'badge-gray';
      default:
        return 'badge-gray';
    }
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`;
  }

  routeExcerpt(route: TouristRoute): string {
    return route.description?.trim() || 'Ruta nema dodatni opis.';
  }

  routeStats(route: TouristRoute): string {
    return `${route.viewCount ?? 0} pregleda | ${route.saveCount ?? 0} cuvanja`;
  }

  waypointCount(route: TouristRoute): number {
    return route.waypoints?.length ?? 0;
  }

  get pageStart(): number {
    return this.total === 0 ? 0 : (this.req.page - 1) * this.req.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.req.page * this.req.pageSize, this.total);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];

    for (let index = Math.max(1, this.req.page - 2); index <= Math.min(this.totalPages, this.req.page + 2); index += 1) {
      pages.push(index);
    }

    return pages;
  }

  private buildBaseRequest() {
    return {
      page: 1,
      pageSize: 1,
      search: this.req.search,
      regionId: this.req.regionId,
      difficulty: this.req.difficulty,
      sortBy: 'name',
      sortDir: 'asc' as const,
    };
  }

  private restoreListState(): void {
    const state = this.listState.read<RoutesListState>(this.stateKey);
    if (!state.req) return;

    this.req = {
      ...this.req,
      ...state.req,
      page: Number(state.req.page ?? this.req.page) || 1,
      pageSize: Number(state.req.pageSize ?? this.req.pageSize) || 12,
      status: (state.req.status ?? this.req.status) as StatusFilter,
    };
  }

  private persistListState(): void {
    this.listState.save<RoutesListState>(this.stateKey, { req: this.req });
  }

  private routeScopeRegionId(route: TouristRoute): number | undefined {
    if (route.proposedRegionName) {
      return undefined;
    }

    const regionId = route.regionId ?? route.destinationId;
    return typeof regionId === 'number' && regionId > 0 ? regionId : undefined;
  }
}
